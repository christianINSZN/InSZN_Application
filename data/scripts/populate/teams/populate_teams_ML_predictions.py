#!/usr/bin/env python3
"""
CFB PFF-Enhanced Maximum Accuracy Model
Goal: 75%+ overall winner prediction accuracy using player-level grades
"""

import sqlite3
import pandas as pd
import numpy as np
import lightgbm as lgb
from pathlib import Path
from sklearn.calibration import CalibratedClassifierCV
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIG
# ============================================================================
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")

YEAR = 2025  # Train AND test on 2025
TRAIN_WEEKS = range(1, 11)  # Weeks 1-10 for training
TEST_WEEKS = range(11, 16)  # Weeks 11-15 for testing

HOME_ADV = 2.5
ELO_K = 32

print("="*80)
print("CFB PFF-ENHANCED MAXIMUM ACCURACY MODEL")
print("="*80)
print(f"\n🎯 STRATEGY: Train on 2025 weeks 1-10, test on weeks 11-15")
print(f"📊 This way PFF data is in BOTH train and test sets")

conn = sqlite3.connect(DB_FILE)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def load_year_data(year):
    """Load basic game data"""
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
    
    return stats, games, fbs_ids

def build_team_mapping(stats, games):
    """Map external to internal team IDs"""
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
    """Compute MOV-adjusted Elo"""
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
    """Core statistical features (no PFF)"""
    return [
        "ppa_overall_total", "ppa_passing_total", "ppa_rushing_total",
        "offense_ppa", "offense_success_rate", "offense_explosiveness",
        "defense_ppa", "defense_success_rate", "defense_explosiveness",
        "success_rate_overall_total", "explosiveness_overall_total",
        "points", "totalYards", "turnovers", "havoc_total"
    ]

def compute_rolling_stats(stats, features):
    """3-game rolling averages"""
    rolling_stats = {}
    
    for col in features:
        stats[col] = pd.to_numeric(stats[col], errors='coerce')
    
    for tid in stats["team_id"].unique():
        team_df = stats[stats["team_id"] == tid].copy()
        team_df = team_df.sort_values("week").set_index("week")
        rolling_stats[tid] = team_df[features].rolling(window=3, min_periods=1).mean()
    
    return rolling_stats

def get_latest_stat(tid, week, feature, rolling_stats, stats):
    """Get most recent stat value"""
    val = 0.0
    
    if tid in rolling_stats:
        past_weeks = rolling_stats[tid].index < week
        if past_weeks.any():
            try:
                latest_week = rolling_stats[tid].index[past_weeks][-1]
                val = rolling_stats[tid].loc[latest_week, feature]
            except:
                pass
    
    if isinstance(val, (pd.Series, np.ndarray)):
        val = float(val.iloc[0] if isinstance(val, pd.Series) else val[0]) if len(val) > 0 else 0.0
    elif hasattr(val, 'item'):
        try:
            val = val.item()
        except:
            val = 0.0
    
    if pd.isna(val) or val == 0.0:
        team_games = stats[(stats["team_id"] == tid) & (stats["week"] < week)]
        if len(team_games) > 0:
            val = team_games[feature].mean()
    
    return float(val) if not pd.isna(val) else 0.0

# ============================================================================
# PFF PLAYER GRADE AGGREGATION
# ============================================================================

