import sqlite3
import os
import csv
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("PLAYERS PASSING GRADES WEEKLY - POPULATION SCRIPT (FIXED)")
print("=" * 80)

# Define table for Passing Grades Weekly data
TABLE_NAME = "Players_PassingGrades_Weekly"
BASE_METRIC_COLS = set()
EXCLUDED_COLS = {"player", "player_id", "position", "team_name", "player_game_count", "franchise_id", "declined_penalties", "penalties"}

# ============================================================================
# CRITICAL FIX: Fetch player data with YEAR to handle transfers
# ============================================================================
print("\n[STEP 1] Loading player data (with year for transfer handling)...")

# Get QBs with their team assignment BY YEAR
cursor.execute("""
    SELECT playerId, player_id_PFF, name, team, teamID, year 
    FROM Players_Basic 
    WHERE position IN ('QB', 'TE', 'WR')
      AND player_id_PFF IS NOT NULL
    ORDER BY year, player_id_PFF
""")

# Build lookup: (player_id_PFF, year) -> player info
players_basic = {}
for row in cursor.fetchall():
    player_id, pff_id, name, team, team_id, year = row
    players_basic[(pff_id, year)] = {
        'playerId': player_id,
        'name': name,
        'team': team,
        'teamID': team_id
    }

print(f"  ✓ Loaded {len(players_basic)} player-year combinations")

# Show example of player with transfers
cursor.execute("""
    SELECT player_id_PFF, year, name, team 
    FROM Players_Basic 
    WHERE position IN ('QB', 'TE', 'WR')
      AND player_id_PFF IS NOT NULL
    GROUP BY player_id_PFF 
    HAVING COUNT(DISTINCT teamID) > 1
    LIMIT 1
""")
transfer_example = cursor.fetchone()
if transfer_example:
    pff_id, year, name, team = transfer_example
    print(f"  Example transfer: {name} (PFF ID: {pff_id})")
    cursor.execute("""
        SELECT year, team, teamID 
        FROM Players_Basic 
        WHERE player_id_PFF = ? AND position IN ('QB', 'TE', 'WR')
        ORDER BY year
    """, (pff_id,))
    for yr, tm, tm_id in cursor.fetchall():
        print(f"    {yr}: {tm} (teamID: {tm_id})")

# ============================================================================
# STEP 2: Fetch game data
# ============================================================================
print("\n[STEP 2] Loading game schedule...")

cursor.execute("SELECT id, season, week, seasonType, homeId, awayId FROM Teams_Games")
games = {
    row[0]: {
        "season": row[1], 
        "week": row[2], 
        "seasonType": row[3], 
        "homeId": row[4], 
        "awayId": row[5]
    } 
    for row in cursor.fetchall()
}

print(f"  ✓ Loaded {len(games)} games")

# ============================================================================
# STEP 3: Load PFF weekly passing data
# ============================================================================
print("\n[STEP 3] Loading PFF passing grades data...")

pff_data = {}
BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Passing/WeeklyReports/PassingGrades")

if not BASE_DIR.exists():
    print(f"  ✗ Directory not found: {BASE_DIR}")
    conn.close()
    exit(1)

files_processed = 0
files_skipped = 0
records_added = 0

for csv_file in sorted(BASE_DIR.glob("*_PassingGrades.csv")):
    file_parts = csv_file.stem.split('_')
    
    if len(file_parts) < 2 or file_parts[-1] != "PassingGrades":
        print(f"  Skipping {csv_file.name}: Invalid filename format")
        files_skipped += 1
        continue
    
    try:
        year = int(file_parts[0])
        game_type = file_parts[1] if len(file_parts) > 1 else "1"
        
        # Parse week and season type
        if game_type in ['1stPO', '2ndPO', '3rdPO', '4thPO']:
            week = int(''.join(filter(str.isdigit, game_type)))
            seasonType = 'postseason'
        elif game_type == 'CC':
            week = 15
            seasonType = 'regular'
        elif game_type.isdigit():
            week = int(game_type)
            seasonType = 'regular'
        else:
            print(f"  Skipping {csv_file.name}: Unsupported game type {game_type}")
            files_skipped += 1
            continue
            
    except ValueError:
        print(f"  Skipping {csv_file.name}: Invalid year or week in filename")
        files_skipped += 1
        continue
    
    # Read CSV with error handling
    try:
        with open(csv_file, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            # Check if file has valid headers
            if not reader.fieldnames:
                print(f"  Skipping {csv_file.name}: Empty or invalid file")
                files_skipped += 1
                continue
            
            if "player_id" not in reader.fieldnames:
                print(f"  Skipping {csv_file.name}: Missing player_id column")
                files_skipped += 1
                continue
            
            # Identify metric columns
            metric_cols = set(
                col for col in reader.fieldnames 
                if col not in EXCLUDED_COLS
            )
            
            if not metric_cols:
                print(f"  Skipping {csv_file.name}: No metric columns found")
                files_skipped += 1
                continue
            
            BASE_METRIC_COLS.update(metric_cols)
            
            # Process each player record
            for row in reader:
                pff_id = row.get("player_id")
                
                # CRITICAL: Look up player by (pff_id, year)
                player_key = (pff_id, year)
                
                if player_key not in players_basic:
                    continue  # Player not in our list for this year
                
                player_info = players_basic[player_key]
                player_id = player_info['playerId']
                player_name = player_info['name'].lower()
                team = player_info['team']
                teamID = player_info['teamID']
                
                game_count = int(row.get("player_game_count", 0)) if row.get("player_game_count", "").replace('.', '').isdigit() else 0
                
                # Parse metrics
                metrics = {}
                for col in metric_cols:
                    val = row.get(col, "")
                    if val and val.replace('.', '').replace('-', '').isdigit():
                        metrics[col] = float(val)
                    else:
                        metrics[col] = None
                
                # Store data
                key = (player_id, year, week, seasonType)
                if key not in pff_data:
                    pff_data[key] = {
                        'playerId': player_id,
                        'player_id_PFF': pff_id,
                        'year': year,
                        'week': week,
                        'seasonType': seasonType,
                        'player': player_name,
                        'team': team,
                        'teamID': teamID,
                        'player_game_count': game_count
                    }
                
                # Update metrics
                for col in metric_cols:
                    if metrics[col] is not None:
                        pff_data[key][col] = metrics[col]
                
                records_added += 1
        
        files_processed += 1
        
    except Exception as e:
        print(f"  Error reading {csv_file.name}: {e}")
        files_skipped += 1
        continue

print(f"  ✓ Processed {files_processed} CSV files")
if files_skipped > 0:
    print(f"  ⚠ Skipped {files_skipped} files due to errors")
print(f"  ✓ Loaded {records_added} player-week records")
print(f"  ✓ Unique metric columns: {len(BASE_METRIC_COLS)}")

# ============================================================================
# STEP 4: Create table
# ============================================================================
print("\n[STEP 4] Creating database table...")

# Identify grades columns
all_grades_cols = [col for col in BASE_METRIC_COLS if "grades" in col]

# Drop and recreate table
cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")

sorted_metrics = sorted(BASE_METRIC_COLS)

create_table_sql = f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        playerId INTEGER NOT NULL,
        player_id_PFF TEXT,
        year INTEGER NOT NULL,
        week INTEGER NOT NULL,
        seasonType TEXT NOT NULL,
        opponentID INTEGER,
        player TEXT NOT NULL,
        team TEXT NOT NULL,
        teamID INTEGER,
        player_game_count INTEGER,
        {', '.join(f'{col} REAL' for col in sorted_metrics)},
        PRIMARY KEY (playerId, year, week, seasonType),
        FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
        FOREIGN KEY (teamID) REFERENCES Teams(id),
        FOREIGN KEY (opponentID) REFERENCES Teams(id)
    )
