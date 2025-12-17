import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER TEAMS DEFENSE WEEKLY - AGGREGATION")
print("=" * 80)

# ============================================================================
# STEP 1: Analyze column structure
# ============================================================================
print("\n[STEP 1] Analyzing Master_Players_Defense_Weekly columns...")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Master_Players_Defense_Weekly'")
if not cursor.fetchone():
    print("  ✗ Master_Players_Defense_Weekly not found!")
    print("  Please check table name or run creation script first")
    conn.close()
    exit(1)

cursor.execute("PRAGMA table_info(Master_Players_Defense_Weekly)")
all_columns = [(row[1], row[2]) for row in cursor.fetchall()]

print(f"  ✓ Found {len(all_columns)} columns")

# Exclude these columns from aggregation
EXCLUDE_COLUMNS = {'playerId', 'player_id_PFF', 'year', 'week', 'seasonType', 
                   'team', 'teamID', 'opponentID', 'position', 'team_name', 
                   'franchise_id', 'coveragegrades_franchise_id', 'coveragegrades_position',
                   'coveragegrades_team_name', 'declined_penalties', 'coveragegrades_declined_penalties',
                   'penalties', 'coveragegrades_penalties'}

# Categorize columns by their aggregation method
sum_columns = []
weighted_avg_columns = []
rate_columns = []

for col_name, col_type in all_columns:
    if col_name in EXCLUDE_COLUMNS:
        continue
    
    # Grades should be weighted averages
    if 'grades' in col_name and 'adjusted' not in col_name:
        weighted_avg_columns.append(col_name)
    # Rate/percentage columns - skip, will recalculate
    elif any(x in col_name for x in ['_percent', '_percentage', '_rate', 'rating_against', 'prp']):
        rate_columns.append(col_name)
    # Per snap/coverage metrics - rates
    elif any(x in col_name for x in ['per_reception', 'per_target', 'per_coverage_snap', 'per_snap']):
        rate_columns.append(col_name)
    # Counting stats - sum
    elif any(x in col_name for x in ['snap_counts', 'tackles', 'assists', 'sacks', 'hits', 
                                      'hurries', 'pressures', 'interceptions', 'targets', 
                                      'receptions', 'yards', 'touchdowns', 'stops', 'forced',
                                      'fumbles', 'break_ups', 'batted', 'missed', 'losses',
                                      'wins', 'opp', 'recoveries', 'safeties', 'coverage_snaps']):
        sum_columns.append(col_name)
    # Average depth - weighted average
    elif 'avg_depth' in col_name:
        weighted_avg_columns.append(col_name)
    else:
        # Default to sum for other numeric columns
        sum_columns.append(col_name)

print(f"  ✓ Found {len(sum_columns)} columns to SUM")
print(f"  ✓ Found {len(weighted_avg_columns)} columns for WEIGHTED AVERAGE")
print(f"  ✓ Found {len(rate_columns)} rate/percentage columns to RECALCULATE")

# Show examples
print(f"\n  Example SUM columns:")
for col in sum_columns[:15]:
    print(f"    - {col}")

print(f"\n  Example WEIGHTED AVG columns:")
for col in weighted_avg_columns[:10]:
    print(f"    - {col}")

# ============================================================================
# STEP 2: Determine weighting strategy
# ============================================================================
print("\n[STEP 2] Determining weighting strategy...")

# For defense, grades should be weighted by appropriate snap counts
column_weights = {}
for col in weighted_avg_columns:
    if 'coverage_defense' in col or 'coverage' in col:
        # Coverage grades weighted by coverage snaps
        if col.startswith('man_'):
            column_weights[col] = 'man_snap_counts_coverage'
        elif col.startswith('zone_'):
            column_weights[col] = 'zone_snap_counts_coverage'
        elif col.startswith('coveragegrades_'):
            column_weights[col] = 'coveragegrades_snap_counts_coverage'
        else:
            column_weights[col] = 'coverage_snaps'
    elif 'pass_rush' in col:
        # Pass rush grades weighted by pass rush snaps
        if col.startswith('true_pass_set_'):
            column_weights[col] = 'true_pass_set_snap_counts_pass_rush'
        elif col.startswith('grades_'):
            column_weights[col] = 'grades_snap_counts_pass_rush'
        else:
            column_weights[col] = 'snap_counts_pass_rush'
    elif 'run_defense' in col or 'run' in col:
        # Run defense grades weighted by run defense snaps
        column_weights[col] = 'snap_counts_run_defense'
    elif 'tackle' in col:
        # Tackle grades weighted by total tackles
        column_weights[col] = 'coveragegrades_tackles'
    elif 'avg_depth' in col:
        # Depth weighted by targets
        if col.startswith('man_'):
            column_weights[col] = 'man_targets'
        elif col.startswith('zone_'):
            column_weights[col] = 'zone_targets'
        else:
            column_weights[col] = 'coveragegrades_targets'
    elif 'defense' in col:
        # Overall defense grade weighted by defensive snaps
        column_weights[col] = 'snap_counts_defense'
    else:
        # Default to defensive snaps
        column_weights[col] = 'snap_counts_defense'

