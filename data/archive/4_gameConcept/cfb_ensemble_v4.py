#!/usr/bin/env python3
"""
CFB Ensemble Model - Postseason Version
- Trains on full regular season (weeks 1-15)
- Tests on weeks 12-15 (shows accuracy)
- Predicts postseason week 1 (bowl games / CFP)
- Saves all to single database table
"""

import sqlite3
import pandas as pd
import numpy as np
import lightgbm as lgb
from pathlib import Path
from sklearn.calibration import CalibratedClassifierCV
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
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
TRAIN_WEEKS = range(1, 16)  # Train on weeks 1-15 (full regular season)
TEST_WEEKS = [12, 13, 14, 15]  # Test (verify accuracy on late season)
PREDICT_POSTSEASON_WEEK = 1  # Predict postseason week 1 (bowls/CFP)

HOME_ADV = 2.5
ELO_K = 32

print("="*80)
print("CFB ENSEMBLE MODEL - POSTSEASON")
print("="*80)
print(f"🎯 Train:   Weeks 1-15 (full regular season)")
print(f"📊 Test:    Weeks 12-15 (verify accuracy)")
print(f"🔮 Predict: Postseason Week {PREDICT_POSTSEASON_WEEK} (bowls/CFP)")
print("="*80)

conn = sqlite3.connect(DB_FILE)

def log_progress(message):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")

def load_year_data(year, season_type='regular'):
    log_progress(f"Loading {season_type} season data...")
    stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(year,))
    
    # Load games filtered by seasonType
    games = pd.read_sql_query("""
        SELECT id, homeId, awayId, homePoints, awayPoints, week, completed, seasonType,
               draftKingsSpread, draftKingsHomeMoneyline, draftKingsAwayMoneyline
        FROM Teams_Games WHERE season = ? AND seasonType = ?
    """, conn, params=(year, season_type))
    
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
    
    return elo_by_week, elo  # Return final ELO for postseason predictions

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

def get_latest_stat(tid, week, feature, rolling_stats, stats, use_all=False):
    """
    Get latest stat for a team.
    If use_all=True, use all available data (for postseason predictions).
    """
    val = 0.0
    
    if tid in rolling_stats and feature in rolling_stats[tid].columns:
        if use_all:
            # Use the last available week's rolling average
            if len(rolling_stats[tid]) > 0:
                try:
                    val = rolling_stats[tid].iloc[-1][feature]
                except:
                    pass
        else:
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
        if use_all:
            team_games = stats[stats["team_id"] == tid]
        else:
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

