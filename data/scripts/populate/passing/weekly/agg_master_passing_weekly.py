import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER PLAYERS PASSING WEEKLY - TABLE CREATION (ALL ROWS)")
print("=" * 80)

# ============================================================================
# DEFINE EXCLUSIONS
# ============================================================================

# Comprehensive list of columns to exclude
EXCLUDED_COLUMNS = {
    # All _adjusted variants
    'no_pressure_grades_pass_adjusted', 'blitz_grades_hands_fumble_adjusted',
    'no_pressure_grades_run_adjusted', 'pressure_grades_pass_adjusted',
    'pressure_grades_coverage_defense_adjusted', 'no_blitz_grades_offense_penalty_adjusted',
    'no_pressure_grades_hands_drop_adjusted', 'pressure_grades_offense_penalty_adjusted',
    'no_pressure_grades_pass_rush_defense_adjusted', 'no_blitz_grades_defense_penalty_adjusted',
    'pressure_grades_defense_adjusted', 'no_pressure_grades_overall_tackle_adjusted',
    'blitz_grades_offense_penalty_adjusted', 'no_blitz_grades_tackle_adjusted',
    'pressure_grades_pass_route_adjusted', 'pressure_grades_run_adjusted',
    'grades_pass_adjusted', 'pressure_grades_offense_adjusted',
    'pressure_grades_hands_drop_adjusted', 'no_blitz_grades_overall_tackle_adjusted',
    'pressure_grades_hands_fumble_adjusted', 'pressure_grades_tackle_adjusted',
    'blitz_grades_hands_drop_adjusted', 'grades_offense_adjusted',
    'no_blitz_grades_coverage_defense_adjusted', 'no_pressure_grades_pass_route_adjusted',
    'pressure_grades_defense_penalty_adjusted', 'blitz_grades_overall_tackle_adjusted',
    'blitz_grades_defense_adjusted', 'blitz_grades_defense_penalty_adjusted',
    'no_pressure_grades_hands_fumble_adjusted', 'no_pressure_grades_tackle_adjusted',
    'no_pressure_grades_defense_adjusted', 'no_blitz_grades_pass_rush_defense_adjusted',
    'no_pressure_grades_coverage_defense_adjusted', 'no_blitz_grades_defense_adjusted',
    'no_blitz_grades_pass_adjusted', 'no_pressure_grades_offense_adjusted',
    'no_blitz_grades_run_adjusted', 'no_pressure_grades_defense_penalty_adjusted',
    'pressure_grades_overall_tackle_adjusted', 'no_pressure_grades_offense_penalty_adjusted',
    'pressure_grades_pass_rush_defense_adjusted', 'no_blitz_grades_offense_adjusted',
    'blitz_grades_coverage_defense_adjusted', 'blitz_grades_tackle_adjusted',
    'no_blitz_grades_hands_drop_adjusted', 'blitz_grades_pass_rush_defense_adjusted',
    'grades_hands_fumble_adjusted', 'no_blitz_grades_hands_fumble_adjusted',
    'grades_run_adjusted', 'no_blitz_grades_pass_route_adjusted',
    'blitz_grades_pass_route_adjusted', 'blitz_grades_offense_adjusted',
    'blitz_grades_run_adjusted', 'blitz_grades_pass_adjusted',
    
    # Screen variants
    'no_screen_grades_coverage_defense', 'no_screen_grades_defense',
    'no_screen_grades_defense_penalty', 'no_screen_grades_hands_drop',
    'no_screen_grades_overall_tackle', 'no_screen_grades_pass_route',
    'no_screen_grades_pass_rush_defense', 'no_screen_grades_run_defense',
    'no_screen_grades_tackle', 'npa_grades_coverage_defense',
    'npa_grades_defense', 'npa_grades_defense_penalty',
    'npa_grades_hands_drop', 'npa_grades_overall_tackle',
    'npa_grades_pass_route', 'npa_grades_pass_rush_defense',
    'npa_grades_run_defense', 'npa_grades_tackle',
    'pa_grades_coverage_defense', 'pa_grades_defense',
    'pa_grades_defense_penalty', 'pa_grades_hands_drop',
    'pa_grades_overall_tackle', 'pa_grades_pass_route',
    'pa_grades_pass_rush_defense', 'pa_grades_run_defense',
    'pa_grades_tackle', 'screen_grades_coverage_defense',
    'screen_grades_defense', 'screen_grades_defense_penalty',
    'screen_grades_hands_drop', 'screen_grades_overall_tackle',
    'screen_grades_pass_route', 'screen_grades_pass_rush_defense',
    'screen_grades_run', 'screen_grades_run_defense',
    'screen_grades_tackle', 'screen_pressure_to_sack_rate',
    'screen_grades_overall_tackle_adjusted', 'npa_grades_tackle_adjusted',
    'screen_grades_defense_penalty_adjusted', 'no_screen_grades_defense_penalty_adjusted',
    'screen_grades_run_defense_adjusted', 'no_screen_grades_pass_route_adjusted',
    'npa_grades_pass_route_adjusted', 'pa_grades_defense_penalty_adjusted',
    'screen_grades_pass_rush_defense_adjusted', 'npa_grades_defense_adjusted',
    'pa_grades_tackle_adjusted', 'pa_grades_overall_tackle_adjusted',
    'pa_grades_pass_rush_defense_adjusted', 'screen_grades_coverage_defense_adjusted',
    'pa_grades_coverage_defense_adjusted', 'screen_grades_pass_route_adjusted',
    'pa_grades_hands_drop_adjusted', 'no_screen_grades_coverage_defense_adjusted',
    'npa_grades_hands_drop_adjusted', 'screen_grades_defense_adjusted',
    'no_screen_grades_defense_adjusted', 'npa_grades_pass_rush_defense_adjusted',
    'no_screen_grades_tackle_adjusted', 'no_screen_grades_run_defense_adjusted',
    'screen_grades_tackle_adjusted', 'screen_grades_run_adjusted',
    'npa_grades_run_defense_adjusted', 'no_screen_grades_overall_tackle_adjusted',
    'screen_grades_hands_drop_adjusted', 'no_screen_grades_pass_rush_defense_adjusted',
    'npa_grades_overall_tackle_adjusted', 'pa_grades_run_defense_adjusted',
    'npa_grades_defense_penalty_adjusted', 'pa_grades_defense_adjusted',
    'npa_grades_coverage_defense_adjusted', 'no_screen_grades_hands_drop_adjusted',
    'pa_grades_pass_route_adjusted',
    
    # Duplicate grades columns
    'grades_grades_hands_fumble', 'grades_grades_offense',
    'grades_grades_pass', 'grades_grades_run',
    
    # Less/More time to throw variants
    'less_grades_coverage_defense', 'less_grades_defense',
    'less_grades_defense_penalty', 'less_grades_hands_drop',
    'less_grades_overall_tackle', 'less_grades_pass_route',
    'less_grades_pass_rush_defense', 'less_grades_run',
    'less_grades_run_defense', 'less_grades_tackle',
    'more_grades_coverage_defense', 'more_grades_defense',
    'more_grades_defense_penalty', 'more_grades_hands_drop',
    'more_grades_overall_tackle', 'more_grades_pass_route',
    'more_grades_pass_rush_defense', 'more_grades_run_defense',
    'more_grades_tackle', 'less_grades_overall_tackle_adjusted',
    'more_grades_pass_route_adjusted', 'more_grades_tackle_adjusted',
    'less_grades_coverage_defense_adjusted', 'less_grades_pass_rush_defense_adjusted',
    'less_grades_tackle_adjusted', 'less_grades_defense_adjusted',
    'more_grades_pass_rush_defense_adjusted', 'more_grades_defense_adjusted',
    'less_grades_hands_drop_adjusted', 'more_grades_coverage_defense_adjusted',
    'less_grades_run_defense_adjusted', 'less_grades_run_adjusted',
    'more_grades_defense_penalty_adjusted', 'less_grades_pass_route_adjusted',
    'less_grades_defense_penalty_adjusted', 'more_grades_overall_tackle_adjusted',
    'more_grades_run_defense_adjusted', 'more_grades_hands_drop_adjusted',
    
    # Directional/depth variants
    'behind_los_pressure_to_sack_rate', 'center_behind_los_pressure_to_sack_rate',
    'center_medium_accuracy_percent', 'center_medium_avg_depth_of_target',
    'center_medium_avg_time_to_throw', 'center_medium_completion_percent',
    'center_medium_drop_rate', 'center_medium_pressure_to_sack_rate',
    'center_medium_sack_percent', 'center_medium_ypa',
    'left_behind_los_accuracy_percent', 'left_behind_los_avg_depth_of_target',
    'left_behind_los_avg_time_to_throw', 'left_behind_los_btt_rate',
    'left_behind_los_completion_percent', 'left_behind_los_drop_rate',
    'left_behind_los_grades_pass', 'left_behind_los_pressure_to_sack_rate',
    'left_behind_los_sack_percent', 'left_behind_los_twp_rate',
    'left_behind_los_ypa', 'left_deep_drop_rate',
    'left_deep_pressure_to_sack_rate', 'left_short_drop_rate',
    'left_short_pressure_to_sack_rate', 'right_behind_los_accuracy_percent',
    'right_behind_los_avg_depth_of_target', 'right_behind_los_avg_time_to_throw',
    'right_behind_los_btt_rate', 'right_behind_los_completion_percent',
    'right_behind_los_drop_rate', 'right_behind_los_grades_pass',
    'right_behind_los_pressure_to_sack_rate', 'right_behind_los_sack_percent',
    'right_behind_los_twp_rate', 'right_behind_los_ypa',
    'right_deep_accuracy_percent', 'right_deep_avg_depth_of_target',
    'right_deep_avg_time_to_throw', 'right_deep_btt_rate',
    'right_deep_completion_percent', 'right_deep_drop_rate',
    'right_deep_grades_pass', 'right_deep_pressure_to_sack_rate',
    'right_deep_sack_percent', 'right_deep_twp_rate',
    'right_deep_ypa', 'right_medium_accuracy_percent',
    'right_medium_avg_depth_of_target', 'right_medium_avg_time_to_throw',
    'right_medium_btt_rate', 'right_medium_completion_percent',
    'right_medium_drop_rate', 'right_medium_grades_pass',
    'right_medium_pressure_to_sack_rate', 'right_medium_sack_percent',
    'right_medium_twp_rate', 'right_medium_ypa',
    'right_short_pressure_to_sack_rate', 'right_medium_grades_pass_adjusted',
    'left_behind_los_grades_pass_adjusted', 'right_behind_los_grades_pass_adjusted',
    'right_deep_grades_pass_adjusted',
    
    # Blitz/pressure base variants
    'blitz_grades_coverage_defense', 'blitz_grades_defense',
    'blitz_grades_defense_penalty', 'blitz_grades_hands_drop',
    'blitz_grades_overall_tackle', 'blitz_grades_pass_route',
    'blitz_grades_pass_rush_defense', 'blitz_grades_run',
    'blitz_grades_tackle', 'no_blitz_grades_coverage_defense',
    'no_blitz_grades_defense', 'no_blitz_grades_defense_penalty',
    'no_blitz_grades_hands_drop', 'no_blitz_grades_overall_tackle',
    'no_blitz_grades_pass_route', 'no_blitz_grades_pass_rush_defense',
    'no_blitz_grades_tackle', 'no_pressure_grades_coverage_defense',
    'no_pressure_grades_defense', 'no_pressure_grades_defense_penalty',
    'no_pressure_grades_hands_drop', 'no_pressure_grades_overall_tackle',
    'no_pressure_grades_pass_route', 'no_pressure_grades_pass_rush_defense',
    'no_pressure_grades_run', 'no_pressure_grades_tackle',
    'no_pressure_pressure_to_sack_rate', 'pressure_grades_coverage_defense',
    'pressure_grades_defense', 'pressure_grades_defense_penalty',
    'pressure_grades_hands_drop', 'pressure_grades_overall_tackle',
    'pressure_grades_pass_route', 'pressure_grades_pass_rush_defense',
    'pressure_grades_tackle',
    
    # Metadata to exclude
    'player',  # Keep only playerId and player_id_PFF
    'player_game_count',  # Can derive from counting games
    'opponent_defense_rating',  # Can join from Teams_Ratings_SP if needed
}

