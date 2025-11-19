#!/usr/bin/env python3
"""
CFB Enhanced Model V3 - PROPER CALIBRATION
Focus: Smooth, well-distributed conviction scores (not just 0, 0.5, 1.0)
"""

import sqlite3
import pandas as pd
import numpy as np
import lightgbm as lgb
from pathlib import Path
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold
import warnings
import time
from datetime import datetime
warnings.filterwarnings('ignore')

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# ============================================================================
# CONFIG
# ============================================================================
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")

YEAR = 2025
TRAIN_WEEKS = range(1, 11)
TEST_WEEKS = [11, 12]

HOME_ADV = 2.5
ELO_K = 32

print("="*80)
print("CFB ENHANCED MODEL V3 - SMOOTH CONVICTION SCORES")
print("="*80)
print("GOAL: Conviction scores evenly distributed, not clustered at 0/0.5/1.0")
print("="*80)

conn = sqlite3.connect(DB_FILE)

def log_progress(message):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")

def load_year_data(year):
    log_progress("Loading data...")
    stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(year,))
    games = pd.read_sql_query("""
        SELECT id, homeId, awayId, homePoints, awayPoints, week, completed,
               draftKingsSpread, draftKingsHomeMoneyline, draftKingsAwayMoneyline
        FROM Teams_Games WHERE season = ?
    """, conn, params=(year,))
    
    fbs = pd.read_sql_query(
        "SELECT DISTINCT teamId FROM Teams_Rankings WHERE year = ? AND FPI_Ranking IS NOT NULL", 
        conn, params=(year,)
    )
    fbs_ids = set(fbs["teamId"].astype(int))
    
    games["homeId"] = pd.to_numeric(games["homeId"], errors="coerce")
    games["awayId"] = pd.to_numeric(games["awayId"], errors="coerce")
    games = games.dropna(subset=["homeId", "awayId"]).astype({"homeId": int, "awayId": int})
    games = games[games["homeId"].isin(fbs_ids) & games["awayId"].isin(fbs_ids)].copy()
    
    games["spread"] = pd.to_numeric(
        games["draftKingsSpread"].astype(str).str.replace("+", "", regex=False), 
        errors="coerce"
    )
    games["homeML"] = pd.to_numeric(games["draftKingsHomeMoneyline"], errors="coerce")
    games["awayML"] = pd.to_numeric(games["draftKingsAwayMoneyline"], errors="coerce")
    
    games = games.drop_duplicates(subset=['id', 'week'])
    
    return stats, games, fbs_ids

def build_team_mapping(stats, games):
    team_id_map = {}
    lookup = games.set_index("id")[["homeId", "awayId"]].copy()
    lookup = lookup[~lookup.index.duplicated(keep='first')]
    
    for _, row in stats.iterrows():
        gid = int(row["game_id"])
        if gid not in lookup.index: continue
        h_ext = int(lookup.loc[gid, "homeId"])
        a_ext = int(lookup.loc[gid, "awayId"])
        tid = int(row["team_id"])
        
        if row["homeAway"] == "home":
            team_id_map[h_ext] = tid
        else:
            team_id_map[a_ext] = tid
    
    return team_id_map

def compute_elo(games, team_id_map):
    elo = {tid: 1500 for tid in team_id_map.values()}
    elo_by_week = {0: elo.copy()}
    
    for week in sorted(games["week"].unique()):
        elo_by_week[week] = elo.copy()
        
        for _, g in games[games["week"] == week].iterrows():
            if pd.isna(g.homePoints): continue
            
            h = team_id_map.get(g.homeId)
            a = team_id_map.get(g.awayId)
            if not h or not a: continue
            
            h_elo = elo[h]
            a_elo = elo[a]
            exp_h = 1 / (1 + 10**((a_elo - h_elo - HOME_ADV) / 400))
            
            margin = g.homePoints - g.awayPoints
            res_h = 1 if margin > 0 else 0 if margin < 0 else 0.5
            mov_mult = min(np.log(abs(margin) + 1) / 3.0, 2.0)
            
            elo_change = ELO_K * mov_mult * (res_h - exp_h)
            elo[h] += elo_change
            elo[a] -= elo_change
    
    return elo_by_week