def get_team_pff_grades(team_id, week, year):
    """
    Aggregate player grades to team level for a specific week
    Only use tables that have data!
    """
    grades = {}
    
    try:
        # QB Passing Grades (AVAILABLE)
        qb_query = """
            SELECT AVG(grades_pass) as qb_pass_grade,
                   AVG(completion_percent) as qb_completion_pct,
                   AVG(ypa) as qb_ypa,
                   AVG(qb_rating) as qb_rating,
                   AVG(big_time_throws) as qb_big_time_throws,
                   AVG(turnover_worthy_plays) as qb_turnover_worthy
            FROM Players_PassingGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            ORDER BY grades_pass DESC
            LIMIT 1
        """
        qb = pd.read_sql_query(qb_query, conn, params=(team_id, year, week))
        if not qb.empty and qb.iloc[0].notna().any():
            for col in qb.columns:
                val = qb[col].iloc[0]
                if pd.notna(val):
                    grades[col] = float(val)
        
        # OL Pass Blocking (AVAILABLE)
        ol_pass_query = """
            SELECT AVG(grades_pass_block) as ol_pass_block_grade,
                   AVG(sacks_allowed) as ol_sacks_allowed,
                   AVG(pressures_allowed) as ol_pressures_allowed
            FROM Players_BlockingPass_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            ORDER BY grades_pass_block DESC
            LIMIT 5
        """
        ol_pass = pd.read_sql_query(ol_pass_query, conn, params=(team_id, year, week))
        if not ol_pass.empty:
            for col in ol_pass.columns:
                val = ol_pass[col].mean()
                if pd.notna(val):
                    grades[f"ol_{col}"] = float(val)
        
        # OL Run Blocking (AVAILABLE)
        ol_run_query = """
            SELECT AVG(grades_run_block) as ol_run_block_grade
            FROM Players_BlockingRun_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            ORDER BY grades_run_block DESC
            LIMIT 5
        """
        ol_run = pd.read_sql_query(ol_run_query, conn, params=(team_id, year, week))
        if not ol_run.empty:
            val = ol_run["ol_run_block_grade"].mean()
            if pd.notna(val):
                grades["ol_run_block_grade"] = float(val)
        
        # WR/TE Receiving (AVAILABLE)
        wr_query = """
            SELECT AVG(grades_offense) as wr_receiving_grade,
                   AVG(yards_per_reception) as wr_ypr,
                   AVG(drop_rate) as wr_drop_rate
            FROM Players_ReceivingGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            ORDER BY grades_offense DESC
            LIMIT 4
        """
        wr = pd.read_sql_query(wr_query, conn, params=(team_id, year, week))
        if not wr.empty:
            for col in wr.columns:
                val = wr[col].mean()
                if pd.notna(val):
                    grades[f"wr_{col}"] = float(val)
        
        # RB Rushing (AVAILABLE)
        rb_query = """
            SELECT AVG(grades_offense) as rb_rushing_grade
            FROM Players_RushingGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
            ORDER BY grades_offense DESC
            LIMIT 2
        """
        rb = pd.read_sql_query(rb_query, conn, params=(team_id, year, week))
        if not rb.empty:
            val = rb["rb_rushing_grade"].mean()
            if pd.notna(val):
                grades["rb_rushing_grade"] = float(val)
        
        # DEFENSE: Aggregate from player-level defense grades (not team table)
        def_query = """
            SELECT AVG(grades_defense) as def_overall_grade,
                   AVG(grades_coverage_defense) as def_coverage_grade,
                   AVG(grades_pass_rush_defense) as def_pass_rush_grade,
                   AVG(tackles) as def_tackles,
                   AVG(sacks) as def_sacks,
                   AVG(hurries) as def_hurries,
                   AVG(pass_break_ups) as def_pbus
            FROM Players_DefenseGrades_Weekly
            WHERE teamID = ? AND year = ? AND week < ?
        """
        defense = pd.read_sql_query(def_query, conn, params=(team_id, year, week))
        if not defense.empty:
            for col in defense.columns:
                val = defense[col].mean()
                if pd.notna(val):
                    grades[f"def_{col}"] = float(val)
        
    except Exception as e:
        print(f"Warning: PFF grades error for team {team_id}, week {week}: {e}")
    
    return grades

# ============================================================================
# BUILD FEATURES
# ============================================================================

def build_features_for_game(g, home_id, away_id, week, baseline_features, 
                            rolling_stats, stats, elo_by_week, year, use_pff=False):
    """Build complete feature vector"""
    feature_dict = {}
    
    # Baseline stat differentials
    for feat in baseline_features:
        h_val = get_latest_stat(home_id, week, feat, rolling_stats, stats)
        a_val = get_latest_stat(away_id, week, feat, rolling_stats, stats)
        feature_dict[f"{feat}_diff"] = h_val - a_val
    
    # Elo differential
    h_elo = elo_by_week.get(week, {}).get(home_id, 1500)
    a_elo = elo_by_week.get(week, {}).get(away_id, 1500)
    feature_dict["elo_diff"] = h_elo - a_elo
    feature_dict["home_adv"] = HOME_ADV
    
    # PFF grades (only for 2025)
    if use_pff and year == 2025:
        home_pff = get_team_pff_grades(home_id, week, year)
        away_pff = get_team_pff_grades(away_id, week, year)
        
        # Create differentials for all PFF grades
        all_pff_keys = set(home_pff.keys()) | set(away_pff.keys())
        for key in all_pff_keys:
            h_grade = home_pff.get(key, 0.0)
            a_grade = away_pff.get(key, 0.0)
            feature_dict[f"pff_{key}_diff"] = h_grade - a_grade
    
    return feature_dict

