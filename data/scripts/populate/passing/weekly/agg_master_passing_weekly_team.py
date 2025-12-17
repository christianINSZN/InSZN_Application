import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("TEAM PASSING AGGREGATION - COMPREHENSIVE (ALL VARIANTS)")
print("=" * 80)

# ============================================================================
# STEP 1: Analyze column structure
# ============================================================================
print("\n[STEP 1] Analyzing Master_Players_Passing_Weekly columns...")

cursor.execute("PRAGMA table_info(Master_Players_Passing_Weekly)")
all_columns = [(row[1], row[2]) for row in cursor.fetchall()]

# Exclude these columns from aggregation
EXCLUDE_COLUMNS = {'playerId', 'player_id_PFF', 'year', 'week', 'seasonType', 
                   'team', 'teamID', 'opponentID'}

# Categorize columns by their aggregation method
sum_columns = []
weighted_avg_columns = []
other_columns = []

for col_name, col_type in all_columns:
    if col_name in EXCLUDE_COLUMNS:
        continue
    
    # Skip adjusted columns (already excluded from master)
    if col_name.endswith('_adjusted'):
        continue
    
    # Grades should be weighted averages
    if 'grades' in col_name:
        weighted_avg_columns.append(col_name)
    # Rate/percentage columns - skip, will recalculate
    elif any(x in col_name for x in ['_percent', '_rate', '_pct', 'accuracy', 'rating']):
        other_columns.append(col_name)
    # Average columns - weighted average
    elif col_name.startswith('avg_') or '_avg_' in col_name:
        weighted_avg_columns.append(col_name)
    # Diff columns - weighted average
    elif col_name.endswith('_diff'):
        weighted_avg_columns.append(col_name)
    # Counting stats - sum
    elif any(x in col_name for x in ['attempts', 'completions', 'yards', 'touchdowns', 
                                      'interceptions', 'sacks', 'scrambles', 'drops', 
                                      'first_downs', 'snaps', 'bats', 'spikes', 
                                      'aimed_passes', 'big_time_throws', 'turnover_worthy',
                                      'thrown_aways', 'hit_as_threw', 'def_gen_pressures',
                                      'dropbacks']):
        sum_columns.append(col_name)
    else:
        other_columns.append(col_name)

print(f"  ✓ Found {len(sum_columns)} columns to SUM")
print(f"  ✓ Found {len(weighted_avg_columns)} columns for WEIGHTED AVERAGE")
print(f"  ✓ Found {len(other_columns)} rate/percentage columns to RECALCULATE")

# Show examples
print(f"\n  Example SUM columns:")
for col in sum_columns[:10]:
    print(f"    - {col}")
if len(sum_columns) > 10:
    print(f"    ... and {len(sum_columns) - 10} more")

print(f"\n  Example WEIGHTED AVG columns:")
for col in weighted_avg_columns[:10]:
    print(f"    - {col}")
if len(weighted_avg_columns) > 10:
    print(f"    ... and {len(weighted_avg_columns) - 10} more")

# ============================================================================
# STEP 2: Determine weighting strategy
# ============================================================================
print("\n[STEP 2] Determining weighting strategy...")

# Most grades should be weighted by passing_snaps
# Time-based stats should be weighted by attempts
# Determine best weight for each column

column_weights = {}
for col in weighted_avg_columns:
    if 'grades' in col:
        # Use variant-specific snaps if available, otherwise base passing_snaps
        if col.startswith('no_screen_'):
            column_weights[col] = 'no_screen_passing_snaps'
        elif col.startswith('npa_'):
            column_weights[col] = 'npa_passing_snaps'
        elif col.startswith('pa_'):
            column_weights[col] = 'pa_passing_snaps'
        elif col.startswith('screen_'):
            column_weights[col] = 'screen_passing_snaps'
        elif 'behind_los' in col:
            column_weights[col] = col.replace('_grades_', '_passing_snaps').replace('grades_', 'passing_snaps')
        elif any(x in col for x in ['deep_', 'medium_', 'short_', 'left_', 'right_', 'center_']):
            column_weights[col] = col.replace('_grades_', '_passing_snaps').replace('grades_', 'passing_snaps')
        else:
            column_weights[col] = 'passing_snaps'
    elif 'avg_time_to_throw' in col or 'avg_depth' in col:
        # Use variant-specific attempts
        if col.startswith('no_screen_'):
            column_weights[col] = 'no_screen_attempts'
        elif col.startswith('npa_'):
            column_weights[col] = 'npa_attempts'
        elif col.startswith('pa_'):
            column_weights[col] = 'pa_attempts'
        elif col.startswith('screen_'):
            column_weights[col] = 'screen_attempts'
        elif any(x in col for x in ['behind_los', 'deep', 'medium', 'short', 'left', 'right', 'center']):
            column_weights[col] = col.replace('avg_', 'attempts').replace('_avg_', '_attempts_')
        else:
            column_weights[col] = 'attempts'
    elif '_diff' in col:
        column_weights[col] = 'attempts'
    else:
        column_weights[col] = 'attempts'