def get_team_pff_grades_simple(team_id, week, year, use_all=False):
    cache_key = (team_id, week, year, use_all)
    if cache_key in pff_cache:
        return pff_cache[cache_key]
    
    grades = {}
    try:
        if use_all:
            qb = pd.read_sql_query("""
                SELECT AVG(grades_pass) as qb_grade
                FROM Players_PassingGrades_Weekly
                WHERE teamID = ? AND year = ?
                LIMIT 1
            """, conn, params=(team_id, year))
        else:
            qb = pd.read_sql_query("""
                SELECT AVG(grades_pass) as qb_grade
                FROM Players_PassingGrades_Weekly
                WHERE teamID = ? AND year = ? AND week < ?
                LIMIT 1
            """, conn, params=(team_id, year, week))
        if not qb.empty and pd.notna(qb.iloc[0, 0]):
            grades['qb_grade'] = float(qb.iloc[0, 0])
        
        if use_all:
            defense = pd.read_sql_query("""
                SELECT AVG(grades_defense) as def_grade
                FROM Players_DefenseGrades_Weekly
                WHERE teamID = ? AND year = ?
            """, conn, params=(team_id, year))
        else:
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
                            rolling_stats, stats, elo_by_week, year, 
                            use_all=False, final_elo=None):
    feature_dict = {}
    
    for feat in baseline_features:
        h_val = get_latest_stat(home_id, week, feat, rolling_stats, stats, use_all=use_all)
        a_val = get_latest_stat(away_id, week, feat, rolling_stats, stats, use_all=use_all)
        feature_dict[f"{feat}_diff"] = h_val - a_val
    
    # For postseason, use final ELO ratings
    if use_all and final_elo:
        h_elo = final_elo.get(home_id, 1500)
        a_elo = final_elo.get(away_id, 1500)
    else:
        h_elo = elo_by_week.get(week, {}).get(home_id, 1500)
        a_elo = elo_by_week.get(week, {}).get(away_id, 1500)
    
    feature_dict["elo_diff"] = h_elo - a_elo
    feature_dict["home_adv"] = HOME_ADV
    
    h_pass_off = get_latest_stat(home_id, week, "ppa_passing_total", rolling_stats, stats, use_all=use_all)
    a_pass_def = get_latest_stat(away_id, week, "defense_ppa", rolling_stats, stats, use_all=use_all)
    feature_dict["pass_matchup"] = h_pass_off + a_pass_def
    
    h_run_off = get_latest_stat(home_id, week, "ppa_rushing_total", rolling_stats, stats, use_all=use_all)
    feature_dict["run_matchup"] = h_run_off + a_pass_def
    
    if year == 2025:
        home_pff = get_team_pff_grades_simple(home_id, week, year, use_all=use_all)
        away_pff = get_team_pff_grades_simple(away_id, week, year, use_all=use_all)
        feature_dict["pff_qb_diff"] = home_pff.get('qb_grade', 0) - away_pff.get('qb_grade', 0)
        feature_dict["pff_def_diff"] = home_pff.get('def_grade', 0) - away_pff.get('def_grade', 0)
    
    if pd.notna(g.spread):
        feature_dict["vegas_spread"] = float(g.spread)
        
    if pd.notna(g.homeML) and pd.notna(g.awayML):
        vegas_home_prob = moneyline_to_prob(g.homeML)
        if vegas_home_prob is not None:
            feature_dict["vegas_home_prob"] = float(vegas_home_prob)
    
    return feature_dict

# ============================================================================
# BUILD TRAINING DATA (Full Regular Season)
# ============================================================================

log_progress("Loading regular season data...")
train_stats, train_games, _ = load_year_data(YEAR, season_type='regular')
train_team_map = build_team_mapping(train_stats, train_games)
train_elo, final_elo = compute_elo(train_games, train_team_map)
baseline_features = get_baseline_features()
train_rolling = compute_exponential_rolling_stats(train_stats, baseline_features, alpha=0.3)

log_progress("Building training features (weeks 1-15)...")
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

log_progress(f"Training dataset: {len(X_train)} games")

# ============================================================================
# TRAIN MODELS
# ============================================================================

print("\n" + "="*80)
print("TRAINING ENSEMBLE")
print("="*80)

log_progress("Training LightGBM...")
lgbm_model = lgb.LGBMClassifier(
    objective='binary', n_estimators=200, learning_rate=0.05,
    max_depth=5, num_leaves=20, min_child_samples=30,
    subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=0.1,
    verbosity=-1, random_state=42, n_jobs=-1
)
lgbm_model.fit(X_train, y_train)
lgbm_calibrated = CalibratedClassifierCV(lgbm_model, method='sigmoid', cv='prefit')
lgbm_calibrated.fit(X_train, y_train)

