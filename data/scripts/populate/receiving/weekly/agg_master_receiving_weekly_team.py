import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER TEAMS RECEIVING WEEKLY - AGGREGATION")
print("=" * 80)

# ============================================================================
# STEP 1: Analyze column structure
# ============================================================================
print("\n[STEP 1] Analyzing Master_Players_Receiving_Weekly columns...")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Master_Players_Receiving_Weekly'")
if not cursor.fetchone():
    print("  ✗ Master_Players_Receiving_Weekly not found!")
    print("  Please run create_master_receiving_weekly script first")
    conn.close()
    exit(1)

cursor.execute("PRAGMA table_info(Master_Players_Receiving_Weekly)")
all_columns = [(row[1], row[2]) for row in cursor.fetchall()]

print(f"  ✓ Found {len(all_columns)} columns")

# Exclude these columns from aggregation
EXCLUDE_COLUMNS = {'playerId', 'player_id_PFF', 'year', 'week', 'seasonType', 
                   'team', 'teamID', 'opponentID', 'position', 'team_name', 'franchise_id',
                   'declined_penalties', 'penalties'}

# Categorize columns by their aggregation method
sum_columns = []
weighted_avg_columns = []
rate_columns = []

for col_name, col_type in all_columns:
    if col_name in EXCLUDE_COLUMNS:
        continue
    
    # Grades should be weighted averages
    if 'grades' in col_name:
        weighted_avg_columns.append(col_name)
    # Rate/percentage columns - skip, will recalculate
    elif any(x in col_name for x in ['_percent', '_rate', '_rating', 'yprr']):
        rate_columns.append(col_name)
    # Per reception stats - these are rates
    elif 'yards_per_reception' in col_name or 'yards_after_catch_per_reception' in col_name:
        rate_columns.append(col_name)
    # Average depth - weighted average
    elif 'avg_depth' in col_name:
        weighted_avg_columns.append(col_name)
    # Counting stats - sum
    elif any(x in col_name for x in ['targets', 'receptions', 'yards', 'touchdowns', 
                                      'first_downs', 'fumbles', 'drops', 'interceptions',
                                      'avoided_tackles', 'contested', 'routes', 'snaps',
                                      'pass_blocks', 'pass_plays', 'longest', 'catches',
                                      'yards_after_catch']):
        sum_columns.append(col_name)
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

# For receiving, grades should be weighted by routes or targets
column_weights = {}
for col in weighted_avg_columns:
    if 'avg_depth' in col:
        # Depth weighted by targets
        # Extract prefix (e.g., 'screen_', 'slot_', 'deep_', etc.)
        prefix = col.replace('avg_depth_of_target', '').rstrip('_')
        if prefix:
            column_weights[col] = f"{prefix}_targets"
        else:
            column_weights[col] = 'targets'
    elif 'pass_route' in col or 'route' in col:
        # Route grades weighted by routes
        prefix = col.replace('grades_pass_route', '').replace('_grades_pass_route', '').rstrip('_')
        if prefix:
            column_weights[col] = f"{prefix}_routes"
        else:
            column_weights[col] = 'routes'
    elif 'hands' in col or 'drop' in col:
        # Hands grades weighted by targets
        prefix = col.replace('grades_hands_drop', '').replace('_grades_hands_drop', '').rstrip('_')
        if prefix:
            column_weights[col] = f"{prefix}_targets"
        else:
            column_weights[col] = 'targets'
    elif 'pass_block' in col:
        # Blocking grades weighted by pass blocks
        column_weights[col] = 'pass_blocks'
    else:
        # Default to routes
        column_weights[col] = 'routes'

print(f"  ✓ Assigned weights for {len(column_weights)} columns")

# ============================================================================
# STEP 3: Create Master_Teams_Receiving_Weekly table
# ============================================================================
print("\n[STEP 3] Creating Master_Teams_Receiving_Weekly table...")

cursor.execute("DROP TABLE IF EXISTS Master_Teams_Receiving_Weekly")