print(f"  ✓ Assigned weights for {len(column_weights)} columns")

# ============================================================================
# STEP 3: Create table
# ============================================================================
print("\n[STEP 3] Creating Master_Teams_Passing_Weekly table...")

cursor.execute("DROP TABLE IF EXISTS Master_Teams_Passing_Weekly")

# Build CREATE TABLE statement
create_parts = [
    "team TEXT NOT NULL",
    "teamID INTEGER NOT NULL",
    "year INTEGER NOT NULL",
    "week INTEGER NOT NULL",
    "seasonType TEXT NOT NULL",
    "opponentID INTEGER",
    "qb_count INTEGER"
]

# Add all sum columns
for col in sorted(sum_columns):
    create_parts.append(f"{col} REAL")

# Add all weighted avg columns
for col in sorted(weighted_avg_columns):
    create_parts.append(f"{col} REAL")

# Add rate/percentage columns (will be recalculated)
for col in sorted(other_columns):
    create_parts.append(f"{col} REAL")

create_sql = f"""
CREATE TABLE Master_Teams_Passing_Weekly (
    {', '.join(create_parts)},
    PRIMARY KEY (teamID, year, week, seasonType),
    FOREIGN KEY (teamID) REFERENCES Teams(id),
    FOREIGN KEY (opponentID) REFERENCES Teams(id)
)
"""

cursor.execute(create_sql)
print(f"  ✓ Table created with {len(create_parts)} columns")

# ============================================================================
# STEP 4: Build and execute aggregation query
# ============================================================================
print("\n[STEP 4] Building aggregation query...")

select_parts = [
    "team",
    "teamID",
    "year",
    "week",
    "seasonType",
    "MAX(opponentID) as opponentID",
    "COUNT(*) as qb_count"
]

# Add summed columns
for col in sorted(sum_columns):
    select_parts.append(f"SUM(COALESCE({col}, 0)) as {col}")

# Add weighted averages
for col in sorted(weighted_avg_columns):
    weight_col = column_weights.get(col, 'attempts')
    # Check if weight column exists in sum_columns
    if weight_col in sum_columns or weight_col in ['passing_snaps', 'attempts', 'dropbacks']:
        select_parts.append(
            f"SUM(COALESCE({col}, 0) * COALESCE({weight_col}, 0)) / "
            f"NULLIF(SUM(COALESCE({weight_col}, 0)), 0) as {col}"
        )
    else:
        # Fallback to simple average if weight column doesn't exist
        select_parts.append(f"AVG({col}) as {col}")

# Add rate columns as NULL (will recalculate)
for col in sorted(other_columns):
    select_parts.append(f"NULL as {col}")

insert_sql = f"""
INSERT INTO Master_Teams_Passing_Weekly
SELECT {', '.join(select_parts)}
FROM Master_Players_Passing_Weekly
GROUP BY team, teamID, year, week, seasonType
"""

print("  ✓ Query built")

print("\n[STEP 5] Executing aggregation...")
cursor.execute(insert_sql)
rows_inserted = cursor.rowcount
print(f"  ✓ Aggregated {rows_inserted:,} team-games")

# ============================================================================
# STEP 6: Recalculate rate/percentage stats
# ============================================================================
print("\n[STEP 6] Recalculating rate and percentage statistics...")

# Group rate columns by their base metric
rate_updates = []

