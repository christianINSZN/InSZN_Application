import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("TEAM DEFENSE PASS RUSH AGGREGATION - FIXED VERSION")
print("=" * 80)

# ============================================================================
# CONFIGURATION
# ============================================================================
EXCLUDE_COLUMNS = ['playerId', 'player_id_PFF', 'player', 'team']

# ============================================================================
# STEP 1: Load data
# ============================================================================
print("\n[STEP 1] Loading player-level pass rush data...")

query = """
    SELECT *
    FROM Players_DefensePassRush_Weekly
    WHERE playerId IS NOT NULL AND playerId > 0
    ORDER BY year, seasonType, week, teamID, playerId
"""

df = pd.read_sql_query(query, conn)
print(f"  ✓ Loaded {len(df)} player-week records")

# ============================================================================
# STEP 2: Remove duplicates
# ============================================================================
print("\n[STEP 2] Removing duplicate records...")

initial_count = len(df)
df = df.drop_duplicates(subset=['playerId', 'teamID', 'year', 'week', 'seasonType'])
print(f"  ✓ Removed {initial_count - len(df)} duplicates")

# ============================================================================
# STEP 3: Remove excluded columns
# ============================================================================
print("\n[STEP 3] Removing non-aggregatable columns...")

cols_to_drop = [col for col in EXCLUDE_COLUMNS if col in df.columns]
df = df.drop(columns=cols_to_drop)
print(f"  ✓ Dropped: {cols_to_drop}")

# ============================================================================
# STEP 4: Weight ONLY grades (not percentages/rates)
# ============================================================================
print("\n[STEP 4] Creating weighted grade columns...")

# Only weight grade columns
grade_cols = [col for col in df.columns if 'grades_' in col]

for col in grade_cols:
    if 'true_pass_set' in col and 'true_pass_set_snap_counts_pass_rush' in df.columns:
        df[f'{col}_weighted'] = df[col] * df['true_pass_set_snap_counts_pass_rush']
        print(f"  Created {col}_weighted (true_pass_set)")
    elif 'true_pass_set' not in col and 'snap_counts_pass_rush' in df.columns:
        df[f'{col}_weighted'] = df[col] * df['snap_counts_pass_rush']
        print(f"  Created {col}_weighted")

print(f"  ✓ Created {len(grade_cols)} weighted grade columns")

# ============================================================================
# STEP 5: Aggregate
# ============================================================================
print("\n[STEP 5] Aggregating to team level...")

groupby_cols = ['year', 'week', 'seasonType', 'teamID']

# Build aggregation dictionary
agg_dict = {}
for col in df.columns:
    if col in groupby_cols:
        continue
    agg_dict[col] = 'sum'  # Sum everything (counts, snaps, weighted grades)

team_df = df.groupby(groupby_cols).agg(agg_dict).reset_index()
print(f"  ✓ Aggregated to {len(team_df)} team-week records")

# ============================================================================
# STEP 6: Calculate weighted grade averages
# ============================================================================
print("\n[STEP 6] Calculating weighted grade averages...")

for col in grade_cols:
    weighted_col = f'{col}_weighted'
    
    if 'true_pass_set' in col:
        snap_col = 'true_pass_set_snap_counts_pass_rush'
    else:
        snap_col = 'snap_counts_pass_rush'
    
    if weighted_col in team_df.columns and snap_col in team_df.columns:
        team_df[col] = team_df[weighted_col] / team_df[snap_col].replace(0, 1)
        team_df = team_df.drop(columns=[weighted_col])
        print(f"  Calculated: {col}")

print(f"  ✓ Calculated {len(grade_cols)} weighted averages")

# ============================================================================
# STEP 7: Recalculate percentages/rates from counts
# ============================================================================
print("\n[STEP 7] Recalculating percentages and rates from counts...")

# pass_rush_percent = pass_rush_wins / snap_counts_pass_rush
if 'pass_rush_wins' in team_df.columns and 'snap_counts_pass_rush' in team_df.columns:
    team_df['pass_rush_percent'] = (team_df['pass_rush_wins'] / team_df['snap_counts_pass_rush'].replace(0, 1)) * 100
    print("  Recalculated: pass_rush_percent")

# pass_rush_win_rate = pass_rush_wins / pass_rush_opp
if 'pass_rush_wins' in team_df.columns and 'pass_rush_opp' in team_df.columns:
    team_df['pass_rush_win_rate'] = (team_df['pass_rush_wins'] / team_df['pass_rush_opp'].replace(0, 1)) * 100
    print("  Recalculated: pass_rush_win_rate")

# prp = total_pressures / snap_counts_pass_rush
if 'total_pressures' in team_df.columns and 'snap_counts_pass_rush' in team_df.columns:
    team_df['prp'] = (team_df['total_pressures'] / team_df['snap_counts_pass_rush'].replace(0, 1)) * 100
    print("  Recalculated: prp")

# True pass set versions
if 'true_pass_set_pass_rush_wins' in team_df.columns and 'true_pass_set_snap_counts_pass_rush' in team_df.columns:
    team_df['true_pass_set_pass_rush_percent'] = (team_df['true_pass_set_pass_rush_wins'] / team_df['true_pass_set_snap_counts_pass_rush'].replace(0, 1)) * 100
    print("  Recalculated: true_pass_set_pass_rush_percent")

if 'true_pass_set_pass_rush_wins' in team_df.columns and 'true_pass_set_pass_rush_opp' in team_df.columns:
    team_df['true_pass_set_pass_rush_win_rate'] = (team_df['true_pass_set_pass_rush_wins'] / team_df['true_pass_set_pass_rush_opp'].replace(0, 1)) * 100
    print("  Recalculated: true_pass_set_pass_rush_win_rate")

if 'true_pass_set_total_pressures' in team_df.columns and 'true_pass_set_snap_counts_pass_rush' in team_df.columns:
    team_df['true_pass_set_prp'] = (team_df['true_pass_set_total_pressures'] / team_df['true_pass_set_snap_counts_pass_rush'].replace(0, 1)) * 100
    print("  Recalculated: true_pass_set_prp")

print("  ✓ Percentages/rates recalculated from counts")

# ============================================================================
# STEP 8: Save to database
# ============================================================================
print("\n[STEP 8] Saving to database...")

team_df.to_sql('Team_DefensePassRush_Weekly', conn, if_exists='replace', index=False)
print(f"  ✓ Saved to Team_DefensePassRush_Weekly table")

# ============================================================================
# STEP 9: Verification
# ============================================================================
print("\n[STEP 9] Verification...")

verification = pd.read_sql_query("""
    SELECT year, COUNT(*) as records, COUNT(DISTINCT teamID) as teams
    FROM Team_DefensePassRush_Weekly
    GROUP BY year
    ORDER BY year
""", conn)

print("\n  Summary by year:")
print(verification.to_string(index=False))

# Sample data check
sample = pd.read_sql_query("""
    SELECT year, week, teamID, 
           sacks, total_pressures,
           grades_pass_rush_defense, 
           pass_rush_percent, pass_rush_win_rate,
           snap_counts_pass_rush
    FROM Team_DefensePassRush_Weekly
    WHERE year = 2024 AND week = 1
    ORDER BY sacks DESC
    LIMIT 5
""", conn)

print("\n  Sample (Top 5 sack teams, 2024 Week 1):")
print(sample.to_string(index=False))

conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)