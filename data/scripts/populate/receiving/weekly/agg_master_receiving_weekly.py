import sqlite3
from pathlib import Path
from collections import defaultdict

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("MASTER PLAYERS RECEIVING WEEKLY - TABLE CREATION WITH EXCLUSIONS")
print("=" * 80)

# ============================================================================
# DEFINE EXCLUSIONS
# ============================================================================

# Comprehensive list of columns to exclude
EXCLUDED_COLUMNS = {
    # All _adjusted variants
    'left_deep_grades_hands_drop_adjusted',
    'right_behind_los_grades_pass_route_adjusted',
    'center_medium_grades_pass_route_adjusted',
    'left_short_grades_hands_drop_adjusted',
    'right_deep_grades_hands_drop_adjusted',
    'medium_grades_pass_route_adjusted',
    'left_behind_los_grades_pass_route_adjusted',
    'left_medium_grades_pass_route_adjusted',
    'right_short_grades_hands_drop_adjusted',
    'right_short_grades_pass_route_adjusted',
    'deep_grades_pass_route_adjusted',
    'behind_los_grades_pass_route_adjusted',
    'deep_grades_hands_drop_adjusted',
    'center_deep_grades_pass_route_adjusted',
    'left_behind_los_grades_hands_drop_adjusted',
    'right_medium_grades_hands_drop_adjusted',
    'right_behind_los_grades_hands_drop_adjusted',
    'left_short_grades_pass_route_adjusted',
    'center_behind_los_grades_hands_drop_adjusted',
    'medium_grades_hands_drop_adjusted',
    'right_medium_grades_pass_route_adjusted',
    'center_medium_grades_hands_drop_adjusted',
    'behind_los_grades_hands_drop_adjusted',
    'right_deep_grades_pass_route_adjusted',
    'center_behind_los_grades_pass_route_adjusted',
    'left_medium_grades_hands_drop_adjusted',
    'center_deep_grades_hands_drop_adjusted',
    'left_deep_grades_pass_route_adjusted',
    'screen_grades_pass_route_adjusted',
    'slot_grades_pass_route_adjusted',
    'slot_grades_hands_drop_adjusted',
    'screen_grades_hands_drop_adjusted',
    'short_grades_pass_route_adjusted',
    'center_short_grades_hands_drop_adjusted',
    'short_grades_hands_drop_adjusted',
    'center_short_grades_pass_route_adjusted',
    'zone_grades_pass_route_adjusted',
    'man_grades_hands_drop_adjusted',
    'zone_grades_hands_drop_adjusted',
    'man_grades_pass_route_adjusted',
    
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
    'Players_ReceivingConcept_Weekly',
    'Players_ReceivingGrades_Weekly',
    'Players_ReceivingDepth_Weekly',
    'Players_ReceivingScheme_Weekly'
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
        print(f"    • {col} in {len(tables)} tables: {', '.join(tables[:2])}")
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
    
    # Create table prefix for disambiguation
    table_prefix = table.replace('Players_Receiving', '').replace('_Weekly', '').lower()
    
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
print("\n[STEP 6] Creating Master_Players_Receiving_Weekly table...")

# Drop existing table
cursor.execute("DROP TABLE IF EXISTS Master_Players_Receiving_Weekly")

# Build CREATE TABLE statement
create_columns = []
for col_name, col_type, source in unique_master_columns:
    if col_name in pk_columns:
        create_columns.append(f"{col_name} {col_type} NOT NULL")
    else:
        create_columns.append(f"{col_name} {col_type}")

create_table_sql = f"""
CREATE TABLE Master_Players_Receiving_Weekly (
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

# Build UNION query dynamically based on existing tables
union_parts = []
for table in existing_tables:
    union_parts.append(f"SELECT playerId, year, week, seasonType FROM {table}")

# Create temp table with ALL unique keys from ALL source tables
cursor.execute("DROP TABLE IF EXISTS temp_all_keys")
cursor.execute(f"""
    CREATE TEMPORARY TABLE temp_all_keys AS
    SELECT DISTINCT playerId, year, week, seasonType
    FROM (
        {' UNION '.join(union_parts)}
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
            
            table_prefix = table.replace('Players_Receiving', '').replace('_Weekly', '').lower()
            
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
INSERT INTO Master_Players_Receiving_Weekly
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
    SELECT COUNT(*) FROM Master_Players_Receiving_Weekly
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
    FROM Master_Players_Receiving_Weekly
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

cursor.execute("SELECT COUNT(*) FROM Master_Players_Receiving_Weekly")
master_count = cursor.fetchone()[0]
print(f"    Master table: {master_count:,} rows (should equal or exceed max above)")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ MASTER TABLE CREATION COMPLETE")
print("=" * 80)
print(f"\nTable: Master_Players_Receiving_Weekly")
print(f"Total columns: {len(unique_master_columns)}")
print(f"Total rows: {rows_inserted:,}")
print(f"Excluded columns: {len(EXCLUDED_COLUMNS)}")
print("\nThis version captures ALL rows from ALL source tables!")
print("=" * 80)