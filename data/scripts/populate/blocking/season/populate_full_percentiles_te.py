import sqlite3
import os
import csv
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define constants
MIN_BLOCKS_THRESHOLD = 20

# Define table for Full Percentiles (TE) Blocking data
TABLE_NAME = "Players_Full_Percentiles_TE_Blocking"

try:
    # Drop and recreate table to avoid duplicate column issues
    cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            teamID INTEGER,
            snap_counts_block INTEGER,
            percentile_snap_counts_block INTEGER,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
            FOREIGN KEY (teamID) REFERENCES Teams(id)
        )
    """)

    # Fetch existing player data from Players_Basic with PFF ID and teamID for TEs
    cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('TE')")
    players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}

    # Load PFF data and dynamically build metric columns
    pff_data = {}
    BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Blocking/SeasonReports/")
    BASE_METRIC_COLS = set()
    EXCLUDED_COLS = {"player", "player_id", "position", "team_name", "player_game_count", "franchise_id", "declined_penalties", "penalties"}
    if not BASE_DIR.exists():
        print(f"Directory {BASE_DIR} does not exist")
        conn.close()
        exit(1)
    for csv_file in BASE_DIR.glob("*.csv"):
        try:
            year = int(csv_file.stem.split('_')[0])
        except (IndexError, ValueError) as e:
            print(f"Skipping {csv_file.name}: Invalid year format - {e}")
            continue
        try:
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
                        team = players_basic[pff_id]['team']
                        name = players_basic[pff_id]['name'].lower()
                        teamID = players_basic[pff_id]['teamID']
                        snap_counts_block = float(row.get('snap_counts_block', 0)) if row.get('snap_counts_block') and row.get('snap_counts_block').replace('.', '').replace('-', '').isdigit() else None
                        metrics = {col: float(row.get(col, 0)) if row.get(col) and row.get(col).replace('.', '').replace('-', '').isdigit() else None for col in metric_cols}
                        if (player_id, year) not in pff_data:
                            pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'name': name, 'team': team, 'teamID': teamID, 'snap_counts_block': snap_counts_block}
                        for col in metric_cols:
                            if metrics[col] is not None:
                                pff_data[(player_id, year)][col] = metrics[col]
        except Exception as e:
            print(f"Error processing {csv_file.name}: {e}")
            continue

    # Add discovered metric columns to the table (avoid duplicates)
    cursor.execute(f"PRAGMA table_info({TABLE_NAME})")
    existing_cols = {row[1] for row in cursor.fetchall()}
    for col in BASE_METRIC_COLS - existing_cols:
        if col not in {'playerId', 'year', 'name', 'team', 'teamID', 'snap_counts_block', 'percentile_snap_counts_block'}:
            try:
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN percentile_{col} INTEGER")
            except sqlite3.OperationalError as e:
                print(f"Warning: Could not add column {col} or percentile_{col}: {e}")

    # Populate table with initial data (metrics)
    for key, data in pff_data.items():
        values = [data['playerId'], data['year'], data['name'], data['team'], data['teamID'], data.get('snap_counts_block')] + [data.get(col) for col in BASE_METRIC_COLS]
        query = f"""
            INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, name, team, teamID, snap_counts_block, {', '.join(BASE_METRIC_COLS)})
            VALUES ({', '.join('?' for _ in range(len(values)))})
        """
        cursor.execute(query, values)

    # Calculate percentiles using min-max normalization per year, filtering by MIN_BLOCKS_THRESHOLD
    cursor.execute(f"SELECT DISTINCT year FROM {TABLE_NAME}")
    years = [row[0] for row in cursor.fetchall()]
    for year in years:
        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE year = {year} AND snap_counts_block > {MIN_BLOCKS_THRESHOLD}")
        total_qualified_players = cursor.fetchone()[0]
        if total_qualified_players == 0:
            continue
        for metric in BASE_METRIC_COLS:
            cursor.execute(f"""
                WITH Stats AS (
                    SELECT MIN({metric}) AS min_value, MAX({metric}) AS max_value
                    FROM {TABLE_NAME}
                    WHERE {metric} IS NOT NULL
                    AND year = {year}
                    AND snap_counts_block > {MIN_BLOCKS_THRESHOLD}
                )
                SELECT min_value, max_value FROM Stats
            """)
            stats = cursor.fetchone()
            if stats and stats[0] is not None and stats[1] is not None:
                min_value, max_value = stats
                cursor.execute(f"""
                    UPDATE {TABLE_NAME}
                    SET percentile_{metric} = (
                        CASE
                            WHEN {max_value} = {min_value}
                            THEN 50
                            ELSE ROUND(
                                CASE
                                    WHEN {metric} IS NULL THEN NULL
                                    ELSE ({metric} - {min_value}) * 100.0 /
                                         NULLIF({max_value} - {min_value}, 0)
                                END
                            )
                        END
                    )
                    WHERE {metric} IS NOT NULL
                    AND year = {year}
                    AND snap_counts_block > {MIN_BLOCKS_THRESHOLD};
                """)
            else:
                print(f"No valid stats for {metric} in {year}, percentiles set to NULL")
except sqlite3.Error as e:
    print(f"Database error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    conn.commit()
    conn.close()
print(f"Proof of concept completed for {TABLE_NAME}")