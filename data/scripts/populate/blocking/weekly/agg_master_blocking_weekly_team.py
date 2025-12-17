import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER TEAMS BLOCKING WEEKLY - AGGREGATION")
print("=" * 80)

# ============================================================================
# STEP 1: Analyze column structure
# ============================================================================
print("\n[STEP 1] Analyzing Master_Players_Blocking_Weekly columns...")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Master_Players_Blocking_Weekly'")
if not cursor.fetchone():
    print("  ✗ Master_Players_Blocking_Weekly not found!")
    print("  Please check table name or run creation script first")
    conn.close()
    exit(1)

cursor.execute("PRAGMA table_info(Master_Players_Blocking_Weekly)")
all_columns = [(row[1], row[2]) for row in cursor.fetchall()]

print(f"  ✓ Found {len(all_columns)} columns")

# Exclude these columns from aggregation
EXCLUDE_COLUMNS = {'playerId', 'player_id_PFF', 'year', 'week', 'seasonType', 
                   'team', 'teamID', 'opponentID', 'position', 'team_name', 
                   'franchise_id', 'pass_franchise_id', 'pass_position', 'pass_team_name',
                   'declined_penalties', 'pass_declined_penalties', 'penalties'}

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
    elif any(x in col_name for x in ['_percent', '_percentage', 'block_percent']):
        rate_columns.append(col_name)
    # PBE (pass block efficiency) - rate
    elif col_name.endswith('pbe') or '_pbe' in col_name:
        rate_columns.append(col_name)
    # Counting stats - sum
    elif any(x in col_name for x in ['snap_counts', 'allowed', 'hits', 'hurries', 
                                      'pressures', 'sacks', '_block']):
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

# For blocking, grades should be weighted by snap counts
column_weights = {}
for col in weighted_avg_columns:
    if 'pass_block' in col:
        # Pass blocking grades weighted by pass block snaps
        if col.startswith('pass_'):
            column_weights[col] = 'pass_snap_counts_pass_block'
        elif col.startswith('true_pass_set_'):
            column_weights[col] = 'true_pass_set_snap_counts_pass_block'
        else:
            column_weights[col] = 'snap_counts_pass_block'
    elif 'run_block' in col:
        # Run blocking grades weighted by run block snaps
        if col.startswith('gap_'):
            column_weights[col] = 'gap_snap_counts_run_block'
        elif col.startswith('zone_'):
            column_weights[col] = 'zone_snap_counts_run_block'
        elif col.startswith('grades_'):
            column_weights[col] = 'grades_snap_counts_run_block'
        else:
            column_weights[col] = 'snap_counts_run_block'
    elif 'grades_offense' in col:
        # Overall offense grade weighted by total offensive snaps
        column_weights[col] = 'snap_counts_offense'
    else:
        # Default to offensive snaps
        column_weights[col] = 'snap_counts_offense'

print(f"  ✓ Assigned weights for {len(column_weights)} columns")

# ============================================================================
# STEP 3: Create Master_Teams_Blocking_Weekly table
# ============================================================================
print("\n[STEP 3] Creating Master_Teams_Blocking_Weekly table...")

cursor.execute("DROP TABLE IF EXISTS Master_Teams_Blocking_Weekly")

# Build CREATE TABLE statement
create_parts = [
    "team TEXT NOT NULL",
    "teamID INTEGER NOT NULL",
    "year INTEGER NOT NULL",
    "week INTEGER NOT NULL",
    "seasonType TEXT NOT NULL",
    "opponentID INTEGER",
    "blocker_count INTEGER"
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
CREATE TABLE Master_Teams_Blocking_Weekly (
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
    "COUNT(*) as blocker_count"
]

# Add summed columns
for col in sorted(sum_columns):
    select_parts.append(f"SUM(COALESCE({col}, 0)) as {col}")

# Add weighted averages
for col in sorted(weighted_avg_columns):
    weight_col = column_weights.get(col, 'snap_counts_offense')
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
INSERT INTO Master_Teams_Blocking_Weekly
SELECT {', '.join(select_parts)}
FROM Master_Players_Blocking_Weekly
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

# Pass block percentages
for col in rate_columns:
    if 'pass_block_percent' in col:
        # Extract prefix
        prefix = col.replace('pass_block_percentage', '').replace('pass_block_percent', '').rstrip('_')
        
        if prefix:
            pass_block_col = f"{prefix}_snap_counts_pass_block"
            pass_play_col = f"{prefix}_snap_counts_pass_play"
        else:
            pass_block_col = "snap_counts_pass_block"
            pass_play_col = "snap_counts_pass_play"
        
        if pass_block_col in sum_columns and pass_play_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {pass_play_col} > 0 THEN (CAST({pass_block_col} AS REAL) / {pass_play_col}) * 100 ELSE NULL END"
            ))

# Run block percentages
for col in rate_columns:
    if 'run_block_percent' in col and 'snap_counts' not in col:
        prefix = col.replace('run_block_percent', '').rstrip('_')
        
        if prefix:
            run_block_col = f"{prefix}_snap_counts_run_block"
            run_play_col = f"{prefix}_snap_counts_run_play"
        else:
            run_block_col = "snap_counts_run_block"
            run_play_col = "snap_counts_run_play"
        
        if run_block_col in sum_columns and run_play_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {run_play_col} > 0 THEN (CAST({run_block_col} AS REAL) / {run_play_col}) * 100 ELSE NULL END"
            ))