def get_baseline_features():
    return [
        "ppa_overall_total", "ppa_passing_total", "ppa_rushing_total",
        "offense_ppa", "offense_success_rate", "offense_explosiveness",
        "defense_ppa", "defense_success_rate", "defense_explosiveness",
        "success_rate_overall_total", "explosiveness_overall_total",
        "points", "totalYards", "turnovers", "havoc_total",
        "yardsPerPass", "yardsPerRushAttempt",
        "netPassingYards", "rushingYards"
    ]

def compute_exponential_rolling_stats(stats, features, alpha=0.3):
    rolling_stats = {}
    
    for col in features:
        if col in stats.columns:
            stats[col] = pd.to_numeric(stats[col], errors='coerce').fillna(0)
    
    for tid in stats["team_id"].unique():
        team_df = stats[stats["team_id"] == tid].copy()
        team_df = team_df.sort_values("week").set_index("week")
        available_features = [f for f in features if f in team_df.columns]
        rolling_stats[tid] = team_df[available_features].ewm(alpha=alpha, min_periods=1).mean()
    
    return rolling_stats

def get_latest_stat(tid, week, feature, rolling_stats, stats):
    val = 0.0
    
    if tid in rolling_stats and feature in rolling_stats[tid].columns:
        past_weeks = rolling_stats[tid].index < week
        if past_weeks.any():
            try:
                latest_week = rolling_stats[tid].index[past_weeks][-1]
                val = rolling_stats[tid].loc[latest_week, feature]
            except:
                pass
    
    if isinstance(val, (pd.Series, np.ndarray)):
        val = float(val.iloc[0] if isinstance(val, pd.Series) else val[0]) if len(val) > 0 else 0.0
    
    if pd.isna(val) or val == 0.0:
        team_games = stats[(stats["team_id"] == tid) & (stats["week"] < week)]
        if len(team_games) > 0 and feature in team_games.columns:
            val = pd.to_numeric(team_games[feature], errors='coerce').mean()
    
    return float(val) if not pd.isna(val) else 0.0

def moneyline_to_prob(moneyline):
    if pd.isna(moneyline):
        return None
    if moneyline > 0:
        return 100 / (moneyline + 100)
    else:
        return abs(moneyline) / (abs(moneyline) + 100)

pff_cache = {}

def get_team_pff_grades_simple(team_id, week, year):
    cache_key = (team_id, week, year)
    if cache_key in pff_cache:
        return pff_cache[cache_key]
    
    grades = {}
    try:
        qb = pd.read_sql_query("""
            SELECT AVG(grades_pass) as qb_grade
            FROM Players_PassingGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            LIMIT 1
        """, conn, params=(team_id, year, week))
        if not qb.empty and pd.notna(qb.iloc[0, 0]):
            grades['qb_grade'] = float(qb.iloc[0, 0])
        
        defense = pd.read_sql_query("""
            SELECT AVG(grades_defense) as def_grade
            FROM Players_DefenseGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
        """, conn, params=(team_id, year, week))
        if not defense.empty and pd.notna(defense.iloc[0, 0]):
            grades['def_grade'] = float(defense.iloc[0, 0])
    except:
        pass
    
    pff_cache[cache_key] = grades
    return grades