print(f"\nConfigured to exclude {len(EXCLUDED_COLUMNS)} columns")

# ============================================================================
# STEP 1: Analyze source tables
# ============================================================================
print("\n[STEP 1] Analyzing source tables...")

source_tables = [
    'Players_PassingConcept_Weekly',
    'Players_PassingGrades_Weekly',
    'Players_PassingTimeInPocket_Weekly',
    'Players_PassingDepth_Weekly',
    'Players_PassingPressure_Weekly'
]

# Check which tables exist
existing_tables = []
for table in source_tables:
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    if cursor.fetchone():
        existing_tables.append(table)
        print(f"  ✓ {table} exists")
    else:
        print(f"  ✗ {table} NOT FOUND")

if not existing_tables:
    print("\n  ERROR: No source tables found!")
    conn.close()
    exit(1)

# ============================================================================
# STEP 2: Check source table row counts
# ============================================================================
print("\n[STEP 2] Checking source table row counts...")

for table in existing_tables:
    cursor.execute(f"SELECT COUNT(*), COUNT(DISTINCT playerId || '-' || year || '-' || week || '-' || seasonType) FROM {table}")
    total_rows, unique_keys = cursor.fetchone()
    print(f"  {table}:")
    print(f"    Total rows: {total_rows:,}")
    print(f"    Unique player-week combinations: {unique_keys:,}")

