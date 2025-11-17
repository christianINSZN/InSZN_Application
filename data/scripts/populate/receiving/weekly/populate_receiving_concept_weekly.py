import sqlite3
import os
import csv
from pathlib import Path
import math

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define table for Receiving Concept Weekly data
TABLE_NAME = "Players_ReceivingConcept_Weekly"
BASE_METRIC_COLS = set()
EXCLUDED_COLS = {"player", "player_id", "position", "team_name", "player_game_count", "franchise_id", "declined_penalties", "penalties"}
REQUIRED_COLS = {"yards"}

# Fetch existing player data from Players_Basic with PFF ID and teamID for WR, TE, RB
cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('WR', 'TE', 'RB')")
players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}

# Fetch game data from Teams_Games to map weeks and seasonType for all teams
cursor.execute("SELECT id, season, week, seasonType, homeId, awayId FROM Teams_Games WHERE season = 2024")
games = {row[0]: {"season": row[1], "week": row[2], "seasonType": row[3], "homeId": row[4], "awayId": row[5]} for row in cursor.fetchall()}

# Load Receiving Concept weekly data and dynamically build metric columns
pff_data = {}
BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Receiving/WeeklyReports/ReceivingConcept")
if BASE_DIR.exists():
    for csv_file in BASE_DIR.glob("*_ReceivingConcept.csv"):
        file_parts = csv_file.stem.split('_')
        if len(file_parts) >= 2 and file_parts[-1] == "ReceivingConcept":
            try:
                year = int(file_parts[0])
                game_type = file_parts[1] if len(file_parts) > 1 else "1"
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
                    print(f"Skipping {csv_file.name}: Unsupported game type {game_type}")
                    continue
            except ValueError:
                print(f"Skipping {csv_file.name}: Invalid year or week in filename")
                continue
            with open(csv_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                if "player_id" not in reader.fieldnames:
                    print(f"Skipping {csv_file.name}: Missing player_id column")
                    continue
                metric_cols = set(col for col in reader.fieldnames if col not in EXCLUDED_COLS)
                if not metric_cols:
                    print(f"Skipping {csv_file.name}: No metric columns found")
                    continue
                BASE_METRIC_COLS.update(metric_cols)
                for row in reader:
                    pff_id = row.get("player_id")
                    if pff_id in players_basic:
                        player_id = players_basic[pff_id]['playerId']
                        player_name = players_basic[pff_id]['name'].lower()
                        team = players_basic[pff_id]['team']
                        teamID = players_basic[pff_id]['teamID']
                        game_count = int(row.get("player_game_count", 0)) if row.get("player_game_count") and row.get("player_game_count").replace('.', '').isdigit() else 0
                        metrics = {col: float(row.get(col, 0)) if row.get(col) and row.get(col).replace('.', '').isdigit() else None for col in metric_cols}
                        if (player_id, year, week, seasonType) not in pff_data:
                            pff_data[(player_id, year, week, seasonType)] = {'playerId': player_id, 'year': year, 'week': week, 'seasonType': seasonType, 'player': player_name, 'team': team, 'teamID': teamID, 'player_game_count': game_count}
                        for col in metric_cols:
                            if metrics[col] is not None:
                                pff_data[(player_id, year, week, seasonType)][col] = metrics[col]

# Identify all grades columns from loaded data
all_grades_cols = [col for col in BASE_METRIC_COLS if "grades" in col]

# Drop and recreate table with all discovered columns
cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        playerId INTEGER NOT NULL,
        year INTEGER NOT NULL,
        week INTEGER NOT NULL,
        seasonType TEXT NOT NULL,
        opponentID INTEGER,
        player TEXT NOT NULL,
        team TEXT NOT NULL,
        teamID INTEGER,
        player_game_count INTEGER,
        {', '.join(f'{col} REAL' for col in BASE_METRIC_COLS)},
        opponent_defense_rating REAL,
        {', '.join(f'{col}_adjusted REAL' for col in all_grades_cols)},
        PRIMARY KEY (playerId, year, week, seasonType),
        FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
        FOREIGN KEY (teamID) REFERENCES Teams(id),
        FOREIGN KEY (opponentID) REFERENCES Teams(id)
    )
