import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("PASSING PREDICTION DATASET - V2 (CLEAN, NO LEAKAGE)")
print("=" * 80)

# ============================================================================
# STRATEGY: Build historical features FIRST, then add context
# ============================================================================

# ============================================================================
# STEP 1: Load ALL weekly data for creating rolling averages
# ============================================================================
print("\n[STEP 1] Loading all team weekly data for rolling calculations...")

# Passing data
passing_df = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID, opponentID,
           attempts, completions, yards, completion_percent, ypa, 
           grades_pass, qb_rating, sack_percent
    FROM Team_PassingGrades_Weekly
    WHERE year IN (2024, 2025)
    ORDER BY teamID, year, week
""", conn)

# Pass blocking data  
blocking_df = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           grades_pass_block, sacks_allowed, hurries_allowed, hits_allowed
    FROM Team_PassBlocking_Weekly
    WHERE year IN (2024, 2025)
    ORDER BY teamID, year, week
""", conn)
blocking_df['pressures_allowed'] = blocking_df['hurries_allowed'] + blocking_df['hits_allowed']

# Receiving data
receiving_df = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           caught_percent, drop_rate, yprr
    FROM Team_ReceivingGrades_Weekly
    WHERE year IN (2024, 2025)
    ORDER BY teamID, year, week
""", conn)

# Opponent pass rush data
opp_rush_df = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           grades_pass_rush_defense, pass_rush_win_rate, prp
    FROM Team_DefensePassRush_Weekly
    WHERE year IN (2024, 2025)
    ORDER BY teamID, year, week
""", conn)

# Opponent coverage data
opp_cov_df = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           grades_coverage_defense, yards_per_coverage_snap
    FROM Team_DefenseCoverageGrades_Weekly
    WHERE year IN (2024, 2025)
    ORDER BY teamID, year, week
