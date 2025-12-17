import sqlite3
import os
import csv
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("PLAYERS BLOCKING GRADES WEEKLY - POPULATION SCRIPT (FIXED)")
print("=" * 80)

# Define table for Blocking Grades Weekly data
TABLE_NAME = "Players_BlockingGrades_Weekly"
BASE_METRIC_COLS = set()

# ============================================================================
# CRITICAL FIX: Fetch player data with YEAR to handle transfers
# ============================================================================
print("\n[STEP 1] Loading player data (with year for transfer handling)...")

# Get blocking-eligible players with their team assignment BY YEAR
cursor.execute("""
    SELECT playerId, player_id_PFF, name, team, teamID, year 
    FROM Players_Basic 
    WHERE position IN ('RB', 'TE', 'G', 'C', 'T', 'OT', 'OG', 'OC', 'OL', 'FB', 'WR')
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
    WHERE position IN ('RB', 'TE', 'G', 'C', 'T', 'OT', 'OG', 'OC', 'OL')
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
        WHERE player_id_PFF = ? 
          AND position IN ('RB', 'TE', 'G', 'C', 'T', 'OT', 'OG', 'OC', 'OL')
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
# STEP 3: Load PFF weekly blocking grades data
# ============================================================================
print("\n[STEP 3] Loading PFF blocking grades data...")

pff_data = {}
BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Blocking/WeeklyReports/BlockingGrades")

if not BASE_DIR.exists():
    print(f"  ✗ Directory not found: {BASE_DIR}")
    conn.close()
    exit(1)

files_processed = 0
records_added = 0

for csv_file in sorted(BASE_DIR.glob("*_BlockingGrades.csv")):
    file_parts = csv_file.stem.split('_')
    
    if len(file_parts) < 2 or file_parts[-1] != "BlockingGrades":
        print(f"  Skipping {csv_file.name}: Invalid filename format")
        continue
    
    try:
        year = int(file_parts[0])
        game_type = file_parts[1]
        
        # Parse week and season type
        if game_type.isdigit():
            week = int(game_type)
            seasonType = 'regular'
        elif game_type == 'CC':
            week = 15
            seasonType = 'regular'
        elif game_type in ['1stPO', '2ndPO', '3rdPO', '4thPO']:
            week = int(''.join(filter(str.isdigit, game_type)))
            seasonType = 'postseason'
        else:
            print(f"  Skipping {csv_file.name}: Unsupported game type {game_type}")
            continue
            
    except ValueError:
        print(f"  Skipping {csv_file.name}: Invalid year or week in filename")
        continue
    
    # Read CSV
    try:
        with open(csv_file, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            if "player_id" not in reader.fieldnames:
                print(f"  Skipping {csv_file.name}: Missing player_id column")
                continue
            
            # Identify all columns
            all_cols = set(reader.fieldnames)
            metric_cols = all_cols - {'playerId', 'year', 'week', 'seasonType', 'player', 'team', 'teamID', 'player_game_count', 'player_id'}
            
            BASE_METRIC_COLS.update(metric_cols)
            
            # Process each player record
            for row in reader:
                pff_id = row.get("player_id")
                
                # CRITICAL: Look up player by (pff_id, year)
                player_key = (pff_id, year)
                
                if player_key not in players_basic:
                    continue  # Player not in our blocking-eligible list for this year
                
                player_info = players_basic[player_key]
                player_id = player_info['playerId']
                player_name = player_info['name'].lower()
                team = player_info['team']
                teamID = player_info['teamID']
                
                game_count = int(row.get("player_game_count", 0)) if row.get("player_game_count", "").replace('.', '').isdigit() else 0
                
                # Parse metrics
                metrics = {}
                for col in all_cols:
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
                    if metrics.get(col) is not None:
                        pff_data[key][col] = metrics[col]
                
                records_added += 1
        
        files_processed += 1
        
    except Exception as e:
        print(f"  Error reading {csv_file.name}: {e}")
        continue

print(f"  ✓ Processed {files_processed} CSV files")
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
        opponent_defense_rating REAL,
        {', '.join(f'{col}_adjusted REAL' for col in all_grades_cols)},
        PRIMARY KEY (playerId, year, week, seasonType),
        FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
        FOREIGN KEY (teamID) REFERENCES Teams(id),
        FOREIGN KEY (opponentID) REFERENCES Teams(id)
    )
"""

cursor.execute(create_table_sql)
print(f"  ✓ Created table with {len(BASE_METRIC_COLS)} metric columns")
print(f"  ✓ Created {len(all_grades_cols)} adjusted grade columns")

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
    ] + [data.get(col) for col in sorted_metrics] + [None] + [None for _ in all_grades_cols]
    
    try:
        placeholders = ', '.join('?' for _ in range(len(values)))
        columns = 'playerId, player_id_PFF, year, week, seasonType, opponentID, player, team, teamID, player_game_count, ' + ', '.join(sorted_metrics) + ', opponent_defense_rating, ' + ', '.join(f'{col}_adjusted' for col in all_grades_cols)
        
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
# STEP 7: Populate opponent_defense_rating
# ============================================================================
print("\n[STEP 7] Populating opponent defense ratings...")

cursor.execute(f"""
    UPDATE {TABLE_NAME}
    SET opponent_defense_rating = COALESCE((
        SELECT trs.defense_rating
        FROM Teams_Ratings_SP trs
        WHERE trs.teamID = {TABLE_NAME}.opponentID
          AND trs.year = {TABLE_NAME}.year
        LIMIT 1
    ), 40.0)
    WHERE opponent_defense_rating IS NULL
""")

defense_updated = cursor.rowcount
print(f"  ✓ Updated {defense_updated} records with opponent_defense_rating")

# ============================================================================
# STEP 8: Populate adjusted metrics
# ============================================================================
print("\n[STEP 8] Populating adjusted grade metrics...")

# Fetch mean defense rating from Teams_Ratings_SP (national average)
cursor.execute("SELECT defense_rating FROM Teams_Ratings_SP WHERE team = 'nationalAverages' LIMIT 1")
mean_defense_rating_row = cursor.fetchone()
mean_defense_rating = float(mean_defense_rating_row[0]) if mean_defense_rating_row else 40.0

print(f"  Using national average defense rating: {mean_defense_rating}")

adjusted_count = 0
for col in all_grades_cols:
    cursor.execute(f"""
        UPDATE {TABLE_NAME}
        SET {col}_adjusted = (
            CASE
                WHEN COALESCE(opponent_defense_rating, ?) > ? THEN
                    {col} * (1 - (SQRT((COALESCE(opponent_defense_rating, ?) - ?) / ?) * 0.10))
                WHEN COALESCE(opponent_defense_rating, ?) < ? THEN
                    {col} * (1 + (SQRT((? - COALESCE(opponent_defense_rating, ?)) / ?) * 0.10))
                ELSE {col}
            END
        )
        WHERE {col}_adjusted IS NULL
    """, (mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating,
          mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating))
    adjusted_count += cursor.rowcount

print(f"  ✓ Updated {adjusted_count} records with adjusted metrics")

# ============================================================================
# STEP 9: Verification
# ============================================================================
print("\n[STEP 9] Verification...")

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