log_progress("Training Neural Network...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)

nn_model = MLPClassifier(
    hidden_layer_sizes=(100, 50, 25), activation='relu', solver='adam',
    alpha=0.001, batch_size=32, learning_rate='adaptive',
    learning_rate_init=0.001, max_iter=200, random_state=42,
    early_stopping=True, validation_fraction=0.1, n_iter_no_change=15,
    verbose=False
)
nn_model.fit(X_train_scaled, y_train)

log_progress("✓ Models trained")

# ============================================================================
# TEST ON REGULAR SEASON WEEKS 12-15
# ============================================================================

print("\n" + "="*80)
print("TESTING ON REGULAR SEASON (Weeks 12-15)")
print("="*80)

all_predictions = []

for target_week in TEST_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) & 
        (train_games["completed"] == 1)
    ].copy()
    
    if len(week_games) == 0:
        log_progress(f"Week {target_week}: No games found")
        continue
    
    log_progress(f"Week {target_week}: {len(week_games)} games")
    
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
        
        X_test_scaled = scaler.transform(X_test)
        
        lgbm_prob = lgbm_calibrated.predict_proba(X_test)[0][1]
        nn_prob = nn_model.predict_proba(X_test_scaled)[0][1]
        
        ensemble_prob = 0.60 * lgbm_prob + 0.40 * nn_prob
        
        if pd.notna(g.homeML) and pd.notna(g.awayML):
            vegas_prob = moneyline_to_prob(g.homeML)
            if vegas_prob is not None:
                final_prob = 0.70 * ensemble_prob + 0.30 * vegas_prob
            else:
                final_prob = ensemble_prob
        else:
            final_prob = ensemble_prob
        
        win_prob = float(final_prob)
        conviction = abs(win_prob - 0.5) * 2.0
        conviction = float(np.clip(conviction, 0.0, 1.0))
        
        predicted_winner = "home" if win_prob > 0.5 else "away"
        actual_winner = "home" if g.homePoints > g.awayPoints else "away"
        correct = 1 if predicted_winner == actual_winner else 0
        
        all_predictions.append({
            "game_id": int(g.id),
            "week": target_week,
            "season_type": "regular",
            "spread": float(g.spread) if pd.notna(g.spread) else None,
            "predicted_home_win_prob": round(win_prob, 4),
            "conviction": round(conviction, 4),
            "predicted_winner": predicted_winner,
            "actual_winner": actual_winner,
            "correct": correct,
            "lgbm_prob": round(lgbm_prob, 4),
            "nn_prob": round(nn_prob, 4)
        })

# ============================================================================
# PREDICT POSTSEASON
# ============================================================================

print("\n" + "="*80)
print(f"PREDICTING POSTSEASON WEEK {PREDICT_POSTSEASON_WEEK}")
print("="*80)

log_progress("Loading postseason games...")
_, postseason_games, _ = load_year_data(YEAR, season_type='postseason')

# Build team mapping for postseason (may include teams not in regular season mapping)
# We'll extend the existing mapping
for _, g in postseason_games.iterrows():
    if g.homeId not in train_team_map:
        train_team_map[g.homeId] = g.homeId  # Use external ID as fallback
    if g.awayId not in train_team_map:
        train_team_map[g.awayId] = g.awayId

postseason_week_games = postseason_games[postseason_games["week"] == PREDICT_POSTSEASON_WEEK].copy()

if len(postseason_week_games) == 0:
    log_progress(f"No postseason week {PREDICT_POSTSEASON_WEEK} games found")
else:
    log_progress(f"Postseason Week {PREDICT_POSTSEASON_WEEK}: {len(postseason_week_games)} games")
    
    iterator = tqdm(postseason_week_games.iterrows(), total=len(postseason_week_games), desc=f"  Predicting") if HAS_TQDM else postseason_week_games.iterrows()
    
    for _, g in iterator:
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        
        # Use full season stats for postseason predictions
        feats = build_enhanced_features(
            g, h_id, a_id, 16, baseline_features,  # week 16 as placeholder
            train_rolling, train_stats, train_elo, YEAR,
            use_all=True, final_elo=final_elo
        )
        
        X_test = pd.DataFrame([feats]).fillna(0)
        for col in X_train.columns:
            if col not in X_test.columns:
                X_test[col] = 0.0
        X_test = X_test[X_train.columns]
        
        X_test_scaled = scaler.transform(X_test)
        
        lgbm_prob = lgbm_calibrated.predict_proba(X_test)[0][1]
        nn_prob = nn_model.predict_proba(X_test_scaled)[0][1]
        
        ensemble_prob = 0.60 * lgbm_prob + 0.40 * nn_prob
        
        if pd.notna(g.homeML) and pd.notna(g.awayML):
            vegas_prob = moneyline_to_prob(g.homeML)
            if vegas_prob is not None:
                final_prob = 0.70 * ensemble_prob + 0.30 * vegas_prob
            else:
                final_prob = ensemble_prob
        else:
            final_prob = ensemble_prob
        
        win_prob = float(final_prob)
        conviction = abs(win_prob - 0.5) * 2.0
        conviction = float(np.clip(conviction, 0.0, 1.0))
        
        predicted_winner = "home" if win_prob > 0.5 else "away"
        
        # Check if game is completed
        actual_winner = None
        correct = None
        if pd.notna(g.homePoints) and pd.notna(g.awayPoints) and g.completed == 1:
            actual_winner = "home" if g.homePoints > g.awayPoints else "away"
            correct = 1 if predicted_winner == actual_winner else 0
        
        all_predictions.append({
            "game_id": int(g.id),
            "week": int(g.week),
            "season_type": "postseason",
            "spread": float(g.spread) if pd.notna(g.spread) else None,
            "predicted_home_win_prob": round(win_prob, 4),
            "conviction": round(conviction, 4),
            "predicted_winner": predicted_winner,
            "actual_winner": actual_winner,
            "correct": correct,
            "lgbm_prob": round(lgbm_prob, 4),
            "nn_prob": round(nn_prob, 4)
        })