print(f"  ✓ Assigned weights for {len(column_weights)} columns")

# ============================================================================
# STEP 3: Create Master_Teams_Defense_Weekly table
# ============================================================================
print("\n[STEP 3] Creating Master_Teams_Defense_Weekly table...")

cursor.execute("DROP TABLE IF EXISTS Master_Teams_Defense_Weekly")

# Build CREATE TABLE statement
create_parts = [
    "team TEXT NOT NULL",
    "teamID INTEGER NOT NULL",
    "year INTEGER NOT NULL",
    "week INTEGER NOT NULL",
    "seasonType TEXT NOT NULL",
    "opponentID INTEGER",
    "defender_count INTEGER"
]

# Add all sum columns
for col in sorted(sum_columns):
    create_parts.append(f"{col} REAL")

# Add all weighted avg columns
for col in sorted(weighted_avg_columns):
    create_parts.append(f"{col} REAL")

# Add rate/percentage columns (will be recalculated)
for col in sorted(rate_columns):
    create_parts.append(f"{col} REAL")

create_sql = f"""
CREATE TABLE Master_Teams_Defense_Weekly (
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
    "COUNT(*) as defender_count"
]

# Add summed columns
for col in sorted(sum_columns):
    select_parts.append(f"SUM(COALESCE({col}, 0)) as {col}")

# Add weighted averages
for col in sorted(weighted_avg_columns):
    weight_col = column_weights.get(col, 'snap_counts_defense')
    if weight_col in sum_columns:
        select_parts.append(
            f"SUM(COALESCE({col}, 0) * COALESCE({weight_col}, 0)) / "
            f"NULLIF(SUM(COALESCE({weight_col}, 0)), 0) as {col}"
        )
    else:
        # Fallback to simple average if weight column doesn't exist
        select_parts.append(f"AVG({col}) as {col}")

# Add rate columns as NULL (will recalculate)
for col in sorted(rate_columns):
    select_parts.append(f"NULL as {col}")

insert_sql = f"""
INSERT INTO Master_Teams_Defense_Weekly
SELECT {', '.join(select_parts)}
FROM Master_Players_Defense_Weekly
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

rate_updates = []

# Catch rates (receptions / targets)
for col in rate_columns:
    if 'catch_rate' in col:
        prefix = col.replace('catch_rate', '').rstrip('_')
        
        if prefix:
            receptions_col = f"{prefix}_receptions"
            targets_col = f"{prefix}_targets"
        else:
            receptions_col = "coveragegrades_receptions"
            targets_col = "coveragegrades_targets"
        
        if receptions_col in sum_columns and targets_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {targets_col} > 0 THEN (CAST({receptions_col} AS REAL) / {targets_col}) * 100 ELSE NULL END"
            ))

# Coverage percentages
for col in rate_columns:
    if 'coverage_percent' in col:
        prefix = col.replace('coverage_percent', '').rstrip('_')
        
        if prefix:
            coverage_col = f"{prefix}_snap_counts_coverage"
            pass_play_col = f"{prefix}_snap_counts_pass_play"
        else:
            coverage_col = "coveragegrades_snap_counts_coverage"
            pass_play_col = "coveragegrades_snap_counts_pass_play"
        
        if coverage_col in sum_columns and pass_play_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {pass_play_col} > 0 THEN (CAST({coverage_col} AS REAL) / {pass_play_col}) * 100 ELSE NULL END"
            ))

# Forced incompletion rates
for col in rate_columns:
    if 'forced_incompletion_rate' in col:
        prefix = col.replace('forced_incompletion_rate', '').rstrip('_')
        
        if prefix:
            forced_col = f"{prefix}_forced_incompletes"
            targets_col = f"{prefix}_targets"
        else:
            forced_col = "forced_incompletes"
            targets_col = "coveragegrades_targets"
        
        if forced_col in sum_columns and targets_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {targets_col} > 0 THEN (CAST({forced_col} AS REAL) / {targets_col}) * 100 ELSE NULL END"
            ))