def build_enhanced_features(g, home_id, away_id, week, baseline_features, 
                            rolling_stats, stats, elo_by_week, year):
    """Simplified feature set - focus on what works"""
    feature_dict = {}
    
    # Baseline stats
    for feat in baseline_features:
        h_val = get_latest_stat(home_id, week, feat, rolling_stats, stats)
        a_val = get_latest_stat(away_id, week, feat, rolling_stats, stats)
        feature_dict[f"{feat}_diff"] = h_val - a_val
    
    # Elo
    h_elo = elo_by_week.get(week, {}).get(home_id, 1500)
    a_elo = elo_by_week.get(week, {}).get(away_id, 1500)
    feature_dict["elo_diff"] = h_elo - a_elo
    feature_dict["home_adv"] = HOME_ADV
    
    # Matchup features
    h_pass_off = get_latest_stat(home_id, week, "ppa_passing_total", rolling_stats, stats)
    a_pass_def = get_latest_stat(away_id, week, "defense_ppa", rolling_stats, stats)
    feature_dict["pass_matchup"] = h_pass_off + a_pass_def
    
    h_run_off = get_latest_stat(home_id, week, "ppa_rushing_total", rolling_stats, stats)
    feature_dict["run_matchup"] = h_run_off + a_pass_def
    
    # PFF
    if year == 2025:
        home_pff = get_team_pff_grades_simple(home_id, week, year)
        away_pff = get_team_pff_grades_simple(away_id, week, year)
        feature_dict["pff_qb_diff"] = home_pff.get('qb_grade', 0) - away_pff.get('qb_grade', 0)
        feature_dict["pff_def_diff"] = home_pff.get('def_grade', 0) - away_pff.get('def_grade', 0)
    
    # Vegas lines
    if pd.notna(g.spread):
        feature_dict["vegas_spread"] = float(g.spread)
        
    if pd.notna(g.homeML) and pd.notna(g.awayML):
        vegas_home_prob = moneyline_to_prob(g.homeML)
        if vegas_home_prob is not None:
            feature_dict["vegas_home_prob"] = float(vegas_home_prob)
    
    return feature_dict

# ============================================================================
# MAIN
# ============================================================================

log_progress("Loading data...")
train_stats, train_games, _ = load_year_data(YEAR)
train_team_map = build_team_mapping(train_stats, train_games)
train_elo = compute_elo(train_games, train_team_map)
baseline_features = get_baseline_features()
train_rolling = compute_exponential_rolling_stats(train_stats, baseline_features, alpha=0.3)

log_progress("Building training features...")
train_X = []
train_y = []

for target_week in TRAIN_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) & 
        (train_games["completed"] == 1)
    ]
    
    iterator = tqdm(week_games.iterrows(), total=len(week_games), desc=f"Week {target_week}") if HAS_TQDM else week_games.iterrows()
    
    for _, g in iterator:
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id or pd.isna(g.homePoints): continue
        
        feats = build_enhanced_features(
            g, h_id, a_id, target_week, baseline_features, 
            train_rolling, train_stats, train_elo, YEAR
        )
        
        train_X.append(feats)
        train_y.append(1 if g.homePoints > g.awayPoints else 0)

X_train = pd.DataFrame(train_X).fillna(0)
y_train = np.array(train_y)

log_progress(f"Training dataset: {len(X_train)} games, {len(X_train.columns)} features")

# KEY: Use less aggressive regularization for smoother probabilities
log_progress("Training LightGBM with smooth probability output...")

model = lgb.LGBMClassifier(
    objective='binary',
    n_estimators=200,
    learning_rate=0.05,
    max_depth=5,  # Shallower for smoother probs
    num_leaves=20,  # Fewer leaves for smoother probs
    min_child_samples=30,  # Larger for smoother probs
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,  # Less regularization
    reg_lambda=0.1,  # Less regularization
    verbosity=-1,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# KEY: Better calibration with cross-validation
log_progress("Calibrating with CV (better than prefit)...")
calibrated_model = CalibratedClassifierCV(
    model, 
    method='sigmoid',  # Try sigmoid instead of isotonic
    cv=5  # Use CV instead of prefit
)
calibrated_model.fit(X_train, y_train)

log_progress("Testing...")
test_predictions = []

for target_week in TEST_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) &
        (train_games["completed"] == 1)
    ].copy()
    
    log_progress(f"  Week {target_week}: {len(week_games)} games")
    
    iterator = tqdm(week_games.iterrows(), total=len(week_games), desc=f"  Testing") if HAS_TQDM else week_games.iterrows()
    
    for _, g in iterator:
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        
        feats = build_enhanced_features(
            g, h_id, a_id, target_week, baseline_features,
            train_rolling, train_stats, train_elo, YEAR
        )
        
        X_test = pd.DataFrame([feats]).fillna(0)
        for col in X_train.columns:
            if col not in X_test.columns:
                X_test[col] = 0.0
        X_test = X_test[X_train.columns]
        
        # Get smooth probabilities
        probs = calibrated_model.predict_proba(X_test)[0]
        win_prob = float(probs[1])
        
        # Calculate conviction (0 to 1 scale, continuous)
        conviction = abs(win_prob - 0.5) * 2.0
        conviction = float(np.clip(conviction, 0.0, 1.0))
        
        predicted_winner = "home" if win_prob > 0.5 else "away"
        
        actual_winner = None
        correct = None
        
        if pd.notna(g.homePoints) and pd.notna(g.awayPoints):
            actual_winner = "home" if g.homePoints > g.awayPoints else "away"
            correct = 1 if predicted_winner == actual_winner else 0
        
        test_predictions.append({
            "game_id": int(g.id),
            "week": target_week,
            "spread": float(g.spread) if pd.notna(g.spread) else None,
            "predicted_home_win_prob": round(win_prob, 4),
            "conviction": round(conviction, 4),
            "predicted_winner": predicted_winner,
            "actual_winner": actual_winner,
            "correct": correct
        })