# ============================================================================
# TRAIN ON 2025 WEEKS 1-10
# ============================================================================
print("\n" + "="*80)
print("PHASE 1: TRAINING ON 2025 WEEKS 1-10 (WITH PFF)")
print("="*80)

train_stats, train_games, _ = load_year_data(YEAR)
train_team_map = build_team_mapping(train_stats, train_games)
train_elo = compute_elo(train_games, train_team_map)
baseline_features = get_baseline_features()
train_rolling = compute_rolling_stats(train_stats, baseline_features)

print(f"✓ Loaded data from {YEAR}")

# Build training dataset from weeks 1-10
train_X = []
train_y = []

for target_week in TRAIN_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) & 
        (train_games["completed"] == 1)
    ]
    
    for _, g in week_games.iterrows():
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        if pd.isna(g.homePoints): continue
        
        feats = build_features_for_game(
            g, h_id, a_id, target_week, baseline_features, 
            train_rolling, train_stats, train_elo, YEAR, use_pff=True
        )
        
        train_X.append(feats)
        train_y.append(1 if g.homePoints > g.awayPoints else 0)

X_train = pd.DataFrame(train_X)
y_train = np.array(train_y)

print(f"🤖 Training on {len(X_train)} games from weeks {list(TRAIN_WEEKS)[0]}-{list(TRAIN_WEEKS)[-1]}...")
print(f"   Features: {len(X_train.columns)} (baseline + PFF)")

model = lgb.LGBMClassifier(
    objective='binary',
    n_estimators=300,
    learning_rate=0.03,
    max_depth=7,
    num_leaves=50,
    min_child_samples=15,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.5,
    reg_lambda=0.5,
    verbosity=-1,
    random_state=42
)

model.fit(X_train, y_train)

# Calibrate
calibrated_model = CalibratedClassifierCV(model, method='isotonic', cv='prefit')
calibrated_model.fit(X_train, y_train)

print("✓ Model trained and calibrated")

# ============================================================================
# TEST ON 2025 WEEKS 11-15
# ============================================================================
print("\n" + "="*80)
print("PHASE 2: TESTING ON 2025 WEEKS 11-15 (WITH PFF)")
print("="*80)

test_predictions = []

for target_week in TEST_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) &
        (train_games["completed"] == 1)
    ].copy()
    
    if week_games.empty:
        continue
    
    for _, g in week_games.iterrows():
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        
        # Build features WITH PFF data
        feats = build_features_for_game(
            g, h_id, a_id, target_week, baseline_features,
            train_rolling, train_stats, train_elo, YEAR, use_pff=True
        )
        
        # Ensure same features as training
        X_test = pd.DataFrame([feats])
        for col in X_train.columns:
            if col not in X_test.columns:
                X_test[col] = 0.0
        X_test = X_test[X_train.columns]
        
        # Predict
        win_prob = calibrated_model.predict_proba(X_test)[0][1]
        predicted_winner = "home" if win_prob > 0.5 else "away"
        conviction = abs(win_prob - 0.5) * 2
        
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

print(f"\n📊 RESULTS ON WEEKS {list(TEST_WEEKS)[0]}-{list(TEST_WEEKS)[-1]}:")
print(f"   Total games: {len(completed)}")

if len(completed) > 0:
    accuracy = completed["correct"].mean() * 100
    print(f"   Overall accuracy: {accuracy:.1f}%")
    
    print(f"\n📈 ACCURACY BY CONVICTION:")
    for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
        high_conv = completed[completed["conviction"] >= threshold]
        if len(high_conv) > 0:
            conv_acc = high_conv["correct"].mean() * 100
            print(f"   Conviction ≥{threshold:.1f}: {len(high_conv):3d} games, {conv_acc:.1f}% accuracy")

# Save
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS Teams_Games_PFF_Predictions")
cursor.execute("""
    CREATE TABLE Teams_Games_PFF_Predictions (
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
    INSERT OR REPLACE INTO Teams_Games_PFF_Predictions VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", [(
    p["game_id"], p["week"], p["spread"], p["predicted_home_win_prob"],
    p["conviction"], p["predicted_winner"], p["actual_winner"], p["correct"]
) for p in test_predictions])

conn.commit()
conn.close()

print("\n" + "="*80)
print("COMPLETE - Run SQL to compare with/without PFF")
print("="*80)