# Missed tackle rates
for col in rate_columns:
    if 'missed_tackle_rate' in col:
        prefix = col.replace('missed_tackle_rate', '').rstrip('_')
        
        if prefix:
            missed_col = f"{prefix}_missed_tackles"
            tackles_col = f"{prefix}_tackles"
        else:
            missed_col = "coveragegrades_missed_tackles"
            tackles_col = "coveragegrades_tackles"
        
        if missed_col in sum_columns and tackles_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN ({tackles_col} + {missed_col}) > 0 THEN (CAST({missed_col} AS REAL) / ({tackles_col} + {missed_col})) * 100 ELSE NULL END"
            ))

# Yards per reception
for col in rate_columns:
    if 'yards_per_reception' in col:
        prefix = col.replace('yards_per_reception', '').rstrip('_')
        
        if prefix:
            yards_col = f"{prefix}_yards"
            receptions_col = f"{prefix}_receptions"
        else:
            yards_col = "coveragegrades_yards"
            receptions_col = "coveragegrades_receptions"
        
        if yards_col in sum_columns and receptions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {receptions_col} > 0 THEN CAST({yards_col} AS REAL) / {receptions_col} ELSE NULL END"
            ))

# Yards per coverage snap
for col in rate_columns:
    if 'yards_per_coverage_snap' in col:
        prefix = col.replace('yards_per_coverage_snap', '').rstrip('_')
        
        if prefix:
            yards_col = f"{prefix}_yards"
            coverage_col = f"{prefix}_snap_counts_coverage"
        else:
            yards_col = "coveragegrades_yards"
            coverage_col = "coveragegrades_snap_counts_coverage"
        
        if yards_col in sum_columns and coverage_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {coverage_col} > 0 THEN CAST({yards_col} AS REAL) / {coverage_col} ELSE NULL END"
            ))

# Coverage snaps per reception
for col in rate_columns:
    if 'coverage_snaps_per_reception' in col:
        prefix = col.replace('coverage_snaps_per_reception', '').replace('coveragegrades_', '').rstrip('_')
        
        if prefix and prefix != 'coveragegrades':
            coverage_col = f"{prefix}_snap_counts_coverage"
            receptions_col = f"{prefix}_receptions"
        else:
            coverage_col = "coveragegrades_snap_counts_coverage"
            receptions_col = "coveragegrades_receptions"
        
        if coverage_col in sum_columns and receptions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {receptions_col} > 0 THEN CAST({coverage_col} AS REAL) / {receptions_col} ELSE NULL END"
            ))

# Coverage snaps per target
for col in rate_columns:
    if 'coverage_snaps_per_target' in col:
        prefix = col.replace('coverage_snaps_per_target', '').replace('coveragegrades_', '').rstrip('_')
        
        if prefix and prefix != 'coveragegrades':
            coverage_col = f"{prefix}_snap_counts_coverage"
            targets_col = f"{prefix}_targets"
        else:
            coverage_col = "coveragegrades_snap_counts_coverage"
            targets_col = "coveragegrades_targets"
        
        if coverage_col in sum_columns and targets_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {targets_col} > 0 THEN CAST({coverage_col} AS REAL) / {targets_col} ELSE NULL END"
            ))

# QB Rating against (when targeted)
for col in rate_columns:
    if 'qb_rating_against' in col:
        prefix = col.replace('qb_rating_against', '').replace('coveragegrades_', '').rstrip('_')
        
        if prefix and prefix != 'coveragegrades':
            targets_col = f"{prefix}_targets"
            receptions_col = f"{prefix}_receptions"
            yards_col = f"{prefix}_yards"
            tds_col = f"{prefix}_touchdowns"
            ints_col = f"{prefix}_interceptions"
        else:
            targets_col = "coveragegrades_targets"
            receptions_col = "coveragegrades_receptions"
            yards_col = "coveragegrades_yards"
            tds_col = "coveragegrades_touchdowns"
            ints_col = "coveragegrades_interceptions"
        
        if all(c in sum_columns for c in [targets_col, receptions_col, yards_col, tds_col, ints_col]):
            rate_updates.append((
                col,
                f"""CASE WHEN {targets_col} >= 1 THEN
                    ((8.4 * {yards_col}) +
                     (330 * {tds_col}) +
                     (100 * {receptions_col}) -
                     (200 * {ints_col})) / {targets_col}
                ELSE NULL END"""
            ))