""")
# Debug: Verify table schema
cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
print("Table schema after creation:", [row[1] for row in cursor.fetchall()])

# Populate table with weekly data
inserted_count = 0
for key, data in pff_data.items():
    values = [data['playerId'], data['year'], data['week'], data['seasonType'], None, data['player'], data['team'], data['teamID'], data['player_game_count']] + [data.get(col) for col in BASE_METRIC_COLS] + [None] + [data.get(f"{col}_adjusted", None) for col in all_grades_cols]
    # Debug: Print column and value counts
    print(f"Columns: {len(['playerId', 'year', 'week', 'seasonType', 'opponentID', 'player', 'team', 'teamID', 'player_game_count'] + list(BASE_METRIC_COLS) + ['opponent_defense_rating'] + [f'{col}_adjusted' for col in all_grades_cols])}, Values: {len(values)}")
    try:
        query = f"""
            INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, week, seasonType, opponentID, player, team, teamID, player_game_count, {', '.join(BASE_METRIC_COLS)}, opponent_defense_rating, {', '.join(f'{col}_adjusted' for col in all_grades_cols)})
            VALUES ({', '.join('?' for _ in range(len(values)))})
        """
        cursor.execute(query, values)
        inserted_count += 1
    except sqlite3.OperationalError as e:
        print(f"Database error for playerId {data['playerId']}, week {data['week']}, seasonType {data['seasonType']}: {e}")

# Debug: Check populated teamID and opponentID
cursor.execute(f"SELECT playerId, week, seasonType, teamID, opponentID FROM {TABLE_NAME} LIMIT 5")
print("Sample data after insertion:", cursor.fetchall())

# Populate opponentID post-insertion using teamID from Teams_Games
opponent_updated_count = 0
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
opponent_updated_count = cursor.rowcount
print(f"Updated {opponent_updated_count} records with opponentID.")

# Populate opponent_defense_rating post-insertion using opponentID from Teams_Ratings_SP
defense_updated_count = 0
cursor.execute(f"""
    UPDATE {TABLE_NAME}
    SET opponent_defense_rating = COALESCE((
        SELECT trs.defense_rating
        FROM Teams_Ratings_SP trs
        WHERE trs.teamID = {TABLE_NAME}.opponentID
          AND trs.year = {TABLE_NAME}.year
        LIMIT 1
    ), ?) -- Fallback to national average if NULL
    WHERE opponent_defense_rating IS NULL
""", (40.0,))  # National average as fallback
defense_updated_count = cursor.rowcount
print(f"Updated {defense_updated_count} records with opponent_defense_rating.")

# Populate adjusted metrics post-insertion using original metrics and opponent_defense_rating
adjusted_count = 0
# Fetch mean defense rating from Teams_Ratings_SP (national average)
cursor.execute("SELECT defense_rating FROM Teams_Ratings_SP WHERE team = 'nationalAverages' AND year = 2024")
mean_defense_rating_row = cursor.fetchone()
mean_defense_rating = float(mean_defense_rating_row[0]) if mean_defense_rating_row else 40.0 # Use national average as default
for col in all_grades_cols:
    cursor.execute(f"""
        UPDATE {TABLE_NAME}
        SET {col}_adjusted = (
            CASE
                WHEN COALESCE(opponent_defense_rating, ?) > ? THEN -- Worse defense (higher than national average)
                    {col} * (1 - (SQRT((COALESCE(opponent_defense_rating, ?) - ?) / ?) * 0.10))  -- Discount up to 5%
                WHEN COALESCE(opponent_defense_rating, ?) < ? THEN -- Better defense (lower than national average)
                    {col} * (1 + (SQRT((? - COALESCE(opponent_defense_rating, ?)) / ?) * 0.10))  -- Premium up to 5%
                ELSE {col} -- Equal to national average, no adjustment
            END
        )
        WHERE {col}_adjusted IS NULL
    """, (mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating,
          mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating, mean_defense_rating))
    adjusted_count += cursor.rowcount
print(f"Updated {adjusted_count} records with adjusted metrics.")

conn.commit()
conn.close()
print(f"Weekly data populated for {TABLE_NAME}")