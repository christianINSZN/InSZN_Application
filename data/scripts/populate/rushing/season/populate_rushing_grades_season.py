import sqlite3
import os
import csv
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
try:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
except sqlite3.Error as e:
    print(f"Database connection failed: {e}")
    exit(1)

# Define table for Rushing Concept Season data
TABLE_NAME = "Players_RushingGrades_Season"

# Drop and recreate table
try:
    cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
    cursor.execute(f"""
        CREATE TABLE {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            player TEXT NOT NULL,
            team TEXT NOT NULL,
            teamID INTEGER,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
            FOREIGN KEY (teamID) REFERENCES Teams(id)
        )
    """)
except sqlite3.Error as e:
    print(f"Table creation failed: {e}")
    conn.close()
    exit(1)

# Fetch existing player data from Players_Basic with PFF ID and teamID for RBs
try:
    cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('QB', 'RB')")
    players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}
except sqlite3.Error as e:
    print(f"Query failed: {e}")
    conn.close()
    exit(1)

# Load Rushing Concept season data and dynamically build metric columns
pff_data = {}
BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Rushing/SeasonReports")
BASE_METRIC_COLS = set()
EXCLUDED_COLS = {"player", "player_id", "position", "team_name"}
REQUIRED_COLS = {"yards"}
if not BASE_DIR.exists():
    print(f"Directory {BASE_DIR} does not exist")
    conn.close()
    exit(1)
for csv_file in BASE_DIR.glob("*_RushingGrades.csv"):
    file_parts = csv_file.stem.split('_')
    if len(file_parts) >= 2 and file_parts[-1] == "RushingGrades":
        try:
            year = int(file_parts[0])
        except ValueError:
            print(f"Skipping {csv_file.name}: Invalid year in filename")
            continue
        try:
            with open(csv_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                if "player_id" not in reader.fieldnames:
                    print(f"Skipping {csv_file.name}: Missing player_id column")
                    continue
                metric_cols = set(col for col in reader.fieldnames if col not in EXCLUDED_COLS)
                metric_cols.update(col for col in reader.fieldnames if col in REQUIRED_COLS)
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
                        metrics = {col: float(row.get(col)) if row.get(col) and row.get(col).replace('.', '').replace('-', '').isdigit() else None for col in metric_cols}
                        if (player_id, year) not in pff_data:
                            pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'player': player_name, 'team': team, 'teamID': teamID}
                        for col in metric_cols:
                            if metrics[col] is not None:
                                pff_data[(player_id, year)][col] = metrics[col]
        except Exception as e:
            print(f"Error processing {csv_file.name}: {e}")
            continue

# Add discovered metric columns to the table
try:
    cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
    existing_cols = {row[1] for row in cursor.fetchall()}
    for col in BASE_METRIC_COLS - existing_cols:
        if col not in {'playerId', 'year', 'player', 'team', 'teamID'}:
            try:
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
            except sqlite3.OperationalError as e:
                print(f"Warning: Could not add column {col}: {e}")
except sqlite3.Error as e:
    print(f"Error querying table info: {e}")
    conn.close()
    exit(1)

# Populate table with season data
try:
    for key, data in pff_data.items():
        values = [data['playerId'], data['year'], data['player'], data['team'], data['teamID']] + [data.get(col) for col in BASE_METRIC_COLS]
        query = f"""
            INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, player, team, teamID, {', '.join(BASE_METRIC_COLS)})
            VALUES ({', '.join('?' for _ in range(len(values)))})
        """
        cursor.execute(query, values)
    conn.commit()
    print(f"Season data populated for {TABLE_NAME} with {len(pff_data)} records")
except sqlite3.Error as e:
    print(f"Insert failed: {e}")
    conn.rollback()
finally:
    conn.close()