# ============================================================================
# STEP 3: Gather all columns from source tables
# ============================================================================
print("\n[STEP 3] Gathering columns from source tables...")

# Primary key columns (same across all tables)
pk_columns = ['playerId', 'year', 'week', 'seasonType']

# Common metadata columns (keep from first table)
metadata_columns = ['player_id_PFF', 'team', 'teamID', 'opponentID']

# Track which columns come from which tables
column_sources = defaultdict(list)
all_columns = {}  # column_name -> (type, source_table)

total_columns_before_exclusion = 0

for table in existing_tables:
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    total_columns_before_exclusion += len(columns)
    
    for col_id, col_name, col_type, not_null, default, pk in columns:
        # Skip excluded columns
        if col_name in EXCLUDED_COLUMNS:
            continue
            
        column_sources[col_name].append(table)
        
        # Store column info (use first occurrence)
        if col_name not in all_columns:
            all_columns[col_name] = (col_type, table)

print(f"\nTotal columns across all tables: {total_columns_before_exclusion}")
print(f"Columns after exclusions: {len(all_columns)}")
print(f"Columns excluded: {total_columns_before_exclusion - len(all_columns)}")

# ============================================================================
# STEP 4: Identify duplicate columns
# ============================================================================
print("\n[STEP 4] Analyzing column conflicts...")