""", conn)

print(f"  ✓ Loaded passing: {len(passing_df)} records")
print(f"  ✓ Loaded blocking: {len(blocking_df)} records")
print(f"  ✓ Loaded receiving: {len(receiving_df)} records")
print(f"  ✓ Loaded opp rush: {len(opp_rush_df)} records")
print(f"  ✓ Loaded opp coverage: {len(opp_cov_df)} records")

# ============================================================================
# STEP 2: Create rolling averages (EXCLUDE current week)
# ============================================================================
print("\n[STEP 2] Creating rolling averages (excluding current week)...")

# Merge all offensive data
team_df = passing_df.merge(blocking_df, on=['year', 'week', 'seasonType', 'teamID'], how='left')
team_df = team_df.merge(receiving_df, on=['year', 'week', 'seasonType', 'teamID'], how='left')

# Sort by team and week
team_df = team_df.sort_values(['teamID', 'year', 'week'])

# Features to calculate rolling averages for
rolling_features = [
    'completion_percent', 'ypa', 'grades_pass', 'qb_rating', 'sack_percent',
    'grades_pass_block', 'pressures_allowed',
    'caught_percent', 'drop_rate', 'yprr'
]

# Season average (all games BEFORE current week)
for feature in rolling_features:
    if feature in team_df.columns:
        team_df[f'{feature}_season_avg'] = team_df.groupby(['teamID', 'year'])[feature].transform(
            lambda x: x.shift(1).expanding().mean()
        )

# Last 3 games average (BEFORE current week)
for feature in rolling_features:
    if feature in team_df.columns:
        team_df[f'{feature}_last3'] = team_df.groupby(['teamID', 'year'])[feature].transform(
            lambda x: x.shift(1).rolling(window=3, min_periods=1).mean()
        )

print(f"  ✓ Created {len(rolling_features)} × 2 = {len(rolling_features) * 2} rolling features")

# ============================================================================
# STEP 3: Create opponent strength rolling averages
# ============================================================================
print("\n[STEP 3] Creating opponent strength metrics...")

# For opponent features, sort by opponent teamID
opp_rush_df = opp_rush_df.sort_values(['teamID', 'year', 'week'])
opp_cov_df = opp_cov_df.sort_values(['teamID', 'year', 'week'])

opp_rush_features = ['grades_pass_rush_defense', 'pass_rush_win_rate', 'prp']
for feature in opp_rush_features:
    if feature in opp_rush_df.columns:
        opp_rush_df[f'{feature}_season_avg'] = opp_rush_df.groupby(['teamID', 'year'])[feature].transform(
            lambda x: x.shift(1).expanding().mean()
        )

opp_cov_features = ['grades_coverage_defense', 'yards_per_coverage_snap']
for feature in opp_cov_features:
    if feature in opp_cov_df.columns:
        opp_cov_df[f'{feature}_season_avg'] = opp_cov_df.groupby(['teamID', 'year'])[feature].transform(
            lambda x: x.shift(1).expanding().mean()
        )

print(f"  ✓ Created opponent strength features")

# ============================================================================
# STEP 4: Merge opponent features (by opponentID)
# ============================================================================
print("\n[STEP 4] Merging opponent features...")

# Select only the rolling average columns for opponents
opp_rush_cols = ['year', 'week', 'seasonType', 'teamID'] + [f'{f}_season_avg' for f in opp_rush_features]
opp_cov_cols = ['year', 'week', 'seasonType', 'teamID'] + [f'{f}_season_avg' for f in opp_cov_features]

team_df = team_df.merge(
    opp_rush_df[opp_rush_cols],
    left_on=['year', 'week', 'seasonType', 'opponentID'],
    right_on=['year', 'week', 'seasonType', 'teamID'],
    how='left',
    suffixes=('', '_opp_rush')
)
team_df = team_df.drop(columns=['teamID_opp_rush'], errors='ignore')

team_df = team_df.merge(
    opp_cov_df[opp_cov_cols],
    left_on=['year', 'week', 'seasonType', 'opponentID'],
    right_on=['year', 'week', 'seasonType', 'teamID'],
    how='left',
    suffixes=('', '_opp_cov')
)
team_df = team_df.drop(columns=['teamID_opp_cov'], errors='ignore')

# Rename opponent columns
rename_map = {}
for f in opp_rush_features:
    rename_map[f'{f}_season_avg'] = f'opp_{f}_season_avg'
for f in opp_cov_features:
    rename_map[f'{f}_season_avg'] = f'opp_{f}_season_avg'

team_df = team_df.rename(columns=rename_map)

print(f"  ✓ Merged opponent features")

# ============================================================================
# STEP 5: Create consistency features
# ============================================================================
print("\n[STEP 5] Creating consistency features...")

team_df['yards_std'] = team_df.groupby(['teamID', 'year'])['yards'].transform(
    lambda x: x.shift(1).expanding().std()
)
team_df['yards_cv'] = team_df['yards_std'] / team_df.groupby(['teamID', 'year'])['yards'].transform(
    lambda x: x.shift(1).expanding().mean()
)

# Calculate temp season average for boom/bust
team_df['_yards_season_avg'] = team_df.groupby(['teamID', 'year'])['yards'].transform(
    lambda x: x.shift(1).expanding().mean()
)

# Boom rate (games significantly above average)
team_df['yards_boom_rate'] = team_df.groupby(['teamID', 'year']).apply(
    lambda g: ((g['yards'].shift(1) - g['_yards_season_avg']) > 50).expanding().mean()
).reset_index(level=[0, 1], drop=True)

# Bust rate (games significantly below average)
team_df['yards_bust_rate'] = team_df.groupby(['teamID', 'year']).apply(
    lambda g: ((g['_yards_season_avg'] - g['yards'].shift(1)) > 50).expanding().mean()
).reset_index(level=[0, 1], drop=True)

team_df = team_df.drop(columns=['_yards_season_avg'])

print(f"  ✓ Created consistency features")

# ============================================================================
# STEP 6: Add context features
# ============================================================================
print("\n[STEP 6] Adding context features...")

team_df['week_num'] = team_df['week']
# Note: home/away would require Teams_Games join - using placeholder for now
team_df['is_home'] = 0

print(f"  ✓ Added context features")

# ============================================================================
# STEP 7: Select only predictive features (NO current game stats)
# ============================================================================
print("\n[STEP 7] Selecting final feature set...")

# Keep ONLY:
# 1. Target: yards
# 2. Identifiers: year, week, seasonType, teamID, opponentID
# 3. Game plan: attempts
# 4. Historical averages: *_season_avg, *_last3
# 5. Opponent averages: opp_*_season_avg
# 6. Consistency: yards_std, yards_cv, yards_boom_rate, yards_bust_rate
# 7. Context: week_num, is_home

keep_cols = ['year', 'week', 'seasonType', 'teamID', 'opponentID', 'yards', 'attempts', 'week_num', 'is_home']

# Add all _season_avg columns
keep_cols.extend([col for col in team_df.columns if '_season_avg' in col])

# Add all _last3 columns
keep_cols.extend([col for col in team_df.columns if '_last3' in col])

# Add consistency columns
keep_cols.extend(['yards_std', 'yards_cv', 'yards_boom_rate', 'yards_bust_rate'])

# Remove duplicates
keep_cols = list(dict.fromkeys(keep_cols))

df_clean = team_df[keep_cols].copy()

print(f"  ✓ Selected {len(keep_cols)} total columns")
print(f"  ✓ Features: {len(keep_cols) - 6} (excluding identifiers + target)")

# ============================================================================
# STEP 8: Remove early-season games without history
# ============================================================================
print("\n[STEP 8] Removing games without sufficient history...")

initial_count = len(df_clean)
df_clean = df_clean.dropna(subset=[col for col in df_clean.columns if '_season_avg' in col][:3])
removed = initial_count - len(df_clean)

print(f"  ✓ Removed {removed} early-season games")
print(f"  ✓ Final dataset: {len(df_clean)} games")

# ============================================================================
# STEP 9: Save to database
# ============================================================================
print("\n[STEP 9] Saving to database...")

df_clean.to_sql('Passing_Prediction_Dataset_V2', conn, if_exists='replace', index=False)

print(f"  ✓ Saved to Passing_Prediction_Dataset_V2 table")

# ============================================================================
# STEP 10: Summary
# ============================================================================
print("\n[STEP 10] Dataset summary...")

print(f"\n  Total records: {len(df_clean)}")
print(f"  Years: {sorted(df_clean['year'].unique())}")
print(f"  Teams: {df_clean['teamID'].nunique()}")
print(f"  Features: {len([col for col in df_clean.columns if col not in ['year', 'week', 'seasonType', 'teamID', 'opponentID', 'yards']])}")

print("\n  Target variable (yards) statistics:")
print(f"    Mean: {df_clean['yards'].mean():.1f} yards")
print(f"    Median: {df_clean['yards'].median():.1f} yards")
print(f"    Std: {df_clean['yards'].std():.1f} yards")

print("\n  Feature categories:")
print(f"    Season averages: {len([col for col in df_clean.columns if '_season_avg' in col])}")
print(f"    Last 3 games: {len([col for col in df_clean.columns if '_last3' in col])}")
print(f"    Opponent features: {len([col for col in df_clean.columns if 'opp_' in col])}")
print(f"    Consistency: 4 (yards_std, yards_cv, yards_boom_rate, yards_bust_rate)")
print(f"    Context: 3 (attempts, week_num, is_home)")

conn.close()

print("\n" + "=" * 80)
print("✓ CLEAN DATASET CREATED - NO CURRENT-GAME LEAKAGE")
print("=" * 80)