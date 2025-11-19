#!/usr/bin/env python3
"""
CFB Proper Validation
Train on 2024 → Validate thresholds → Test on 2025
"""

import sqlite3
import pandas as pd
import numpy as np
import lightgbm as lgb
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIG
# ============================================================================
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")

TRAIN_YEAR = 2024
TRAIN_WEEKS = range(1, 11)  # Weeks 1-10 for training model

VALIDATE_YEAR = 2024
VALIDATE_WEEKS = range(11, 16)  # Weeks 11-15 for finding thresholds

TEST_YEAR = 2025
TEST_WEEKS = range(4, 13)  # Weeks 4-12 for final test

HOME_ADV = 2.5
ELO_K = 32

print("="*80)
print("CFB PROPER VALIDATION - TRAIN/VALIDATE/TEST SPLIT")
print("="*80)
print(f"\n📚 TRAIN: {TRAIN_YEAR} Weeks {list(TRAIN_WEEKS)[0]}-{list(TRAIN_WEEKS)[-1]}")
print(f"🔍 VALIDATE: {VALIDATE_YEAR} Weeks {list(VALIDATE_WEEKS)[0]}-{list(VALIDATE_WEEKS)[-1]}")
print(f"🎯 TEST: {TEST_YEAR} Weeks {list(TEST_WEEKS)[0]}-{list(TEST_WEEKS)[-1]}")

conn = sqlite3.connect(DB_FILE)

# ============================================================================
# HELPER FUNCTIONS (same as before)
# ============================================================================

def load_year_data(year):
    """Load and prepare data for a given year"""
    stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(year,))
    games = pd.read_sql_query("""
        SELECT id, homeId, awayId, homePoints, awayPoints, week, completed,
               draftKingsSpread, draftKingsHomeMoneyline, draftKingsAwayMoneyline
        FROM Teams_Games WHERE season = ?
    """, conn, params=(year,))
    
    # FBS filter
    fbs = pd.read_sql_query(
        "SELECT DISTINCT teamId FROM Teams_Rankings WHERE year = ? AND FPI_Ranking IS NOT NULL", 
        conn, params=(year,)
    )
    fbs_ids = set(fbs["teamId"].astype(int))
    
    # Clean games
    games["homeId"] = pd.to_numeric(games["homeId"], errors="coerce")
    games["awayId"] = pd.to_numeric(games["awayId"], errors="coerce")
    games = games.dropna(subset=["homeId", "awayId"]).astype({"homeId": int, "awayId": int})
    games = games[games["homeId"].isin(fbs_ids) & games["awayId"].isin(fbs_ids)].copy()
    
    # Vegas processing
    games["spread"] = pd.to_numeric(
        games["draftKingsSpread"].astype(str).str.replace("+", "", regex=False), 
        errors="coerce"
    )
    
    def ml_to_prob(ml):
        if pd.isna(ml): return 0.5
        ml = float(ml)
        return 100 / (ml + 100) if ml > 0 else abs(ml) / (abs(ml) + 100)
    
    games["vegas_home_prob"] = games["draftKingsHomeMoneyline"].apply(ml_to_prob)
    games["vegas_away_prob"] = games["draftKingsAwayMoneyline"].apply(ml_to_prob)
    games["vegas_total_prob"] = games["vegas_home_prob"] + games["vegas_away_prob"]
    games["vegas_home_prob_devigged"] = games["vegas_home_prob"] / games["vegas_total_prob"]
    
    return stats, games, fbs_ids

def build_team_mapping(stats, games):
    """Map external team IDs to internal IDs"""
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
    """Compute ELO ratings with MOV adjustment"""
    elo = {tid: 1500 for tid in team_id_map.values()}
    elo_by_week = {0: elo.copy()}
    
    for week in sorted(games["week"].unique()):
        elo_by_week[week] = elo.copy()
        
        week_games = games[games["week"] == week]
        for _, g in week_games.iterrows():
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

def get_features():
    """Return list of features to use"""
    return [
        "ppa_overall_total", "ppa_passing_total", "ppa_rushing_total",
        "success_rate_overall_total", "success_rate_standard_downs_total", 
        "success_rate_passing_downs_total", "explosiveness_overall_total",
        "offense_ppa", "offense_success_rate", "offense_explosiveness",
        "defense_ppa", "defense_success_rate", "defense_explosiveness",
        "points", "totalYards", "yardsPerPass", "yardsPerRushAttempt",
        "turnovers", "havoc_total"
    ]

def compute_rolling_stats(stats, features):
    """Compute 3-game rolling averages"""
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
    
    # Convert to scalar
    if isinstance(val, (pd.Series, np.ndarray)):
        val = float(val.iloc[0] if isinstance(val, pd.Series) else val[0]) if len(val) > 0 else 0.0
    elif hasattr(val, 'item'):
        try:
            val = val.item()
        except:
            val = 0.0
    
    # Fallback
    if pd.isna(val) or val == 0.0:
        team_games = stats[(stats["team_id"] == tid) & (stats["week"] < week)]
        if len(team_games) > 0:
            val = team_games[feature].mean()
    
    return float(val) if not pd.isna(val) else 0.0