# Find columns that appear in multiple tables
duplicate_columns = {col: tables for col, tables in column_sources.items() 
                    if len(tables) > 1}

other_duplicates = {col: tables for col, tables in duplicate_columns.items() 
                   if col not in pk_columns and col not in metadata_columns}

if other_duplicates:
    print(f"\n  ⚠ Duplicate metric columns to resolve: {len(other_duplicates)}")
    for col, tables in list(other_duplicates.items())[:10]:
        print(f"    • {col} in {len(tables)} tables")
    if len(other_duplicates) > 10:
        print(f"    ... and {len(other_duplicates) - 10} more")

# ============================================================================
# STEP 5: Build master column list
# ============================================================================
print("\n[STEP 5] Building master column list...")

master_columns = []

# Add primary keys first
for col in pk_columns:
    col_type = all_columns[col][0]
    master_columns.append((col, col_type, 'PRIMARY_KEY'))

# Add metadata columns
for col in metadata_columns:
    if col in all_columns:
        col_type = all_columns[col][0]
        master_columns.append((col, col_type, 'METADATA'))

# Add unique columns from each table (with table prefix for duplicates)
for table in existing_tables:
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    
    table_prefix = table.replace('Players_Passing', '').replace('_Weekly', '').lower()
    
    for col_id, col_name, col_type, not_null, default, pk in columns:
        # Skip excluded columns
        if col_name in EXCLUDED_COLUMNS:
            continue
            
        # Skip if already added
        if col_name in pk_columns or col_name in metadata_columns:
            continue
        
        # Handle duplicates by prefixing with table name
        if col_name in other_duplicates:
            # Only add if this is the first table with this column
            if column_sources[col_name][0] == table:
                # Use table prefix for clarity
                new_col_name = f"{table_prefix}_{col_name}"
                master_columns.append((new_col_name, col_type, table))
        else:
            master_columns.append((col_name, col_type, table))