# Build CREATE TABLE statement
create_parts = [
    "team TEXT NOT NULL",
    "teamID INTEGER NOT NULL",
    "year INTEGER NOT NULL",
    "week INTEGER NOT NULL",
    "seasonType TEXT NOT NULL",
    "opponentID INTEGER",
    "receiver_count INTEGER"
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
CREATE TABLE Master_Teams_Receiving_Weekly (
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
    "COUNT(*) as receiver_count"
]

# Add summed columns
for col in sorted(sum_columns):
    select_parts.append(f"SUM(COALESCE({col}, 0)) as {col}")

# Add weighted averages
for col in sorted(weighted_avg_columns):
    weight_col = column_weights.get(col, 'routes')
    if weight_col in sum_columns or weight_col in ['routes', 'targets', 'pass_blocks']:
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
INSERT INTO Master_Teams_Receiving_Weekly
SELECT {', '.join(select_parts)}
FROM Master_Players_Receiving_Weekly
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

# Catch percentages
for col in rate_columns:
    if 'caught_percent' in col:
        prefix = col.replace('caught_percent', '').rstrip('_')
        receptions_col = f"{prefix}_receptions" if prefix else 'receptions'
        targets_col = f"{prefix}_targets" if prefix else 'targets'
        
        if receptions_col in sum_columns and targets_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {targets_col} > 0 THEN (CAST({receptions_col} AS REAL) / {targets_col}) * 100 ELSE NULL END"
            ))

# Drop rates
for col in rate_columns:
    if 'drop_rate' in col:
        prefix = col.replace('drop_rate', '').rstrip('_')
        drops_col = f"{prefix}_drops" if prefix else 'drops'
        targets_col = f"{prefix}_targets" if prefix else 'targets'
        
        if drops_col in sum_columns and targets_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {targets_col} > 0 THEN (CAST({drops_col} AS REAL) / {targets_col}) * 100 ELSE NULL END"
            ))

# Contested catch rates
for col in rate_columns:
    if 'contested_catch_rate' in col:
        prefix = col.replace('contested_catch_rate', '').rstrip('_')
        contested_rec_col = f"{prefix}_contested_receptions" if prefix else 'contested_receptions'
        contested_tgt_col = f"{prefix}_contested_targets" if prefix else 'contested_targets'
        
        if contested_rec_col in sum_columns and contested_tgt_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {contested_tgt_col} > 0 THEN (CAST({contested_rec_col} AS REAL) / {contested_tgt_col}) * 100 ELSE NULL END"
            ))

# Yards per reception
for col in rate_columns:
    if 'yards_per_reception' in col and 'yards_after_catch_per_reception' not in col:
        prefix = col.replace('yards_per_reception', '').replace('_yards_per_reception', '').rstrip('_')
        yards_col = f"{prefix}_yards" if prefix else 'yards'
        receptions_col = f"{prefix}_receptions" if prefix else 'receptions'
        
        if yards_col in sum_columns and receptions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {receptions_col} > 0 THEN CAST({yards_col} AS REAL) / {receptions_col} ELSE NULL END"
            ))

# Yards after catch per reception
for col in rate_columns:
    if 'yards_after_catch_per_reception' in col:
        prefix = col.replace('yards_after_catch_per_reception', '').replace('_yards_after_catch_per_reception', '').rstrip('_')
        yac_col = f"{prefix}_yards_after_catch" if prefix else 'yards_after_catch'
        receptions_col = f"{prefix}_receptions" if prefix else 'receptions'
        
        if yac_col in sum_columns and receptions_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {receptions_col} > 0 THEN CAST({yac_col} AS REAL) / {receptions_col} ELSE NULL END"
            ))

# YPRR (yards per route run)
for col in rate_columns:
    if col.endswith('yprr') or col.endswith('_yprr'):
        prefix = col.replace('yprr', '').replace('_yprr', '').rstrip('_')
        yards_col = f"{prefix}_yards" if prefix else 'yards'
        routes_col = f"{prefix}_routes" if prefix else 'routes'
        
        if yards_col in sum_columns and routes_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {routes_col} > 0 THEN CAST({yards_col} AS REAL) / {routes_col} ELSE NULL END"
            ))

# Target percentages
for col in rate_columns:
    if 'targets_percent' in col:
        prefix = col.replace('targets_percent', '').replace('_targets_percent', '').rstrip('_')
        variant_targets = f"{prefix}_targets" if prefix else None
        
        # Calculate as percentage of total targets
        if variant_targets and variant_targets in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN targets > 0 THEN (CAST({variant_targets} AS REAL) / targets) * 100 ELSE NULL END"
            ))