def build_features_for_game(g, home_id, away_id, week, features, rolling_stats, stats, elo_by_week):
    """Build feature vector for a game"""
    feature_dict = {}
    
    for feat in features:
        h_val = get_latest_stat(home_id, week, feat, rolling_stats, stats)
        a_val = get_latest_stat(away_id, week, feat, rolling_stats, stats)
        feature_dict[f"{feat}_diff"] = h_val - a_val
    
    h_elo = elo_by_week.get(week, {}).get(home_id, 1500)
    a_elo = elo_by_week.get(week, {}).get(away_id, 1500)
    feature_dict["elo_diff"] = h_elo - a_elo
    feature_dict["home_adv"] = HOME_ADV
    
    # Vegas for comparison
    feature_dict["vegas_spread"] = float(g.spread) if pd.notna(g.spread) else 0.0
    feature_dict["vegas_home_prob"] = float(g.vegas_home_prob_devigged) if pd.notna(g.vegas_home_prob_devigged) else 0.5
    
    return feature_dict

# ============================================================================
# PHASE 1: TRAIN MODEL ON 2024 WEEKS 1-10
# ============================================================================
print("\n" + "="*80)
print("PHASE 1: TRAINING MODEL")
print("="*80)

train_stats, train_games, train_fbs = load_year_data(TRAIN_YEAR)
train_team_map = build_team_mapping(train_stats, train_games)
train_elo = compute_elo(train_games, train_team_map)
features = get_features()
train_rolling = compute_rolling_stats(train_stats, features)

print(f"✓ Loaded {len(train_games)} games from {TRAIN_YEAR}")

# Build training dataset from weeks 1-10
train_X = []
train_y = []

for target_week in TRAIN_WEEKS:
    prior_games = train_games[
        (train_games["week"] < target_week) & 
        (train_games["completed"] == 1)
    ]
    
    week_games = train_games[
        (train_games["week"] == target_week) & 
        (train_games["completed"] == 1)
    ]
    
    if len(prior_games) < 50:
        continue
    
    for _, g in week_games.iterrows():
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        if pd.isna(g.homePoints): continue
        
        feats = build_features_for_game(
            g, h_id, a_id, target_week, features, 
            train_rolling, train_stats, train_elo
        )
        
        train_X.append(feats)
        train_y.append(g.homePoints - g.awayPoints)

X_train = pd.DataFrame(train_X)
y_train = np.array(train_y)

# Remove Vegas features
train_features = [c for c in X_train.columns if not c.startswith("vegas_")]
X_train_clean = X_train[train_features]

print(f"\n🤖 Training on {len(X_train_clean)} games...")

model = lgb.LGBMRegressor(
    objective='regression',
    n_estimators=200,
    learning_rate=0.05,
    max_depth=6,
    num_leaves=31,
    min_child_samples=20,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.5,
    reg_lambda=0.5,
    verbosity=-1,
    random_state=42
)

model.fit(X_train_clean, y_train)
print("✓ Model trained")

# ============================================================================
# PHASE 2: VALIDATE ON 2024 WEEKS 11-15 TO FIND THRESHOLDS
# ============================================================================
print("\n" + "="*80)
print("PHASE 2: FINDING OPTIMAL THRESHOLDS")
print("="*80)

val_predictions = []

for target_week in VALIDATE_WEEKS:
    week_games = train_games[
        (train_games["week"] == target_week) & 
        (train_games["completed"] == 1)
    ]
    
    for _, g in week_games.iterrows():
        h_id = train_team_map.get(g.homeId)
        a_id = train_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        if pd.isna(g.homePoints) or pd.isna(g.spread): continue
        
        feats = build_features_for_game(
            g, h_id, a_id, target_week, features,
            train_rolling, train_stats, train_elo
        )
        
        X_test = pd.DataFrame([feats])
        pred_margin = model.predict(X_test[train_features])[0]
        pred_spread = -pred_margin
        pred_prob = 1 / (1 + np.exp(-pred_margin / 14))
        
        actual_margin = g.homePoints - g.awayPoints
        beat_spread = 1 if actual_margin > g.spread else 0
        
        val_predictions.append({
            "spread_diff": pred_spread - g.spread,
            "prob_diff": pred_prob - feats["vegas_home_prob"],
            "beat_spread": beat_spread
        })

val_df = pd.DataFrame(val_predictions)

print(f"✓ Generated {len(val_df)} validation predictions")

# Find optimal thresholds by testing all combinations
print("\n🔍 Testing threshold combinations...")

best_roi = -100
best_thresholds = None