# Remove duplicates while preserving order
seen = set()
unique_master_columns = []
for col_name, col_type, source in master_columns:
    if col_name not in seen:
        seen.add(col_name)
        unique_master_columns.append((col_name, col_type, source))

print(f"  ✓ Master table will have {len(unique_master_columns)} columns")
print(f"    - Primary keys: {len(pk_columns)}")
print(f"    - Metadata: {len([c for c in unique_master_columns if c[2] == 'METADATA'])}")
print(f"    - Metrics: {len(unique_master_columns) - len(pk_columns) - len([c for c in unique_master_columns if c[2] == 'METADATA'])}")

# ============================================================================
# STEP 6: Create master table
# ============================================================================
print("\n[STEP 6] Creating Master_Players_Passing_Weekly table...")

# Drop existing table
cursor.execute("DROP TABLE IF EXISTS Master_Players_Passing_Weekly")

# Build CREATE TABLE statement
create_columns = []
for col_name, col_type, source in unique_master_columns:
    if col_name in pk_columns:
        create_columns.append(f"{col_name} {col_type} NOT NULL")
    else:
        create_columns.append(f"{col_name} {col_type}")

create_table_sql = f"""
CREATE TABLE Master_Players_Passing_Weekly (
    {', '.join(create_columns)},
    PRIMARY KEY (playerId, year, week, seasonType),
    FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
    FOREIGN KEY (teamID) REFERENCES Teams(id),
    FOREIGN KEY (opponentID) REFERENCES Teams(id)
)
"""

cursor.execute(create_table_sql)
print("  ✓ Table created")

# ============================================================================
# STEP 7: Create base key table with ALL unique player-week combinations
# ============================================================================
print("\n[STEP 7] Building complete player-week key table...")

# Create temp table with ALL unique keys from ALL source tables
cursor.execute("DROP TABLE IF EXISTS temp_all_keys")
cursor.execute("""
    CREATE TEMPORARY TABLE temp_all_keys AS
    SELECT DISTINCT playerId, year, week, seasonType
    FROM (
        SELECT playerId, year, week, seasonType FROM Players_PassingConcept_Weekly
        UNION
        SELECT playerId, year, week, seasonType FROM Players_PassingGrades_Weekly
        UNION
        SELECT playerId, year, week, seasonType FROM Players_PassingTimeInPocket_Weekly
        UNION
        SELECT playerId, year, week, seasonType FROM Players_PassingDepth_Weekly
        UNION
        SELECT playerId, year, week, seasonType FROM Players_PassingPressure_Weekly
    )
""")

cursor.execute("SELECT COUNT(*) FROM temp_all_keys")
total_unique_keys = cursor.fetchone()[0]
print(f"  ✓ Found {total_unique_keys:,} unique player-week combinations across all tables")

# ============================================================================
# STEP 8: Populate master table with FULL OUTER JOIN logic
# ============================================================================
print("\n[STEP 8] Populating master table...")

# Build SELECT clause
select_parts = []

