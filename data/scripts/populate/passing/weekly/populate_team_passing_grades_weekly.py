import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("TEAM PASSING GRADES AGGREGATION - CLEANED VERSION")
print("=" * 80)

# ============================================================================
# CONFIGURATION - Columns to exclude from aggregation
# ============================================================================
EXCLUDE_COLUMNS = [
    'playerId',           # Player identifier (not aggregated)
    'player_id_PFF',      # PFF player ID (not aggregated)
    'player',             # Player name (not aggregated)
    'team'                # Team name (not aggregated, we have teamID)
]

# ============================================================================
# STEP 1: Load data with proper filtering
# ============================================================================
print("\n[STEP 1] Loading player-level passing data...")

query = """
    SELECT *
    FROM Players_PassingGrades_Weekly
    WHERE playerId IS NOT NULL 
      AND playerId > 0
    ORDER BY year, seasonType, week, teamID, playerId
"""

df = pd.read_sql_query(query, conn)
print(f"  ✓ Loaded {len(df)} player-week records")
print(f"  ✓ Years: {sorted(df['year'].unique())}")
print(f"  ✓ Teams: {df['teamID'].nunique()}")

# ============================================================================
# STEP 2: Remove duplicates
# ============================================================================
print("\n[STEP 2] Removing duplicate records...")

initial_count = len(df)
df = df.drop_duplicates(subset=['playerId', 'teamID', 'year', 'week', 'seasonType'])
duplicate_count = initial_count - len(df)

print(f"  ✓ Removed {duplicate_count} duplicate records")
print(f"  ✓ Clean dataset: {len(df)} records")

# ============================================================================
# STEP 3: Remove excluded columns
# ============================================================================
print("\n[STEP 3] Removing non-aggregatable columns...")

cols_to_drop = [col for col in EXCLUDE_COLUMNS if col in df.columns]
df = df.drop(columns=cols_to_drop)

print(f"  ✓ Dropped columns: {cols_to_drop}")
print(f"  ✓ Remaining columns: {len(df.columns)}")

# ============================================================================
# STEP 4: Prepare weighted averages
# ============================================================================
print("\n[STEP 4] Creating weighted columns for averages...")

# Identify columns to weight
# For passing: weight by attempts (most metrics) or passing_snaps (snap-based metrics)

attempt_weighted_cols = [
    'accuracy_percent',
    'avg_depth_of_target', 
    'avg_time_to_throw',
    'btt_rate',
    'completion_percent',
    'drop_rate',
    'grades_hands_fumble',
    'grades_offense',
    'grades_pass',
    'qb_rating'
]

snap_weighted_cols = [
    'grades_run',
    'pressure_to_sack_rate',
    'sack_percent',
    'thrown_aways',
    'twp_rate'
]

# Create weighted columns for attempt-based metrics
for col in attempt_weighted_cols:
    if col in df.columns and 'attempts' in df.columns:
        df[f'{col}_weighted'] = df[col] * df['attempts']

# Create weighted columns for snap-based metrics
for col in snap_weighted_cols:
    if col in df.columns and 'passing_snaps' in df.columns:
        df[f'{col}_weighted'] = df[col] * df['passing_snaps']

print(f"  ✓ Created {len(attempt_weighted_cols)} attempt-weighted columns")
print(f"  ✓ Created {len(snap_weighted_cols)} snap-weighted columns")

# ============================================================================
# STEP 5: Define aggregation logic
# ============================================================================
print("\n[STEP 5] Defining aggregation logic...")

groupby_cols = ['year', 'week', 'seasonType', 'teamID']

# Build aggregation dictionary
agg_dict = {}

for col in df.columns:
    if col in groupby_cols:
        continue
    
    # Snap counts: use max (represents actual play count, not sum across 11 players)
    if 'snap' in col.lower() and '_weighted' not in col:
        agg_dict[col] = 'max'
    
    # Weighted columns: sum them
    elif '_weighted' in col:
        agg_dict[col] = 'sum'
    
    # Everything else: sum
    else:
        agg_dict[col] = 'sum'

print(f"  ✓ Aggregation rules defined for {len(agg_dict)} columns")

# ============================================================================
# STEP 6: Aggregate to team level
# ============================================================================
print("\n[STEP 6] Aggregating to team level...")

team_df = df.groupby(groupby_cols).agg(agg_dict).reset_index()

print(f"  ✓ Aggregated to {len(team_df)} team-week records")

# ============================================================================
# STEP 7: Calculate weighted averages
# ============================================================================
print("\n[STEP 7] Calculating weighted averages...")

# For attempt-weighted metrics
for col in attempt_weighted_cols:
    weighted_col = f'{col}_weighted'
    if weighted_col in team_df.columns and 'attempts' in team_df.columns:
        team_df[col] = team_df[weighted_col] / team_df['attempts'].replace(0, 1)
        team_df = team_df.drop(columns=[weighted_col])

# For snap-weighted metrics  
for col in snap_weighted_cols:
    weighted_col = f'{col}_weighted'
    if weighted_col in team_df.columns and 'passing_snaps' in team_df.columns:
        team_df[col] = team_df[weighted_col] / team_df['passing_snaps'].replace(0, 1)
        team_df = team_df.drop(columns=[weighted_col])

print(f"  ✓ Calculated weighted averages")
print(f"  ✓ Final columns: {len(team_df.columns)}")

# ============================================================================
# STEP 8: Replace snap counts with max values
# ============================================================================
print("\n[STEP 8] Fixing snap counts to use max values...")

snap_columns = [col for col in df.columns if 'snap' in col.lower()]

for snap_col in snap_columns:
    if snap_col in df.columns:
        max_snaps = df.groupby(groupby_cols)[snap_col].max()
        team_df[snap_col] = team_df[groupby_cols].apply(
            lambda row: max_snaps.get(tuple(row), 0), axis=1
        )

print(f"  ✓ Updated {len(snap_columns)} snap count columns to use max values")

# ============================================================================
# STEP 9: Save to database
# ============================================================================
print("\n[STEP 9] Saving to database...")

team_df.to_sql('Team_PassingGrades_Weekly', conn, if_exists='replace', index=False)

print(f"  ✓ Saved to Team_PassingGrades_Weekly table")

# ============================================================================
# STEP 10: Verification
# ============================================================================
print("\n[STEP 10] Verification...")

verification = pd.read_sql_query("""
    SELECT year, COUNT(*) as records, COUNT(DISTINCT teamID) as teams
    FROM Team_PassingGrades_Weekly
    GROUP BY year
    ORDER BY year
""", conn)

print("\n  Summary by year:")
print(verification.to_string(index=False))

# Sample data check
sample = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID, attempts, completions, yards, touchdowns, 
           grades_pass, qb_rating, passing_snaps
    FROM Team_PassingGrades_Weekly
    WHERE year = 2024 AND week = 1
    ORDER BY yards DESC
    LIMIT 5
""", conn)

print("\n  Sample (Top 5 passing teams, 2024 Week 1):")
print(sample.to_string(index=False))

conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)