for spread_thresh in [5, 7, 9, 11]:
    for prob_thresh in [0.03, 0.05, 0.08, 0.10, 0.15]:
        # Test Tier 1: Favorites only
        tier1 = val_df[
            (val_df["spread_diff"].abs() >= spread_thresh) &
            (val_df["prob_diff"].abs() < prob_thresh) &
            (val_df["spread_diff"] < 0)  # Favorites
        ]
        
        if len(tier1) >= 5:  # Need minimum sample
            wins = tier1["beat_spread"].sum()
            total = len(tier1)
            roi = ((wins * 100) - ((total - wins) * 110)) / (total * 110) * 100
            win_pct = wins / total
            
            if roi > best_roi and win_pct > 0.70:  # Must be profitable + accurate
                best_roi = roi
                best_thresholds = (spread_thresh, prob_thresh, total, win_pct)

if best_thresholds:
    s_thresh, p_thresh, games, win_pct = best_thresholds
    print(f"\n✅ OPTIMAL THRESHOLDS FOUND:")
    print(f"   Spread disagreement: ≥{s_thresh} points")
    print(f"   Prob disagreement: <{p_thresh}")
    print(f"   Favorites only: Yes")
    print(f"   Validation: {games} games, {win_pct*100:.1f}% win rate, {best_roi:.1f}% ROI")
else:
    print("\n⚠️  No profitable thresholds found on validation set")
    s_thresh, p_thresh = 7, 0.05  # Use defaults

# ============================================================================
# PHASE 3: TEST ON 2025 WEEKS 4-12
# ============================================================================
print("\n" + "="*80)
print("PHASE 3: FINAL TEST ON 2025")
print("="*80)

test_stats, test_games, test_fbs = load_year_data(TEST_YEAR)
test_team_map = build_team_mapping(test_stats, test_games)
test_elo = compute_elo(test_games, test_team_map)
test_rolling = compute_rolling_stats(test_stats, features)

print(f"✓ Loaded {len(test_games)} games from {TEST_YEAR}")

test_predictions = []

for target_week in TEST_WEEKS:
    week_games = test_games[test_games["week"] == target_week].copy()
    
    for _, g in week_games.iterrows():
        h_id = test_team_map.get(g.homeId)
        a_id = test_team_map.get(g.awayId)
        if not h_id or not a_id: continue
        
        feats = build_features_for_game(
            g, h_id, a_id, target_week, features,
            test_rolling, test_stats, test_elo
        )
        
        X_test = pd.DataFrame([feats])
        pred_margin = model.predict(X_test[train_features])[0]
        pred_spread = -pred_margin
        pred_prob = 1 / (1 + np.exp(-pred_margin / 14))
        
        spread_diff = pred_spread - feats["vegas_spread"]
        prob_diff = pred_prob - feats["vegas_home_prob"]
        
        # Apply learned thresholds
        is_tier1 = (
            abs(spread_diff) >= s_thresh and
            abs(prob_diff) < p_thresh and
            spread_diff < 0  # Favorites only
        )
        
        actual_margin = None
        beat_spread = None
        
        if pd.notna(g.homePoints) and pd.notna(g.spread):
            actual_margin = g.homePoints - g.awayPoints
            beat_spread = 1 if actual_margin > g.spread else 0
        
        test_predictions.append({
            "game_id": int(g.id),
            "week": target_week,
            "pred_spread": round(pred_spread, 1),
            "vegas_spread": round(feats["vegas_spread"], 1),
            "spread_diff": round(spread_diff, 1),
            "prob_diff": round(prob_diff, 3),
            "is_tier1": is_tier1,
            "actual_margin": round(actual_margin, 1) if actual_margin else None,
            "beat_spread": beat_spread
        })

test_df = pd.DataFrame(test_predictions)
completed = test_df[test_df["beat_spread"].notna()]
tier1_tests = completed[completed["is_tier1"]]

print(f"\n📊 TEST RESULTS:")
print(f"   Total games: {len(completed)}")
print(f"   Tier 1 opportunities: {len(tier1_tests)}")

if len(tier1_tests) > 0:
    t1_wins = tier1_tests["beat_spread"].sum()
    t1_pct = t1_wins / len(tier1_tests) * 100
    t1_roi = ((t1_wins * 100) - ((len(tier1_tests) - t1_wins) * 110)) / (len(tier1_tests) * 110) * 100
    
    print(f"   Tier 1 win rate: {t1_wins}/{len(tier1_tests)} ({t1_pct:.1f}%)")
    print(f"   Tier 1 ROI: {t1_roi:.1f}%")
    
    if t1_pct >= 70:
        print(f"\n✅ MODEL VALIDATED - Edge confirmed on unseen 2025 data!")
    else:
        print(f"\n⚠️  Model did not validate - Possible overfitting")
else:
    print(f"\n⚠️  No Tier 1 opportunities found in test set")

print("\n" + "="*80)
print("VALIDATION COMPLETE")
print("="*80)

conn.close()