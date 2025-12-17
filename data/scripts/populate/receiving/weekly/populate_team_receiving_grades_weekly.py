import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("TEAM RECEIVING GRADES AGGREGATION - FIXED VERSION")
print("=" * 80)

# ============================================================================
# CONFIGURATION
# ============================================================================
EXCLUDE_COLUMNS = ['playerId', 'player_id_PFF', 'player', 'team']

# ============================================================================
# STEP 1: Load data
# ============================================================================
print("\n[STEP 1] Loading player-level receiving data...")

query = """
    SELECT *
    FROM Players_ReceivingGrades_Weekly
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
# STEP 4: Weight ONLY grades (not rates/percentages)
# ============================================================================
print("\n[STEP 4] Creating weighted grade columns...")

# Identify what we need to weight and by what
weighting_config = {
    # Grade columns weighted by routes
    'routes': ['grades_offense', 'grades_pass_route'],
    # Grade columns weighted by targets
    'targets': ['grades_hands_drop', 'avg_depth_of_target', 'targeted_qb_rating'],
    # Grade columns weighted by receptions
    'receptions': ['grades_hands_fumble']
}

weighted_count = 0
for weight_col, grade_cols in weighting_config.items():
    if weight_col in df.columns:
        for grade_col in grade_cols:
            # Check both base and adjusted versions for grades
            if 'grades_' in grade_col:
                for col_variant in [grade_col, f'{grade_col}_adjusted']:
                    if col_variant in df.columns:
                        df[f'{col_variant}_weighted'] = df[col_variant] * df[weight_col]
                        weighted_count += 1
                        print(f"  Created {col_variant}_weighted (by {weight_col})")
            # For non-grade columns (avg_depth_of_target, targeted_qb_rating), just weight the base
            elif grade_col in df.columns:
                df[f'{grade_col}_weighted'] = df[grade_col] * df[weight_col]
                weighted_count += 1
                print(f"  Created {grade_col}_weighted (by {weight_col})")

print(f"  ✓ Created {weighted_count} weighted columns")

# ============================================================================
# STEP 5: Aggregate
# ============================================================================
print("\n[STEP 5] Aggregating to team level...")

groupby_cols = ['year', 'week', 'seasonType', 'teamID']

# Build aggregation dictionary
agg_dict = {}

# These rate columns should NOT be aggregated - we'll calculate them fresh from counts
skip_columns = [
    'route_rate', 'contested_catch_rate', 'caught_percent', 'drop_rate',
    'slot_rate', 'wide_rate', 'inline_rate', 'pass_block_rate',
    'yards_per_reception', 'yards_after_catch_per_reception', 'yprr'
]

for col in df.columns:
    if col in groupby_cols:
        continue
    elif col in skip_columns:
        continue  # Skip - will calculate from counts later
    elif col == 'longest':
        agg_dict[col] = 'max'
    elif col == 'pass_plays':
        agg_dict[col] = 'max'  # Actual number of plays, not sum across players
    else:
        agg_dict[col] = 'sum'  # Sum everything else

team_df = df.groupby(groupby_cols).agg(agg_dict).reset_index()
print(f"  ✓ Aggregated to {len(team_df)} team-week records")
print(f"  ✓ Skipped {len(skip_columns)} rate columns (will calculate from counts)")

# ============================================================================
# STEP 6: Calculate weighted averages
# ============================================================================
print("\n[STEP 6] Calculating weighted averages...")

for weight_col, grade_cols in weighting_config.items():
    for grade_col in grade_cols:
        # Handle grades with adjusted versions
        if 'grades_' in grade_col:
            for col_variant in [grade_col, f'{grade_col}_adjusted']:
                weighted_col = f'{col_variant}_weighted'
                if weighted_col in team_df.columns and weight_col in team_df.columns:
                    team_df[col_variant] = team_df[weighted_col] / team_df[weight_col].replace(0, 1)
                    team_df = team_df.drop(columns=[weighted_col])
                    print(f"  Calculated: {col_variant}")
        # Handle non-grade columns (avg_depth_of_target, targeted_qb_rating)
        else:
            weighted_col = f'{grade_col}_weighted'
            if weighted_col in team_df.columns and weight_col in team_df.columns:
                team_df[grade_col] = team_df[weighted_col] / team_df[weight_col].replace(0, 1)
                team_df = team_df.drop(columns=[weighted_col])
                print(f"  Calculated: {grade_col}")

print(f"  ✓ Calculated weighted averages")

# ============================================================================
# STEP 7: Recalculate rates/percentages from counts
# ============================================================================
print("\n[STEP 7] Recalculating rates and percentages from counts...")

# IMPORTANT: These must be calculated from counts, not weighted averages

# caught_percent = receptions / targets
if 'receptions' in team_df.columns and 'targets' in team_df.columns:
    team_df['caught_percent'] = (team_df['receptions'] / team_df['targets'].replace(0, 1)) * 100
    print("  Recalculated: caught_percent")

# drop_rate = drops / targets
if 'drops' in team_df.columns and 'targets' in team_df.columns:
    team_df['drop_rate'] = (team_df['drops'] / team_df['targets'].replace(0, 1)) * 100
    print("  Recalculated: drop_rate")

# contested_catch_rate = contested_receptions / contested_targets
# (Note: might be named contested_catches in some data)
if 'contested_receptions' in team_df.columns and 'contested_targets' in team_df.columns:
    team_df['contested_catch_rate'] = (team_df['contested_receptions'] / team_df['contested_targets'].replace(0, 1)) * 100
    print("  Recalculated: contested_catch_rate (from contested_receptions)")
elif 'contested_catches' in team_df.columns and 'contested_targets' in team_df.columns:
    team_df['contested_catch_rate'] = (team_df['contested_catches'] / team_df['contested_targets'].replace(0, 1)) * 100
    print("  Recalculated: contested_catch_rate (from contested_catches)")

# route_rate = routes / pass_plays
if 'routes' in team_df.columns and 'pass_plays' in team_df.columns:
    team_df['route_rate'] = (team_df['routes'] / team_df['pass_plays'].replace(0, 1)) * 100
    print("  Recalculated: route_rate")

# slot_rate = slot_snaps / routes
if 'slot_snaps' in team_df.columns and 'routes' in team_df.columns:
    team_df['slot_rate'] = (team_df['slot_snaps'] / team_df['routes'].replace(0, 1)) * 100
    print("  Recalculated: slot_rate")

# wide_rate = wide_snaps / routes
if 'wide_snaps' in team_df.columns and 'routes' in team_df.columns:
    team_df['wide_rate'] = (team_df['wide_snaps'] / team_df['routes'].replace(0, 1)) * 100
    print("  Recalculated: wide_rate")

# inline_rate = inline_snaps / routes
if 'inline_snaps' in team_df.columns and 'routes' in team_df.columns:
    team_df['inline_rate'] = (team_df['inline_snaps'] / team_df['routes'].replace(0, 1)) * 100
    print("  Recalculated: inline_rate")

# pass_block_rate = pass_blocks / pass_plays (or pass_block_snaps / pass_plays)
if 'pass_blocks' in team_df.columns and 'pass_plays' in team_df.columns:
    team_df['pass_block_rate'] = (team_df['pass_blocks'] / team_df['pass_plays'].replace(0, 1)) * 100
    print("  Recalculated: pass_block_rate")

# yards_per_reception = yards / receptions
if 'yards' in team_df.columns and 'receptions' in team_df.columns:
    team_df['yards_per_reception'] = team_df['yards'] / team_df['receptions'].replace(0, 1)
    print("  Recalculated: yards_per_reception")

# yards_after_catch_per_reception = yards_after_catch / receptions
if 'yards_after_catch' in team_df.columns and 'receptions' in team_df.columns:
    team_df['yards_after_catch_per_reception'] = team_df['yards_after_catch'] / team_df['receptions'].replace(0, 1)
    print("  Recalculated: yards_after_catch_per_reception")

# yprr (yards per route run) = yards / routes
if 'yards' in team_df.columns and 'routes' in team_df.columns:
    team_df['yprr'] = team_df['yards'] / team_df['routes'].replace(0, 1)
    print("  Recalculated: yprr")

print("  ✓ Rates/percentages recalculated from counts")

# ============================================================================
# STEP 8: Save to database
# ============================================================================
print("\n[STEP 8] Saving to database...")

team_df.to_sql('Team_ReceivingGrades_Weekly', conn, if_exists='replace', index=False)
print(f"  ✓ Saved to Team_ReceivingGrades_Weekly table")

# ============================================================================
# STEP 9: Verification
# ============================================================================
print("\n[STEP 9] Verification...")

verification = pd.read_sql_query("""
    SELECT year, COUNT(*) as records, COUNT(DISTINCT teamID) as teams
    FROM Team_ReceivingGrades_Weekly
    GROUP BY year
    ORDER BY year
""", conn)

print("\n  Summary by year:")
print(verification.to_string(index=False))

# Sample data check
sample = pd.read_sql_query("""
    SELECT year, week, teamID, 
           receptions, targets, yards, touchdowns,
           grades_offense, caught_percent, drop_rate,
           routes
    FROM Team_ReceivingGrades_Weekly
    WHERE year = 2024 AND week = 1
    ORDER BY yards DESC
    LIMIT 5
""", conn)

print("\n  Sample (Top 5 receiving yards teams, 2024 Week 1):")
print(sample.to_string(index=False))

conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)