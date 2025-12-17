import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER TEAMS RUSHING WEEKLY - AGGREGATION")
print("=" * 80)

# ============================================================================
# STEP 1: Analyze column structure
# ============================================================================
print("\n[STEP 1] Analyzing Master_Players_Rushing_Weekly columns...")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Master_Players_Rushing_Weekly'")
if not cursor.fetchone():
    print("  ✗ Master_Players_Rushing_Weekly not found!")
    print("  Please run create_master_rushing_weekly script first")
    conn.close()
    exit(1)

cursor.execute("PRAGMA table_info(Master_Players_Rushing_Weekly)")
all_columns = [(row[1], row[2]) for row in cursor.fetchall()]

print(f"  ✓ Found {len(all_columns)} columns")

# Exclude these columns from aggregation
EXCLUDE_COLUMNS = {'playerId', 'player_id_PFF', 'year', 'week', 'seasonType', 
                   'team', 'teamID', 'opponentID'}

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
    elif any(x in col_name for x in ['_percent', '_rate', '_rating', 'ypa', 'ypr']):
        rate_columns.append(col_name)
    # YCO (yards created opportunity) per attempt - rate
    elif col_name == 'yco_attempt':
        rate_columns.append(col_name)
    # Counting stats - sum
    elif any(x in col_name for x in ['attempts', 'yards', 'touchdowns', 'first_downs',
                                      'fumbles', 'avoided_tackles', 'breakaway',
                                      'drops', 'receptions', 'targets', 'routes',
                                      'scrambles', 'run_plays', 'touches', 'explosive',
                                      '_mtf', 'designed', 'gap_', 'rzone_', 'longest',
                                      'yards_after_contact', 'rec_yards', 'scramble_yards']):
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
# STEP 2: Determine weighting strategy for grades
# ============================================================================
print("\n[STEP 2] Determining weighting strategy...")

# For rushing, most grades should be weighted by run_plays or attempts
column_weights = {}
for col in weighted_avg_columns:
    if 'run' in col or 'rush' in col:
        column_weights[col] = 'run_plays'
    elif 'pass' in col or 'route' in col:
        column_weights[col] = 'routes'
    elif 'block' in col:
        column_weights[col] = 'run_plays'
    else:
        column_weights[col] = 'run_plays'  # Default to run_plays

print(f"  ✓ Assigned weights for {len(column_weights)} columns")

# ============================================================================
# STEP 3: Create Master_Teams_Rushing_Weekly table
# ============================================================================
print("\n[STEP 3] Creating Master_Teams_Rushing_Weekly table...")

cursor.execute("DROP TABLE IF EXISTS Master_Teams_Rushing_Weekly")

