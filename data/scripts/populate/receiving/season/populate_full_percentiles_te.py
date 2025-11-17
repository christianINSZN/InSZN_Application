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
MIN_TARGETS_THRESHOLD = 6
TABLE_NAME = "Players_Full_Percentiles_TE_Receiving"
CSV_FILES_2024 = [
"2024_ReceivingConcept.csv",
"2024_ReceivingDepth.csv",
"2024_ReceivingGrades.csv",
"2024_ReceivingScheme.csv"
]
try:
    # Drop and recreate table to ensure TER column exists
    cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
    cursor.execute(f"""
        CREATE TABLE {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            targets INTEGER,
            percentile_targets INTEGER,
            TER REAL,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId)
        )
    """)
    # Fetch existing player data from Players_Basic, keyed by (player_id_PFF, year)
    cursor.execute("SELECT playerId, player_id_PFF, name, team, year FROM Players_Basic WHERE position IN ('TE')")
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
        if col not in {'playerId', 'year', 'name', 'team', 'targets', 'TER'}:
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
    
    # *** NOW CALCULATE TER - AFTER DATA EXISTS ***
    print("\n=== CALCULATING TER ===")
    TER_metrics = ['grades_pass_route', 'yprr', 'yards_after_catch', 'contested_catch_rate', 'drop_rate', 'fumbles', 'yards', 'targets']
    volume_metrics = ['yards_after_catch', 'yards', 'fumbles', 'targets']
    historical = {}
    print("Computing historical stats...")
    for metric in TER_metrics:
        if metric in volume_metrics:
            cursor.execute(f"""
                SELECT AVG({metric}/player_game_count),
                       (AVG( ({metric}/player_game_count)*({metric}/player_game_count) ) - POW(AVG({metric}/player_game_count), 2)) * COUNT(*) / (COUNT(*) - 1)
                FROM {TABLE_NAME}
                WHERE targets >= {MIN_TARGETS_THRESHOLD} AND {metric} IS NOT NULL AND player_game_count > 0
            """)
        else:
            cursor.execute(f"""
                SELECT AVG({metric}),
                       (AVG({metric}*{metric}) - POW(AVG({metric}), 2)) * COUNT({metric}) / (COUNT({metric}) - 1)
                FROM {TABLE_NAME}
                WHERE targets >= {MIN_TARGETS_THRESHOLD} AND {metric} IS NOT NULL
            """)
        result = cursor.fetchone()
        if result:
            mean = result[0] if result[0] is not None else 0.0
            variance = result[1] if result[1] is not None else 1.0
            std = (variance ** 0.5) if variance > 0 else 1.0
            historical[metric] = {'mean': mean, 'std': std}
            print(f"{metric}: mean={mean:.2f}, std={std:.2f}")
        else:
            print(f"Warning: No data for {metric}; skipping")
            historical[metric] = {'mean': 0.0, 'std': 1.0}
    
    # Weights for each metric (total = 1.0, fumbles = negative)
    weights = {
        'grades_pass_route': 0.25,      # PFF receiving grade
        'yprr': 0.10,                   # Yards per route run
        'yards_after_catch': 0.20,      # YAC volume
        'contested_catch_rate': 0.10,   # 50/50 ball wins
        'drop_rate': -0.05,             # Negative: drops hurt
        'yards': 0.25,            # Chain-moving
        'targets': 0.10,
        'fumbles': -0.05                # Fumble penalty
    }
    
    # Fetch qualified players and compute TER row-by-row
    cursor.execute(f"""
        SELECT playerId, year, name, player_game_count, {', '.join(TER_metrics)}
        FROM {TABLE_NAME}
        WHERE targets >= {MIN_TARGETS_THRESHOLD}
    """)
    qualified_rows = cursor.fetchall()
    print(f"Found {len(qualified_rows)} qualified rows for TER calculation")
    
    updated_count = 0
    for row in qualified_rows:
        playerId, year, name, games, *metric_values = row
        if games is None or games <= 0:
            continue
        weighted_z = 0.0
        for i, metric in enumerate(TER_metrics):
            raw_value = metric_values[i]
            if raw_value is None:
                z = 0.0
            else:
                h = historical[metric]
                if metric in volume_metrics:
                    value = raw_value / games
                else:
                    value = raw_value
                z = (value - h['mean']) / h['std']
            weighted_z += weights[metric] * z
        
        TER = max(0, min(100, ((weighted_z + 3) / 6.0) * 100))
        
        cursor.execute(f"""
            UPDATE {TABLE_NAME} SET TER = ? WHERE playerId = ? AND year = ?
        """, (TER, playerId, year))
        
        if cursor.rowcount > 0:
            updated_count += 1
            if updated_count <= 5:
                print(f"Updated {name} ({year}): TER={TER:.1f} (weighted_z={weighted_z:.2f})")
    
    print(f"Updated {updated_count} rows with TER values")
    
    # Debug: Check final state
    cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE TER IS NOT NULL")
    non_null_count = cursor.fetchone()[0]
    print(f"Total rows with non-NULL TER: {non_null_count}")
    if non_null_count > 0:
        cursor.execute(f"SELECT name, year, TER FROM {TABLE_NAME} WHERE TER IS NOT NULL ORDER BY TER DESC LIMIT 5")
        top_players = cursor.fetchall()
        print("Top 5 TER players:")
        for row in top_players:
            print(f"  {row[0]} ({row[1]}): {row[2]:.1f}")
        
    conn.commit()
    print(f"Populated {TABLE_NAME} successfully")
except sqlite3.Error as e:
    print(f"Database error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"Unexpected error: {e}")
    import traceback
    traceback.print_exc()
finally:
    conn.close()