test_df = pd.DataFrame(test_predictions)
completed = test_df[test_df["correct"].notna()]

print("\n" + "="*80)
print("RESULTS - V3 MODEL (SMOOTH CALIBRATION)")
print("="*80)
print(f"\n📊 Total test games: {len(completed)}")

if len(completed) > 0:
    accuracy = completed["correct"].mean() * 100
    print(f"\n🎯 OVERALL ACCURACY: {accuracy:.1f}%")
    
    # Check conviction spread - SHOULD BE BETTER NOW
    print(f"\n📊 CONVICTION DISTRIBUTION (should be smooth!):")
    print(f"   Min:    {completed['conviction'].min():.3f}")
    print(f"   25th %: {completed['conviction'].quantile(0.25):.3f}")
    print(f"   Median: {completed['conviction'].median():.3f}")
    print(f"   75th %: {completed['conviction'].quantile(0.75):.3f}")
    print(f"   Max:    {completed['conviction'].max():.3f}")
    print(f"   Std:    {completed['conviction'].std():.3f}")
    
    # Count how many at exact 0.5 and 1.0 (should be fewer)
    at_half = (completed['conviction'] == 0.5).sum()
    at_one = (completed['conviction'] == 1.0).sum()
    print(f"\n   Games at exactly 0.5: {at_half} ({at_half/len(completed)*100:.1f}%)")
    print(f"   Games at exactly 1.0: {at_one} ({at_one/len(completed)*100:.1f}%)")
    
    # Histogram of conviction
    print(f"\n📊 CONVICTION HISTOGRAM:")
    for bucket in [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]:
        count = ((completed['conviction'] >= bucket[0]) & (completed['conviction'] < bucket[1])).sum()
        pct = count / len(completed) * 100
        bar = "█" * int(pct / 2)
        print(f"   {bucket[0]:.1f}-{bucket[1]:.1f}: {count:3d} games {bar}")
    
    print(f"\n📈 ACCURACY BY CONVICTION:")
    for threshold in [0.0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
        high_conv = completed[completed["conviction"] >= threshold]
        if len(high_conv) > 0:
            conv_acc = high_conv["correct"].mean() * 100
            print(f"   ≥{threshold*100:.0f}%: {len(high_conv):3d} games → {conv_acc:.1f}% accuracy")
    
    print(f"\n📊 BY WEEK:")
    for week in TEST_WEEKS:
        week_preds = completed[completed['week'] == week]
        if len(week_preds) > 0:
            week_acc = week_preds['correct'].mean() * 100
            print(f"   Week {week}: {len(week_preds):3d} games → {week_acc:.1f}% accuracy")

# Save
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS Teams_Games_Enhanced_V3_Predictions")
cursor.execute("""
    CREATE TABLE Teams_Games_Enhanced_V3_Predictions (
        game_id INTEGER PRIMARY KEY,
        week INTEGER,
        spread REAL,
        predicted_home_win_prob REAL,
        conviction REAL,
        predicted_winner TEXT,
        actual_winner TEXT,
        correct INTEGER
    )
""")

cursor.executemany("""
    INSERT OR REPLACE INTO Teams_Games_Enhanced_V3_Predictions VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", [(
    p["game_id"], p["week"], p["spread"], p["predicted_home_win_prob"],
    p["conviction"], p["predicted_winner"], p["actual_winner"], p["correct"]
) for p in test_predictions])

conn.commit()
conn.close()

log_progress("="*60)
log_progress("V3 COMPLETE - Check conviction histogram!")
log_progress("="*60)