# Completion percentages
for col in other_columns:
    if 'completion_percent' in col:
        # Extract prefix (e.g., 'no_screen_', 'pa_', etc.)
        prefix = col.replace('completion_percent', '')
        attempts_col = f"{prefix}attempts"
        completions_col = f"{prefix}completions"
        
        if attempts_col in sum_columns and completions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {attempts_col} > 0 THEN (CAST({completions_col} AS REAL) / {attempts_col}) * 100 ELSE NULL END"
            ))

# Accuracy percentages
for col in other_columns:
    if 'accuracy_percent' in col:
        prefix = col.replace('accuracy_percent', '')
        aimed_col = f"{prefix}aimed_passes"
        completions_col = f"{prefix}completions"
        drops_col = f"{prefix}drops"
        
        if aimed_col in sum_columns and completions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {aimed_col} > 0 THEN ((CAST({completions_col} AS REAL) - COALESCE({drops_col}, 0)) / {aimed_col}) * 100 ELSE NULL END"
            ))

# BTT rates
for col in other_columns:
    if 'btt_rate' in col:
        prefix = col.replace('btt_rate', '')
        dropbacks_col = f"{prefix}dropbacks"
        btt_col = f"{prefix}big_time_throws"
        
        if dropbacks_col in sum_columns and btt_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {dropbacks_col} > 0 THEN (CAST({btt_col} AS REAL) / {dropbacks_col}) * 100 ELSE NULL END"
            ))

# TWP rates
for col in other_columns:
    if 'twp_rate' in col:
        prefix = col.replace('twp_rate', '')
        dropbacks_col = f"{prefix}dropbacks"
        twp_col = f"{prefix}turnover_worthy_plays"
        
        if dropbacks_col in sum_columns and twp_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {dropbacks_col} > 0 THEN (CAST({twp_col} AS REAL) / {dropbacks_col}) * 100 ELSE NULL END"
            ))

# Drop rates
for col in other_columns:
    if 'drop_rate' in col:
        prefix = col.replace('drop_rate', '')
        attempts_col = f"{prefix}attempts"
        drops_col = f"{prefix}drops"
        
        if attempts_col in sum_columns and drops_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN ({attempts_col} + {drops_col}) > 0 THEN (CAST({drops_col} AS REAL) / ({attempts_col} + {drops_col})) * 100 ELSE NULL END"
            ))

# Sack percentages
for col in other_columns:
    if 'sack_percent' in col:
        prefix = col.replace('sack_percent', '')
        dropbacks_col = f"{prefix}dropbacks"
        sacks_col = f"{prefix}sacks"
        
        if dropbacks_col in sum_columns and sacks_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {dropbacks_col} > 0 THEN (CAST({sacks_col} AS REAL) / {dropbacks_col}) * 100 ELSE NULL END"
            ))

# YPA (yards per attempt)
for col in other_columns:
    if col.endswith('ypa') or col.endswith('_ypa'):
        prefix = col.replace('ypa', '').rstrip('_')
        if prefix:
            attempts_col = f"{prefix}_attempts"
            yards_col = f"{prefix}_yards"
        else:
            attempts_col = "attempts"
            yards_col = "yards"
        
        if attempts_col in sum_columns and yards_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {attempts_col} > 0 THEN CAST({yards_col} AS REAL) / {attempts_col} ELSE NULL END"
            ))

# QB Rating (NCAA formula)
for col in other_columns:
    if 'qb_rating' in col or col == 'qb_rating':
        prefix = col.replace('qb_rating', '').rstrip('_')
        if prefix:
            attempts_col = f"{prefix}_attempts"
            yards_col = f"{prefix}_yards"
            tds_col = f"{prefix}_touchdowns"
            completions_col = f"{prefix}_completions"
            ints_col = f"{prefix}_interceptions"
        else:
            attempts_col = "attempts"
            yards_col = "yards"
            tds_col = "touchdowns"
            completions_col = "completions"
            ints_col = "interceptions"
        
        if all(c in sum_columns for c in [attempts_col, yards_col, tds_col, completions_col, ints_col]):
            rate_updates.append((
                col,
                f"""CASE WHEN {attempts_col} >= 1 THEN
                    ((8.4 * {yards_col}) +
                     (330 * {tds_col}) +
                     (100 * {completions_col}) -
                     (200 * {ints_col})) / {attempts_col}
                ELSE NULL END"""
            ))

