import sqlite3
import os
import csv
from pathlib import Path
# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()
# Define constants
MIN_SNAPS_THRESHOLD = 40
# Define table for Full Percentiles (S) Defense data
TABLE_NAME = "Players_Full_Percentiles_S"
try:
    # Drop and recreate table to ensure SR column exists
    cursor.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            playerId INTEGER NOT NULL,
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            teamID INTEGER,
            snap_counts_defense INTEGER,
            percentile_snap_counts_defense INTEGER,
            SR REAL,
            PRIMARY KEY (playerId, year),
            FOREIGN KEY (playerId) REFERENCES Players_Basic(playerId),
            FOREIGN KEY (teamID) REFERENCES Teams(id)
        )
    """)
    # Fetch existing player data from Players_Basic with PFF ID and teamID for Ss
    cursor.execute("SELECT playerId, player_id_PFF, name, team, teamID FROM Players_Basic WHERE position IN ('S')")
    players_basic = {row[1]: {'playerId': row[0], 'name': row[2], 'team': row[3], 'teamID': row[4]} for row in cursor.fetchall() if row[1]}
    # Load PFF data and dynamically build metric columns
    pff_data = {}
    BASE_DIR = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Defense/SeasonReports/")
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
                        snap_counts_defense = float(row.get('snap_counts_defense', 0)) if row.get('snap_counts_defense') and row.get('snap_counts_defense').replace('.', '').replace('-', '').isdigit() else None
                        metrics = {col: float(row.get(col, 0)) if row.get(col) and row.get(col).replace('.', '').replace('-', '').isdigit() else None for col in metric_cols}
                        if (player_id, year) not in pff_data:
                            pff_data[(player_id, year)] = {'playerId': player_id, 'year': year, 'name': name, 'team': team, 'teamID': teamID, 'snap_counts_defense': snap_counts_defense}
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
        if col not in {'playerId', 'year', 'name', 'team', 'teamID', 'snap_counts_defense', 'percentile_snap_counts_defense', 'SR'}:
            try:
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN {col} REAL")
                cursor.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN percentile_{col} INTEGER")
            except sqlite3.OperationalError as e:
                print(f"Warning: Could not add column {col} or percentile_{col}: {e}")
    # Populate table with initial data (metrics)
    for key, data in pff_data.items():
        values = [data['playerId'], data['year'], data['name'], data['team'], data['teamID'], data.get('snap_counts_defense')] + [data.get(col) for col in BASE_METRIC_COLS]
        query = f"""
            INSERT OR REPLACE INTO {TABLE_NAME} (playerId, year, name, team, teamID, snap_counts_defense, {', '.join(BASE_METRIC_COLS)})
            VALUES ({', '.join('?' for _ in range(len(values)))})
        """
        cursor.execute(query, values)
    # Calculate percentiles using min-max normalization per year, filtering by MIN_SNAPS_THRESHOLD
    cursor.execute(f"SELECT DISTINCT year FROM {TABLE_NAME}")
    years = [row[0] for row in cursor.fetchall()]
    for year in years:
        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE year = {year} AND snap_counts_defense > {MIN_SNAPS_THRESHOLD}")
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
                    AND snap_counts_defense > {MIN_SNAPS_THRESHOLD}
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
                    AND snap_counts_defense > {MIN_SNAPS_THRESHOLD};
                """)
            else:
                print(f"No valid stats for {metric} in {year}, percentiles set to NULL")
    
    # *** NOW CALCULATE SR - AFTER DATA EXISTS ***
    print("\n=== CALCULATING SR ===")
    sr_metrics = ['grades_coverage_defense', 'forced_incompletion_rate', 'coverage_percent', 'pass_break_ups', 'interceptions', 'yards_per_coverage_snap', 'snap_counts_coverage', 'missed_tackle_rate']
    volume_metrics = ['snap_counts_coverage', 'pass_break_ups', 'interceptions']
    historical = {}
    print("Computing historical stats...")
    for metric in sr_metrics:
        if metric in volume_metrics:
            cursor.execute(f"""
                SELECT AVG({metric}/player_game_count),
                       (AVG( ({metric}/player_game_count)*({metric}/player_game_count) ) - POW(AVG({metric}/player_game_count), 2)) * COUNT(*) / (COUNT(*) - 1)
                FROM {TABLE_NAME}
                WHERE snap_counts_defense >= {MIN_SNAPS_THRESHOLD} AND {metric} IS NOT NULL AND player_game_count > 0
            """)
        else:
            cursor.execute(f"""
                SELECT AVG({metric}),
                       (AVG({metric}*{metric}) - POW(AVG({metric}), 2)) * COUNT({metric}) / (COUNT({metric}) - 1)
                FROM {TABLE_NAME}
                WHERE snap_counts_defense >= {MIN_SNAPS_THRESHOLD} AND {metric} IS NOT NULL
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
    
    # Weights for S metrics (total = 1.0)
    weights = {
        'grades_coverage_defense': 0.50,        # PFF coverage grade
        'forced_incompletion_rate': 0.15,       # Incompletion %
        'coverage_percent': 0.10,               # Coverage snaps %
        'pass_break_ups': 0.10,                 # PBUs/game
        'interceptions': 0.15,                  # INTs/game
        'yards_per_coverage_snap': -0.10,       # Yards allowed penalty
        'snap_counts_coverage': 0.25,           # Coverage snaps/game
        'missed_tackle_rate': -0.05             # Tackle penalty
    }
    
    # Fetch qualified players and compute SR row-by-row
    cursor.execute(f"""
        SELECT playerId, year, name, player_game_count, {', '.join(sr_metrics)}
        FROM {TABLE_NAME}
        WHERE snap_counts_defense >= {MIN_SNAPS_THRESHOLD}
    """)
    qualified_rows = cursor.fetchall()
    print(f"Found {len(qualified_rows)} qualified rows for SR calculation")
    
    updated_count = 0
    for row in qualified_rows:
        playerId, year, name, games, *metric_values = row
        if games is None or games <= 0:
            continue
        weighted_z = 0.0
        for i, metric in enumerate(sr_metrics):
            raw_value = metric_values[i]
            if raw_value is None:
                z = 0.0
            else:
                h = historical[metric]
                if metric in volume_metrics:
                    value = raw_value / games  # Per game normalization
                else:
                    value = raw_value
                z = (value - h['mean']) / h['std']
            weighted_z += weights[metric] * z
        
        sr = max(0, min(100, ((weighted_z + 3) / 6.0) * 100))
        
        cursor.execute(f"""
            UPDATE {TABLE_NAME} SET SR = ? WHERE playerId = ? AND year = ?
        """, (sr, playerId, year))
        
        if cursor.rowcount > 0:
            updated_count += 1
            if updated_count <= 5:
                print(f"Updated {name} ({year}): SR={sr:.1f} (coverage_snaps/game={metric_values[6]/games:.1f}, weighted_z={weighted_z:.2f})")
    
    print(f"Updated {updated_count} rows with SR values")
    
    # Debug: Check final state
    cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE SR IS NOT NULL")
    non_null_count = cursor.fetchone()[0]
    print(f"Total rows with non-NULL SR: {non_null_count}")
    if non_null_count > 0:
        cursor.execute(f"SELECT name, year, SR, snap_counts_coverage/player_game_count FROM {TABLE_NAME} WHERE SR IS NOT NULL ORDER BY SR DESC LIMIT 5")
        top_players = cursor.fetchall()
        print("Top 5 SR players:")
        for row in top_players:
            print(f"  {row[0]} ({row[1]}): {row[2]:.1f} (coverage_snaps/game={row[3]:.1f})")
        
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