# QB Rating when targeted (requires completions, yards, TDs, INTs)
for col in rate_columns:
    if 'targeted_qb_rating' in col:
        prefix = col.replace('targeted_qb_rating', '').replace('_targeted_qb_rating', '').rstrip('_')
        if prefix:
            targets_col = f"{prefix}_targets"
            receptions_col = f"{prefix}_receptions"
            yards_col = f"{prefix}_yards"
            tds_col = f"{prefix}_touchdowns"
            ints_col = f"{prefix}_interceptions"
        else:
            targets_col = "targets"
            receptions_col = "receptions"
            yards_col = "yards"
            tds_col = "touchdowns"
            ints_col = "interceptions"
        
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

# Route rates (routes / pass_plays)
for col in rate_columns:
    if 'route_rate' in col:
        prefix = col.replace('route_rate', '').replace('_route_rate', '').rstrip('_')
        if prefix:
            routes_col = f"{prefix}_routes"
            plays_col = f"{prefix}_pass_plays"
        else:
            routes_col = "routes"
            plays_col = "pass_plays"
        
        if routes_col in sum_columns and plays_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {plays_col} > 0 THEN (CAST({routes_col} AS REAL) / {plays_col}) * 100 ELSE NULL END"
            ))

# Pass block rates
for col in rate_columns:
    if 'pass_block_rate' in col:
        prefix = col.replace('pass_block_rate', '').replace('_pass_block_rate', '').rstrip('_')
        if prefix:
            blocks_col = f"{prefix}_pass_blocks"
            plays_col = f"{prefix}_pass_plays"
        else:
            blocks_col = "pass_blocks"
            plays_col = "pass_plays"
        
        if blocks_col in sum_columns and plays_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {plays_col} > 0 THEN (CAST({blocks_col} AS REAL) / {plays_col}) * 100 ELSE NULL END"
            ))

print(f"  ✓ Identified {len(rate_updates)} rate calculations")

# Execute updates
update_count = 0
for col_name, formula in rate_updates:
    try:
        cursor.execute(f"UPDATE Master_Teams_Receiving_Weekly SET {col_name} = {formula}")
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
           AVG(receiver_count) as avg_receivers_per_game
    FROM Master_Teams_Receiving_Weekly
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Games | Avg Receivers")
print("  " + "-" * 40)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:5d} | {row[2]:13.2f}")

# Sample team-game
cursor.execute("""
    SELECT team, year, week, receiver_count, targets, receptions, yards,
           touchdowns, first_downs, drops, yards_per_reception, yprr
    FROM Master_Teams_Receiving_Weekly
    WHERE year = 2021 AND week = 4 AND team = 'alabama'
""")

sample = cursor.fetchone()
if sample:
    team, yr, wk, receivers, tgts, recs, yds, tds, fds, drps, ypr_val, yprr_val = sample
    print(f"\n  Sample: {team} ({yr} Week {wk})")
    print(f"    Receivers: {receivers}")
    print(f"    Targets: {tgts}")
    print(f"    Receptions: {recs}")
    print(f"    Yards: {yds}")
    print(f"    TDs: {tds}")
    print(f"    First Downs: {fds}")
    print(f"    Drops: {drps}")
    if ypr_val:
        print(f"    Yards/Reception: {ypr_val:.2f}")
    if yprr_val:
        print(f"    YPRR: {yprr_val:.2f}")

# Check for teams with many receivers
cursor.execute("""
    SELECT team, year, week, receiver_count, targets, receptions
    FROM Master_Teams_Receiving_Weekly
    WHERE receiver_count > 10
    ORDER BY receiver_count DESC
    LIMIT 5
""")

many_receivers = cursor.fetchall()
if many_receivers:
    print(f"\n  Teams with most receivers in a game:")
    for team, yr, wk, receivers, tgts, recs in many_receivers:
        print(f"    {team} ({yr} Week {wk}): {receivers} receivers, {tgts} targets, {recs} receptions")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Teams_Receiving_Weekly")
print(f"Rows: {rows_inserted:,}")
print(f"Total Columns: ~{len(create_parts)}")
print("""
Includes:
  - ALL counting stats (summed across all receivers)
  - Grades (weighted by routes/targets appropriately)
  - ALL variant stats (screen, slot, depth, directional, man/zone)
  - Recalculated rate statistics
  
Perfect for team-level receiving analysis!
""")
print("=" * 80)