# ============================================================================
# SHOW RESULTS
# ============================================================================

print("\n" + "="*80)
print("RESULTS")
print("="*80)

df = pd.DataFrame(all_predictions)

# Show accuracy for regular season test weeks
regular = df[(df["season_type"] == "regular") & (df["correct"].notna())]
if len(regular) > 0:
    print(f"\n📊 REGULAR SEASON ACCURACY (Weeks 12-15):")
    print(f"   Total games: {len(regular)}")
    print(f"   Overall: {regular['correct'].mean()*100:.1f}%")
    
    for week in TEST_WEEKS:
        week_df = regular[regular['week'] == week]
        if len(week_df) > 0:
            print(f"   Week {week}: {week_df['correct'].mean()*100:.1f}% ({len(week_df)} games)")
    
    print(f"\n📈 ACCURACY BY CONVICTION:")
    for threshold in [0.5, 0.6, 0.7, 0.8]:
        high_conv = regular[regular["conviction"] >= threshold]
        if len(high_conv) > 0:
            conv_acc = high_conv["correct"].mean() * 100
            print(f"   ≥{threshold*100:.0f}%: {len(high_conv):3d} games → {conv_acc:.1f}% accuracy")

# Show postseason predictions
postseason = df[df["season_type"] == "postseason"]
if len(postseason) > 0:
    print(f"\n🏈 POSTSEASON WEEK {PREDICT_POSTSEASON_WEEK} PREDICTIONS:")
    print(f"   Total games: {len(postseason)}")
    print(f"   High confidence (≥70%): {len(postseason[postseason['conviction'] >= 0.7])} games")
    print(f"   Medium confidence (50-70%): {len(postseason[(postseason['conviction'] >= 0.5) & (postseason['conviction'] < 0.7)])} games")
    
    # If any postseason games are completed, show accuracy
    completed_post = postseason[postseason["correct"].notna()]
    if len(completed_post) > 0:
        print(f"   Completed: {len(completed_post)} games → {completed_post['correct'].mean()*100:.1f}% accuracy")

# ============================================================================
# SAVE TO DATABASE
# ============================================================================

log_progress("Saving to database...")

cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS Teams_Games_Ensemble_Predictions")
cursor.execute("""
    CREATE TABLE Teams_Games_Ensemble_Predictions (
        game_id INTEGER PRIMARY KEY,
        week INTEGER,
        season_type TEXT,
        spread REAL,
        predicted_home_win_prob REAL,
        conviction REAL,
        predicted_winner TEXT,
        actual_winner TEXT,
        correct INTEGER,
        lgbm_prob REAL,
        nn_prob REAL
    )
""")

cursor.executemany("""
    INSERT OR REPLACE INTO Teams_Games_Ensemble_Predictions 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", [(
    p["game_id"], p["week"], p["season_type"], p["spread"], p["predicted_home_win_prob"],
    p["conviction"], p["predicted_winner"], p["actual_winner"], p["correct"],
    p["lgbm_prob"], p["nn_prob"]
) for p in all_predictions])

conn.commit()
conn.close()

print("\n" + "="*80)
print("COMPLETE")
print("="*80)
print(f"\n✓ Saved {len(all_predictions)} predictions to database")
print(f"   - Regular season (weeks 12-15): {len(regular)} games")
print(f"   - Postseason week {PREDICT_POSTSEASON_WEEK}: {len(postseason)} games")
print(f"\nRun format_for_website.py to generate display-ready output")
print("="*80)