"""

cursor.execute(create_table_sql)
print(f"  ✓ Created table with {len(BASE_METRIC_COLS)} metric columns")

# ============================================================================
# STEP 5: Insert data
# ============================================================================
print("\n[STEP 5] Inserting data...")

inserted_count = 0
error_count = 0

for key, data in pff_data.items():
    values = [
        data['playerId'],
        data.get('player_id_PFF'),
        data['year'],
        data['week'],
        data['seasonType'],
        None,  # opponentID (populated later)
        data['player'],
        data['team'],
        data['teamID'],
        data['player_game_count']
    ] + [data.get(col) for col in sorted_metrics]
    
    try:
        placeholders = ', '.join('?' for _ in range(len(values)))
        columns = 'playerId, player_id_PFF, year, week, seasonType, opponentID, player, team, teamID, player_game_count, ' + ', '.join(sorted_metrics)
        
        query = f"INSERT OR REPLACE INTO {TABLE_NAME} ({columns}) VALUES ({placeholders})"
        cursor.execute(query, values)
        inserted_count += 1
        
    except sqlite3.Error as e:
        error_count += 1
        if error_count <= 5:  # Only show first 5 errors
            print(f"  Error inserting playerId {data['playerId']}, week {data['week']}: {e}")

print(f"  ✓ Inserted {inserted_count} records")
if error_count > 0:
    print(f"  ⚠ {error_count} errors occurred")

# ============================================================================
# STEP 6: Populate opponentID
# ============================================================================
print("\n[STEP 6] Populating opponent IDs...")

cursor.execute(f"""
    UPDATE {TABLE_NAME}
    SET opponentID = (
        SELECT CASE
            WHEN homeId = {TABLE_NAME}.teamID THEN awayId
            ELSE homeId
        END
        FROM Teams_Games
        WHERE season = {TABLE_NAME}.year
          AND week = {TABLE_NAME}.week
          AND seasonType = {TABLE_NAME}.seasonType
          AND ({TABLE_NAME}.teamID = homeId OR {TABLE_NAME}.teamID = awayId)
        LIMIT 1
    )
    WHERE opponentID IS NULL
""")

opponent_updated = cursor.rowcount
print(f"  ✓ Updated {opponent_updated} records with opponentID")

# ============================================================================
# STEP 7: Verification
# ============================================================================
print("\n[STEP 7] Verification...")

cursor.execute(f"""
    SELECT year, COUNT(*) as records, COUNT(DISTINCT playerId) as players, 
           COUNT(DISTINCT teamID) as teams
    FROM {TABLE_NAME}
    GROUP BY year
    ORDER BY year
""")

print("\n  Summary by year:")
print("  Year | Records | Players | Teams")
print("  " + "-" * 40)
for row in cursor.fetchall():
    print(f"  {row[0]:4d} | {row[1]:7d} | {row[2]:7d} | {row[3]:5d}")

# Check for players assigned to wrong teams
cursor.execute(f"""
    SELECT p.year, p.player, p.team, p.teamID, pb.team, pb.teamID
    FROM {TABLE_NAME} p
    JOIN Players_Basic pb ON p.playerId = pb.playerId AND p.year = pb.year
    WHERE p.teamID != pb.teamID
    LIMIT 5
""")

mismatches = cursor.fetchall()
if mismatches:
    print("\n  ⚠ Team mismatches found:")
    for row in mismatches:
        print(f"    {row[0]} | {row[1]}: {TABLE_NAME} says {row[2]} ({row[3]}), Players_Basic says {row[4]} ({row[5]})")
else:
    print("\n  ✓ No team mismatches - all assignments correct!")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ POPULATION COMPLETE")
print("=" * 80)