# Block percentages (general)
for col in rate_columns:
    if col == 'block_percent':
        if 'snap_counts_block' in sum_columns and 'snap_counts_offense' in sum_columns:
            rate_updates.append((
                col,
                "CASE WHEN snap_counts_offense > 0 THEN (CAST(snap_counts_block AS REAL) / snap_counts_offense) * 100 ELSE NULL END"
            ))

# PBE (Pass Block Efficiency) = (Sacks * 2 + Hits + Hurries) / Pass Block Snaps
for col in rate_columns:
    if col.endswith('pbe') or '_pbe' in col:
        prefix = col.replace('pbe', '').replace('_pbe', '').rstrip('_')
        
        if prefix:
            sacks_col = f"{prefix}_sacks_allowed"
            hits_col = f"{prefix}_hits_allowed"
            hurries_col = f"{prefix}_hurries_allowed"
            snaps_col = f"{prefix}_snap_counts_pass_block"
        else:
            sacks_col = "sacks_allowed"
            hits_col = "hits_allowed"
            hurries_col = "hurries_allowed"
            snaps_col = "snap_counts_pass_block"
        
        # Check if all required columns exist
        if all(c in sum_columns for c in [sacks_col, hits_col, hurries_col, snaps_col]):
            rate_updates.append((
                col,
                f"""CASE WHEN {snaps_col} > 0 THEN
                    (({sacks_col} * 2.0) + {hits_col} + {hurries_col}) / CAST({snaps_col} AS REAL)
                ELSE NULL END"""
            ))

# Non-spike percentages (pass blocks where QB doesn't spike)
for col in rate_columns:
    if 'non_spike_pass_block_percent' in col:
        prefix = col.replace('non_spike_pass_block_percentage', '').replace('non_spike_pass_block_percent', '').rstrip('_')
        
        if prefix:
            non_spike_col = f"{prefix}_non_spike_pass_block"
            pass_block_col = f"{prefix}_snap_counts_pass_block"
        else:
            non_spike_col = "non_spike_pass_block"
            pass_block_col = "snap_counts_pass_block"
        
        if non_spike_col in sum_columns and pass_block_col in sum_columns:
            rate_updates.append((
                col,
                f"CASE WHEN {pass_block_col} > 0 THEN (CAST({non_spike_col} AS REAL) / {pass_block_col}) * 100 ELSE NULL END"
            ))

print(f"  ✓ Identified {len(rate_updates)} rate calculations")

# Execute updates
update_count = 0
for col_name, formula in rate_updates:
    try:
        cursor.execute(f"UPDATE Master_Teams_Blocking_Weekly SET {col_name} = {formula}")
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
           AVG(blocker_count) as avg_blockers_per_game
    FROM Master_Teams_Blocking_Weekly
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Games | Avg Blockers")
print("  " + "-" * 40)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:5d} | {row[2]:13.2f}")

# Sample team-game
cursor.execute("""
    SELECT team, year, week, blocker_count, 
           snap_counts_offense, pass_snap_counts_pass_block, grades_snap_counts_run_block,
           pass_sacks_allowed, pass_pressures_allowed, grades_offense
    FROM Master_Teams_Blocking_Weekly
    WHERE year = 2021 AND week = 2 AND team = 'alabama'
    LIMIT 1
""")

sample = cursor.fetchone()
if sample:
    team, yr, wk, blockers, off_snaps, pass_snaps, run_snaps, sacks, pressures, grade = sample
    print(f"\n  Sample: {team} ({yr} Week {wk})")
    print(f"    Blockers: {blockers}")
    print(f"    Offensive Snaps: {off_snaps}")
    print(f"    Pass Block Snaps: {pass_snaps}")
    print(f"    Run Block Snaps: {run_snaps}")
    print(f"    Sacks Allowed: {sacks}")
    print(f"    Pressures Allowed: {pressures}")
    if grade:
        print(f"    Overall Grade: {grade:.1f}")

# Check sack leaders (teams allowing most sacks)
cursor.execute("""
    SELECT team, year, week, pass_sacks_allowed, pass_pressures_allowed, pass_snap_counts_pass_block
    FROM Master_Teams_Blocking_Weekly
    WHERE pass_sacks_allowed > 0
    ORDER BY pass_sacks_allowed DESC
    LIMIT 5
""")

sack_leaders = cursor.fetchall()
if sack_leaders:
    print(f"\n  Teams allowing most sacks in a game:")
    for team, yr, wk, sacks, pressures, snaps in sack_leaders:
        print(f"    {team} ({yr} Week {wk}): {sacks} sacks allowed on {snaps} pass block snaps")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Teams_Blocking_Weekly")
print(f"Rows: {rows_inserted:,}")
print(f"Total Columns: ~{len(create_parts)}")
print("""
Includes:
  - ALL counting stats (snaps, sacks allowed, pressures, etc.)
  - Grades (weighted by appropriate snap counts)
  - Pass blocking variants (true pass set, etc.)
  - Run blocking variants (gap, zone, etc.)
  - Recalculated rate statistics (PBE, block %, etc.)
  
Perfect for team-level offensive line analysis!
""")
print("=" * 80)