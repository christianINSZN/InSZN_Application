import sqlite3
import os
import csv
import re
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define constants
MIN_TARGETS_THRESHOLD = 5
TABLE_NAME = "Players_Full_Percentiles_WR"
CSV_FILES_2024 = [
    "2024_ReceivingConcept.csv",
    "2024_ReceivingDepth.csv",
    "2024_ReceivingGrades.csv",
    "2024_ReceivingScheme.csv"
]

try:
    # Create table if it doesn't exist
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            targets INTEGER,
            percentile_targets INTEGER,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId)
        )
    """)

    # Fetch existing player data from Players_Basic, keyed by (player_id_PFF, year)
    cursor.execute("SELECT playerId, player_id_PFF, name, team, year FROM Players_Basic WHERE position IN ('WR')")
    players_basic = {(row[1], row[4]): {'playerId': row[0], 'name': row[2], 'team': row[3]} for row in cursor.fetchall() if row[1]}

    # Load PFF data and build metric columns from 2024 CSVs only
    pff_data = {}
    BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Receiving/SeasonReports/")
    BASE_METRIC_COLS = set()
    EXCLUDED_COLS = {"player", "player_id", "position", "team_name", "franchise_id", "declined_penalties", "penalties"}

    if not BASE_DIR.exists():
        print(f"Error: PFF data directory {BASE_DIR} does not exist")
        conn.close()
        exit(1)

    def is_valid_column_name(col):
        return re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', col) is not None

    # Step 1: Load metrics from 2024 CSVs only
    for csv_name in CSV_FILES_2024:
        csv_file = BASE_DIR / csv_name
        if csv_file.exists():
            with open(csv_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                if "player_id" not in reader.fieldnames:
                    print(f"Error: {csv_file} missing player_id column")
                    continue
                metric_cols = set(col for col in reader.fieldnames if col not in EXCLUDED_COLS and is_valid_column_name(col))
                if not metric_cols:
                    print(f"Error: {csv_file} has no valid metric columns")
                    continue
                BASE_METRIC_COLS.update(metric_cols)
        else:
            print(f"Error: {csv_file} not found")
            continue

    if not BASE_METRIC_COLS:
        print("Error: No valid metrics found in 2024 CSVs")
        conn.close()
        exit(1)

    # Add 2024 metric columns to the table
    cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
    existing_cols = {row[1] for row in cursor.fetchall()}
    for col in BASE_METRIC_COLS - existing_cols:
        if col not in {'playerId', 'year', 'name', 'team', 'targets'}:
            try:
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN percentile_{col} INTEGER")
            except sqlite3.OperationalError as e:
                print(f"Warning: Could not add column {col} or percentile_{col}: {e}")

    # Step 2: Process all CSVs, using only 2024 metrics
    for csv_file in BASE_DIR.glob("*.csv"):
        try:
            year = int(csv_file.stem.split('_')[0])
            print(f"Processing CSV: {csv_file} for year {year}")
            with open(csv_file, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                if "player_id" not in reader.fieldnames:
                    print(f"Skipping {csv_file}: missing player_id column")
                    continue
                for row in reader:
                    pff_id = row.get("player_id")
                    if (pff_id, year) not in players_basic:
                        print(f"Warning: PFF ID {pff_id} for year {year} not found in Players_Basic")
                        continue
                    player_id = players_basic[(pff_id, year)]['playerId']
                    team = players_basic[(pff_id, year)]['team']
                    name = players_basic[(pff_id, year)]['name'].lower()
                    targets = float(row.get('targets', 0)) if row.get('targets') and row.get('targets').replace('.', '').replace('-', '').isdigit() else None
                    metrics = {col: float(row.get(col, 0)) if row.get(col) and row.get(col).replace('.', '').replace('-', '').isdigit() else None for col in BASE_METRIC_COLS}
                    if (player_id, year) not in pff_data:
                        pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'name': name, 'team': team, 'targets': targets}
                    for col in BASE_METRIC_COLS:
                        if metrics[col] is not None:
                            pff_data[(player_id, year)][col] = metrics[col]
        except Exception as e:
            print(f"Error processing {csv_file}: {e}")
            continue

    # Populate table with data, using only existing columns
    cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
    existing_cols = {row[1] for row in cursor.fetchall()}
    valid_metric_cols = {col for col in BASE_METRIC_COLS if col in existing_cols}
    print(f"Valid metrics: {valid_metric_cols}")

    # Insert new rows or update existing rows
    for key, data in pff_data.items():
        cursor.execute(f"SELECT 1 FROM {TABLE_NAME} WHERE playerId = ? AND year = ?", (data['playerId'], data['year']))
        exists = cursor.fetchone()
        if exists:
            # Update existing row
            update_cols = ['targets'] + list(valid_metric_cols)
            update_query = f"""
                UPDATE {TABLE_NAME}
                SET {', '.join(f'{col} = ?' for col in update_cols)}
                WHERE playerId = ? AND year = ?
            """
            update_values = [data.get(col) for col in update_cols] + [data['playerId'], data['year']]
            cursor.execute(update_query, update_values)
        else:
            # Insert new row
            insert_cols = ['playerId', 'year', 'name', 'team', 'targets'] + list(valid_metric_cols)
            insert_values = [data['playerId'], data['year'], data['name'], data['team'], data.get('targets')] + [data.get(col) for col in valid_metric_cols]
            insert_query = f"""
                INSERT INTO {TABLE_NAME} ({', '.join(insert_cols)})
                VALUES ({', '.join('?' for _ in range(len(insert_values)))})
            """
            cursor.execute(insert_query, insert_values)

    # Calculate percentiles per year
    cursor.execute(f"SELECT DISTINCT year FROM {TABLE_NAME}")
    years = [row[0] for row in cursor.fetchall()]
    for year in years:
        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE year = {year} AND targets > {MIN_TARGETS_THRESHOLD}")
        total_qualified_players = cursor.fetchone()[0]
        if total_qualified_players == 0:
            print(f"Skipping percentiles for year {year}: no players meet targets threshold")
            continue
        for metric in valid_metric_cols | {'targets'}:
            cursor.execute(f"""
                WITH Stats AS (
                    SELECT MIN({metric}) AS min_value, MAX({metric}) AS max_value
                    FROM {TABLE_NAME}
                    WHERE {metric} IS NOT NULL
                    AND year = {year}
                    AND targets > {MIN_TARGETS_THRESHOLD}
                )
                SELECT min_value, max_value FROM Stats
            """)
            stats = cursor.fetchone()
            if stats and stats[0] is not None and stats[1] is not None and stats[1] != stats[0]:
                min_value, max_value = stats
                cursor.execute(f"""
                    UPDATE {TABLE_NAME}
                    SET percentile_{metric} = ROUND(
                        ({metric} - {min_value}) * 100.0 / ({max_value} - {min_value}),
                        2
                    )
                    WHERE {metric} IS NOT NULL
                    AND year = {year}
                    AND targets > {MIN_TARGETS_THRESHOLD}
                """)
            else:
                print(f"Skipping percentile for {metric} in {year}: insufficient data")

    conn.commit()
    print(f"Populated {TABLE_NAME} successfully")

except sqlite3.Error as e:
    print(f"Database error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.close()