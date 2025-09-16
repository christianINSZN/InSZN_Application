import sqlite3
import os
import csv
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define table for Receiving Grades Season data
TABLE_NAME = "Players_DefenseCoverageGrades_Season"

# Drop and recreate table
cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
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

# Fetch existing player data from Players_Basic with PFF ID and teamID for defensive positions
cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('S', 'CB', 'LB', 'DB', 'DE', 'DL', 'EDGE', 'DT')")
players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}

# Load Receiving Grades season data and dynamically build metric columns
pff_data = {}
BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Defense/SeasonReports/")
BASE_METRIC_COLS = set()
EXCLUDED_COLS = {"player", "player_id", "position", "team_name"}
REQUIRED_COLS = {"player_game_count"}
if BASE_DIR.exists():
    for csv_file in BASE_DIR.glob("*_CoverageGrades.csv"):
        file_parts = csv_file.stem.split('_')
        if len(file_parts) >= 2 and file_parts[-1] == "CoverageGrades":
            try:
                year = int(file_parts[0])
            except ValueError:
                print(f"Skipping {csv_file.name}: Invalid year in filename")
                continue
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
                        metrics = {}
                        for col in metric_cols:
                            value = row.get(col)
                            if value and value.replace('.', '').replace('-', '').isdigit():
                                metrics[col] = float(value)
                            else:
                                metrics[col] = 0 if value == '' else None
                        if (player_id, year) not in pff_data:
                            pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'player': player_name, 'team': team, 'teamID': teamID}
                        for col in metric_cols:
                            if metrics[col] is not None:
                                pff_data[(player_id, year)][col] = metrics[col]
else:
    print(f"Directory {BASE_DIR} does not exist")

# Add discovered metric columns to the table
cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
existing_cols = {row[1] for row in cursor.fetchall()}
for col in BASE_METRIC_COLS - existing_cols:
    if col not in {'playerId', 'year', 'player', 'team', 'teamID'}:
        try:
            cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
        except sqlite3.OperationalError as e:
            print(f"Warning: Could not add column {col}: {e}")

# Populate table with season data
for key, data in pff_data.items():
    values = [data['playerId'], data['year'], data['player'], data['team'], data['teamID']] + [data.get(col, 0) for col in BASE_METRIC_COLS]
    query = f"""
        INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, player, team, teamID, {', '.join(BASE_METRIC_COLS)})
        VALUES ({', '.join('?' for _ in range(len(values)))})
    """
    try:
        cursor.execute(query, values)
    except sqlite3.Error as e:
        print(f"Error inserting data for playerId {data['playerId']}, year {data['year']}: {e}")
conn.commit()
print(f"Total rows inserted/updated in {TABLE_NAME}: {cursor.rowcount}")
conn.close()
print(f"Season data populated for {TABLE_NAME}")