# Build CREATE TABLE statement
create_parts = [
    "team TEXT NOT NULL",
    "teamID INTEGER NOT NULL",
    "year INTEGER NOT NULL",
    "week INTEGER NOT NULL",
    "seasonType TEXT NOT NULL",
    "opponentID INTEGER",
    "player_count INTEGER"
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
CREATE TABLE Master_Teams_Rushing_Weekly (
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
    "COUNT(*) as player_count"
]

# Add summed columns
for col in sorted(sum_columns):
    select_parts.append(f"SUM(COALESCE({col}, 0)) as {col}")

# Add weighted averages
for col in sorted(weighted_avg_columns):
    weight_col = column_weights.get(col, 'run_plays')
    if weight_col in sum_columns or weight_col in ['run_plays', 'attempts', 'routes']:
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
INSERT INTO Master_Teams_Rushing_Weekly
SELECT {', '.join(select_parts)}
FROM Master_Players_Rushing_Weekly
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

# Breakaway percentage
if 'breakaway_percent' in rate_columns and 'breakaway_attempts' in sum_columns and 'attempts' in sum_columns:
    rate_updates.append((
        'breakaway_percent',
        "CASE WHEN attempts > 0 THEN (CAST(breakaway_attempts AS REAL) / attempts) * 100 ELSE NULL END"
    ))

# Yards per attempt (ypa)
if 'ypa' in rate_columns and 'yards' in sum_columns and 'attempts' in sum_columns:
    rate_updates.append((
        'ypa',
        "CASE WHEN attempts > 0 THEN CAST(yards AS REAL) / attempts ELSE NULL END"
    ))

# Yards per reception (ypr)
if 'ypr' in rate_columns and 'rec_yards' in sum_columns and 'receptions' in sum_columns:
    rate_updates.append((
        'ypr',
        "CASE WHEN receptions > 0 THEN CAST(rec_yards AS REAL) / receptions ELSE NULL END"
    ))

# YCO per attempt
if 'yco_attempt' in rate_columns and 'elu_yco' in sum_columns and 'attempts' in sum_columns:
    rate_updates.append((
        'yco_attempt',
        "CASE WHEN attempts > 0 THEN CAST(elu_yco AS REAL) / attempts ELSE NULL END"
    ))

# Elusive rating (typically based on missed tackles and YCO)
if 'elusive_rating' in rate_columns:
    # Elusive rating formula: (elu_rush_mtf + elu_recv_mtf + elu_yco) / attempts
    if all(c in sum_columns for c in ['elu_rush_mtf', 'elu_recv_mtf', 'elu_yco', 'attempts']):
        rate_updates.append((
            'elusive_rating',
            "CASE WHEN attempts > 0 THEN (elu_rush_mtf + elu_recv_mtf + elu_yco) / CAST(attempts AS REAL) ELSE NULL END"
        ))

print(f"  ✓ Identified {len(rate_updates)} rate calculations")

# Execute updates
update_count = 0
for col_name, formula in rate_updates:
    try:
        cursor.execute(f"UPDATE Master_Teams_Rushing_Weekly SET {col_name} = {formula}")
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
           AVG(player_count) as avg_players_per_game,
           SUM(CASE WHEN player_count > 3 THEN 1 ELSE 0 END) as rbbc_games
    FROM Master_Teams_Rushing_Weekly
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Games | Avg Players | RBBC Games (4+)")
print("  " + "-" * 55)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:5d} | {row[2]:11.2f} | {row[3]:16d}")

# Sample team-game
cursor.execute("""
    SELECT team, year, week, player_count, attempts, yards, touchdowns,
           ypa, first_downs, fumbles, avoided_tackles
    FROM Master_Teams_Rushing_Weekly
    WHERE year = 2022 AND week = 1 AND team = 'mississippi state'
""")

sample = cursor.fetchone()
if sample:
    team, yr, wk, players, att, yds, tds, ypa_val, fds, fum, avoid = sample
    print(f"\n  Sample: {team} (2022 Week 1)")
    print(f"    Players: {players}")
    print(f"    Attempts: {att}")
    print(f"    Yards: {yds}")
    print(f"    TDs: {tds}")
    if ypa_val:
        print(f"    YPA: {ypa_val:.2f}")
    print(f"    First Downs: {fds}")
    print(f"    Fumbles: {fum}")
    print(f"    Avoided Tackles: {avoid}")

# Check for teams with many rushers (RBBC)
cursor.execute("""
    SELECT team, year, week, player_count, attempts, yards
    FROM Master_Teams_Rushing_Weekly
    WHERE player_count > 5
    ORDER BY player_count DESC
    LIMIT 5
""")

rbbc = cursor.fetchall()
if rbbc:
    print(f"\n  Teams with most rushers in a game (RBBC):")
    for team, yr, wk, players, att, yds in rbbc:
        print(f"    {team} ({yr} Week {wk}): {players} players, {att} attempts, {yds} yards")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ AGGREGATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Teams_Rushing_Weekly")
print(f"Rows: {rows_inserted:,}")
print(f"Total Columns: ~{len(create_parts)}")
print("""
Includes:
  - ALL counting stats (summed across all rushers)
  - Grades (weighted by run_plays/routes)
  - Recalculated rate statistics (ypa, breakaway%, etc.)
  
Perfect for team-level rushing analysis!
""")
print("=" * 80)