# Pass rush percentages
for col in rate_columns:
    if 'pass_rush_percent' in col:
        prefix = col.replace('pass_rush_percent', '').rstrip('_')
        
        if prefix:
            rush_col = f"{prefix}_snap_counts_pass_rush"
            pass_col = f"{prefix}_snap_counts_pass_play"
        else:
            rush_col = "snap_counts_pass_rush"
            pass_col = "snap_counts_pass_play"
        
        if rush_col in sum_columns and pass_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {pass_col} > 0 THEN (CAST({rush_col} AS REAL) / {pass_col}) * 100 ELSE NULL END"
            ))

# Pass rush win rates
for col in rate_columns:
    if 'pass_rush_win_rate' in col:
        prefix = col.replace('pass_rush_win_rate', '').rstrip('_')
        
        if prefix:
            wins_col = f"{prefix}_pass_rush_wins"
            opp_col = f"{prefix}_pass_rush_opp"
        else:
            wins_col = "pass_rush_wins"
            opp_col = "pass_rush_opp"
        
        if wins_col in sum_columns and opp_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {opp_col} > 0 THEN (CAST({wins_col} AS REAL) / {opp_col}) * 100 ELSE NULL END"
            ))

# Stop percentages
for col in rate_columns:
    if col == 'stop_percent':
        if 'coveragegrades_stops' in sum_columns and 'run_stop_opp' in sum_columns:
            rate_updates.append((
                col,
                "CASE WHEN run_stop_opp > 0 THEN (CAST(coveragegrades_stops AS REAL) / run_stop_opp) * 100 ELSE NULL END"
            ))

print(f"  ✓ Identified {len(rate_updates)} rate calculations")

# Execute updates
update_count = 0
for col_name, formula in rate_updates:
    try:
        cursor.execute(f"UPDATE Master_Teams_Defense_Weekly SET {col_name} = {formula}")
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
           AVG(defender_count) as avg_defenders_per_game
    FROM Master_Teams_Defense_Weekly
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Games | Avg Defenders")
print("  " + "-" * 40)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:5d} | {row[2]:14.2f}")

# Sample team-game
cursor.execute("""
    SELECT team, year, week, defender_count, 
           snap_counts_defense, coveragegrades_tackles, grades_sacks,
           coveragegrades_interceptions, coveragegrades_targets, coveragegrades_receptions
    FROM Master_Teams_Defense_Weekly
    WHERE year = 2024 AND week = 2 AND team = 'southern miss'
    LIMIT 1
""")

sample = cursor.fetchone()
if sample:
    team, yr, wk, defenders, def_snaps, tackles, sacks, ints, targets, recs = sample
    print(f"\n  Sample: {team} ({yr} Week {wk})")
    print(f"    Defenders: {defenders}")
    print(f"    Defensive Snaps: {def_snaps}")
    print(f"    Tackles: {tackles}")
    print(f"    Sacks: {sacks}")
    print(f"    Interceptions: {ints}")
    print(f"    Targets Allowed: {targets}")
    print(f"    Receptions Allowed: {recs}")

# Check for defensive dominance (most sacks)
cursor.execute("""
    SELECT team, year, week, grades_sacks, grades_hits, grades_hurries,
           grades_total_pressures
    FROM Master_Teams_Defense_Weekly
    WHERE grades_sacks > 0
    ORDER BY grades_sacks DESC
    LIMIT 5
""")

sack_leaders = cursor.fetchall()
if sack_leaders:
    print(f"\n  Teams with most sacks in a game:")
    for team, yr, wk, sacks, hits, hurries, pressures in sack_leaders:
        print(f"    {team} ({yr} Week {wk}): {sacks} sacks, {pressures} total pressures")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Teams_Defense_Weekly")
print(f"Rows: {rows_inserted:,}")
print(f"Total Columns: ~{len(create_parts)}")
print("""
Includes:
  - ALL counting stats (tackles, sacks, INTs, pressures, etc.)
  - Grades (weighted by appropriate snap counts)
  - Coverage variants (man, zone, base)
  - Pass rush variants (true pass set, etc.)
  - Recalculated rate statistics
  
Perfect for team-level defensive analysis!
""")
print("=" * 80)