# Pressure to sack rate
for col in other_columns:
    if 'pressure_to_sack_rate' in col:
        prefix = col.replace('pressure_to_sack_rate', '')
        pressures_col = f"{prefix}def_gen_pressures"
        sacks_col = f"{prefix}sacks"
        
        if pressures_col in sum_columns and sacks_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {pressures_col} > 0 THEN (CAST({sacks_col} AS REAL) / {pressures_col}) * 100 ELSE NULL END"
            ))

# Dropbacks percent
for col in other_columns:
    if 'dropbacks_percent' in col:
        prefix = col.replace('dropbacks_percent', '')
        variant_dropbacks = f"{prefix}dropbacks"
        # Use concept_dropbacks as base for percentage calculation
        if variant_dropbacks in sum_columns and 'concept_dropbacks' in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN concept_dropbacks > 0 THEN (CAST({variant_dropbacks} AS REAL) / concept_dropbacks) * 100 ELSE NULL END"
            ))

# Attempts percent
for col in other_columns:
    if 'attempts_percent' in col:
        prefix = col.replace('attempts_percent', '').rstrip('_')
        variant_attempts = col.replace('_percent', '')
        if variant_attempts in sum_columns and 'attempts' in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN attempts > 0 THEN (CAST({variant_attempts} AS REAL) / attempts) * 100 ELSE NULL END"
            ))

print(f"  ✓ Identified {len(rate_updates)} rate calculations")

# Execute updates
update_count = 0
for col_name, formula in rate_updates:
    try:
        cursor.execute(f"UPDATE Master_Teams_Passing_Weekly SET {col_name} = {formula}")
        update_count += 1
    except sqlite3.Error as e:
        print(f"  ⚠ Error updating {col_name}: {e}")

print(f"  ✓ Successfully updated {update_count} rate/percentage columns")

# ============================================================================
# STEP 7: Verification
# ============================================================================
print("\n[STEP 7] Verifying results...")

# Summary by year
cursor.execute("""
    SELECT year, COUNT(*) as games, 
           AVG(qb_count) as avg_qbs_per_game,
           SUM(CASE WHEN qb_count > 1 THEN 1 ELSE 0 END) as multi_qb_games
    FROM Master_Teams_Passing_Weekly
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Games | Avg QBs | Multi-QB Games")
print("  " + "-" * 50)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:5d} | {row[2]:7.2f} | {row[3]:14d}")

# Sample team-game
cursor.execute("""
    SELECT team, year, week, qb_count, attempts, completions, yards,
           touchdowns, interceptions, completion_percent, ypa, qb_rating,
           no_screen_attempts, pa_attempts
    FROM Master_Teams_Passing_Weekly
    WHERE year = 2022 AND week = 1 AND team = 'mississippi state'
""")

sample = cursor.fetchone()
if sample:
    team, yr, wk, qbs, att, comp, yds, tds, ints, comp_pct, ypa_val, rating, ns_att, pa_att = sample
    print(f"\n  Sample: {team} (2022 Week 1)")
    print(f"    QBs: {qbs}")
    print(f"    Base Stats:")
    print(f"      Attempts: {att}")
    print(f"      Completions: {comp}")
    print(f"      Yards: {yds}")
    print(f"      TDs: {tds}")
    print(f"      INTs: {ints}")
    print(f"      Completion %: {comp_pct:.1f}%")
    print(f"      YPA: {ypa_val:.2f}")
    print(f"      Rating: {rating:.1f}")
    print(f"    Variant Stats:")
    print(f"      No Screen Attempts: {ns_att}")
    print(f"      Play Action Attempts: {pa_att}")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ COMPREHENSIVE AGGREGATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Teams_Passing_Weekly")
print(f"Rows: {rows_inserted:,}")
print(f"Total Columns: ~{len(create_parts)}")
print("""
Includes:
  - ALL base counting stats (summed)
  - ALL variant counting stats (no_screen_, pa_, npa_, depth_, etc.)
  - ALL grades (weighted by appropriate snaps)
  - ALL recalculated rate statistics
  
Each variant follows the same aggregation pattern automatically!
""")
print("=" * 80)