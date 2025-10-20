import sqlite3
import os
import csv
from pathlib import Path
# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()
# Define constants
MIN_TARGETS_THRESHOLD = 20
# Define table for Full Percentiles (RB) Receiving data
TABLE_NAME = "Players_Full_Percentiles_RB_Receiving"
try:
    # Drop and recreate table to ensure RRR column exists
    cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            teamID INTEGER,
            targets INTEGER,
            percentile_targets INTEGER,
            RRR REAL,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
            FOREIGN KEY (teamID) REFERENCES Teams(id)
        )
    """)
    # Fetch existing player data from Players_Basic with PFF ID and teamID for RBs
    cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('RB')")
    players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}
    # Load PFF data and dynamically build metric columns
    pff_data = {}
    BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Receiving/SeasonReports/")
    BASE_METRIC_COLS = set()
    EXCLUDED_COLS = {"player", "player_id", "position", "team_name", "franchise_id", "declined_penalties", "penalties"}
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
                        targets = float(row.get('targets', 0)) if row.get('targets') and row.get('targets').replace('.', '').replace('-', '').isdigit() else None
                        metrics = {col: float(row.get(col, 0)) if row.get(col) and row.get(col).replace('.', '').replace('-', '').isdigit() else None for col in metric_cols}
                        if (player_id, year) not in pff_data:
                            pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'name': name, 'team': team, 'teamID': teamID, 'targets': targets}
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
        if col not in {'playerId', 'year', 'name', 'team', 'teamID', 'targets', 'percentile_targets', 'RRR'}:
            try:
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN percentile_{col} INTEGER")
            except sqlite3.OperationalError as e:
                print(f"Warning: Could not add column {col} or percentile_{col}: {e}")
    # Populate table with initial data (metrics)
    for key, data in pff_data.items():
        values = [data['playerId'], data['year'], data['name'], data['team'], data['teamID'], data.get('targets')] + [data.get(col) for col in BASE_METRIC_COLS]
        query = f"""
            INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, name, team, teamID, targets, {', '.join(BASE_METRIC_COLS)})
            VALUES ({', '.join('?' for _ in range(len(values)))})
        """
        cursor.execute(query, values)
    # Calculate percentiles using min-max normalization per year, filtering by MIN_TARGETS_THRESHOLD
    cursor.execute(f"SELECT DISTINCT year FROM {TABLE_NAME}")
    years = [row[0] for row in cursor.fetchall()]
    for year in years:
        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE year = {year} AND targets > {MIN_TARGETS_THRESHOLD}")
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
                    AND targets > {MIN_TARGETS_THRESHOLD}
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
                    AND targets > {MIN_TARGETS_THRESHOLD};
                """)
            else:
                print(f"No valid stats for {metric} in {year}, percentiles set to NULL")
    
    # *** NOW CALCULATE RRR - AFTER DATA EXISTS ***
    print("\n=== CALCULATING RRR ===")
    rrr_metrics = ['grades_pass_route', 'yprr', 'yards_after_catch', 'contested_catch_rate', 'drop_rate', 'first_downs', 'fumbles']
    volume_metrics = ['yards_after_catch', 'first_downs', 'fumbles']
    historical = {}
    print("Computing historical stats...")
    for metric in rrr_metrics:
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
        'grades_pass_route': 0.20,      # PFF receiving grade
        'yprr': 0.20,                   # Yards per route run
        'yards_after_catch': 0.15,      # YAC volume
        'contested_catch_rate': 0.15,   # 50/50 ball wins
        'drop_rate': -0.10,             # Negative: drops hurt
        'first_downs': 0.15,            # Chain-moving
        'fumbles': -0.05                # Fumble penalty
    }
    
    # Fetch qualified players and compute RRR row-by-row
    cursor.execute(f"""
        SELECT playerId, year, name, player_game_count, {', '.join(rrr_metrics)}
        FROM {TABLE_NAME}
        WHERE targets >= {MIN_TARGETS_THRESHOLD}
    """)
    qualified_rows = cursor.fetchall()
    print(f"Found {len(qualified_rows)} qualified rows for RRR calculation")
    
    updated_count = 0
    for row in qualified_rows:
        playerId, year, name, games, *metric_values = row
        if games is None or games <= 0:
            continue
        weighted_z = 0.0
        for i, metric in enumerate(rrr_metrics):
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
        
        rrr = max(0, min(100, ((weighted_z + 3) / 6.0) * 100))
        
        cursor.execute(f"""
            UPDATE {TABLE_NAME} SET RRR = ? WHERE playerId = ? AND year = ?
        """, (rrr, playerId, year))
        
        if cursor.rowcount > 0:
            updated_count += 1
            if updated_count <= 5:
                print(f"Updated {name} ({year}): RRR={rrr:.1f} (weighted_z={weighted_z:.2f})")
    
    print(f"Updated {updated_count} rows with RRR values")
    
    # Debug: Check final state
    cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE RRR IS NOT NULL")
    non_null_count = cursor.fetchone()[0]
    print(f"Total rows with non-NULL RRR: {non_null_count}")
    if non_null_count > 0:
        cursor.execute(f"SELECT name, year, RRR FROM {TABLE_NAME} WHERE RRR IS NOT NULL ORDER BY RRR DESC LIMIT 5")
        top_players = cursor.fetchall()
        print("Top 5 RRR players:")
        for row in top_players:
            print(f"  {row[0]} ({row[1]}): {row[2]:.1f}")
        
    conn.commit()
    print(f"Proof of concept completed for {TABLE_NAME}")
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