for col_name, col_type, source in unique_master_columns:
    # Primary keys come from the base keys table
    if col_name in pk_columns:
        select_parts.append(f"base.{col_name}")
    # Metadata - use COALESCE to get from first non-NULL table
    elif col_name in metadata_columns:
        coalesce_parts = []
        for idx, table in enumerate(existing_tables):
            cursor.execute(f"PRAGMA table_info({table})")
            table_cols = {row[1] for row in cursor.fetchall()}
            if col_name in table_cols:
                coalesce_parts.append(f"t{idx}.{col_name}")
        if coalesce_parts:
            select_parts.append(f"COALESCE({', '.join(coalesce_parts)}) AS {col_name}")
        else:
            select_parts.append(f"NULL AS {col_name}")
    # Regular columns
    else:
        found = False
        for idx, table in enumerate(existing_tables):
            cursor.execute(f"PRAGMA table_info({table})")
            table_cols = {row[1] for row in cursor.fetchall()}
            
            table_prefix = table.replace('Players_Passing', '').replace('_Weekly', '').lower()
            
            # Check if original column exists
            if col_name in table_cols:
                select_parts.append(f"t{idx}.{col_name}")
                found = True
                break
            # Check if this is a prefixed column
            elif col_name.startswith(f"{table_prefix}_"):
                original_col = col_name.replace(f"{table_prefix}_", '', 1)
                if original_col in table_cols:
                    select_parts.append(f"t{idx}.{original_col} AS {col_name}")
                    found = True
                    break
        
        if not found:
            select_parts.append(f"NULL AS {col_name}")

# Build JOIN clauses - join ALL tables to base keys
join_clauses = []
for idx, table in enumerate(existing_tables):
    join_clauses.append(f"""
        LEFT JOIN {table} t{idx} 
        ON base.playerId = t{idx}.playerId 
        AND base.year = t{idx}.year 
        AND base.week = t{idx}.week 
        AND base.seasonType = t{idx}.seasonType
    """)

# Build complete INSERT statement
insert_sql = f"""
INSERT INTO Master_Players_Passing_Weekly
SELECT {', '.join(select_parts)}
FROM temp_all_keys base
{' '.join(join_clauses)}
"""

cursor.execute(insert_sql)
rows_inserted = cursor.rowcount
print(f"  ✓ Inserted {rows_inserted:,} rows")

# Clean up temp table
cursor.execute("DROP TABLE temp_all_keys")

# ============================================================================
# STEP 9: Verify data integrity
# ============================================================================
print("\n[STEP 9] Verifying data integrity...")

# Check for NULL primary keys
cursor.execute("""
    SELECT COUNT(*) FROM Master_Players_Passing_Weekly
    WHERE playerId IS NULL OR year IS NULL OR week IS NULL OR seasonType IS NULL
""")
null_pks = cursor.fetchone()[0]
if null_pks > 0:
    print(f"  ⚠ Warning: {null_pks} rows have NULL primary keys!")
else:
    print(f"  ✓ All primary keys are populated")

# Summary by year
cursor.execute("""
    SELECT year, COUNT(*) as records, COUNT(DISTINCT playerId) as players
    FROM Master_Players_Passing_Weekly
    GROUP BY year
    ORDER BY year
""")
print("\n  Summary by year:")
print("  Year | Records | Players")
print("  " + "-" * 40)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:7d} | {row[2]:7d}")

# Comparison with source tables
print("\n  Comparison with source tables:")
for table in existing_tables:
    cursor.execute(f"SELECT COUNT(DISTINCT playerId || '-' || year || '-' || week || '-' || seasonType) FROM {table}")
    source_count = cursor.fetchone()[0]
    print(f"    {table}: {source_count:,} unique combinations")

cursor.execute("SELECT COUNT(*) FROM Master_Players_Passing_Weekly")
master_count = cursor.fetchone()[0]
print(f"    Master table: {master_count:,} rows (should equal or exceed max above)")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ MASTER TABLE CREATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Players_Passing_Weekly")
print(f"Total columns: {len(unique_master_columns)}")
print(f"Total rows: {rows_inserted:,}")
print(f"Excluded columns: {len(EXCLUDED_COLUMNS)}")
print("\nThis version captures ALL rows from ALL source tables!")
print("=" * 80)