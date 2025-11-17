import sqlite3
import os
import csv
from pathlib import Path

# Configuration for position-specific CSV and stat mappings
GRADE_CONFIG = {
    "QB": {
        "csv_dir": "Passing/SeasonReports",
        "csv_file": "PassingGrades.csv",
        "stat_column": "grades_pass",
        "extra_columns": ["player_game_count", "completion_percent", "yards", "ypa", "touchdowns", "interceptions"],
        "additional_db_fields": [
            {"name": "QBR", "table": "Players_Full_Percentiles_QB"},
            {"name": "passing_snaps", "table": "Players_Full_Percentiles_QB"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "RB": {
        "csv_dir": "Rushing/SeasonReports",
        "csv_file": "RushingGrades.csv",
        "stat_column": "grades_run",
        "extra_columns": ["player_game_count", "fumbles", "yards", "ypa", "touchdowns", "attempts"],
        "additional_db_fields": [
            {"name": "RBR", "table": "Players_Full_Percentiles_RB_Rushing"},
            {"name": "run_plays", "table": "Players_Full_Percentiles_RB_Rushing"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "WR": {
        "csv_dir": "Receiving/SeasonReports",
        "csv_file": "ReceivingGrades.csv",
        "stat_column": "grades_pass_route",
        "extra_columns": ["player_game_count", "yards", "touchdowns", "yards_per_reception", "receptions"],
        "additional_db_fields": [
            {"name": "WRR", "table": "Players_Full_Percentiles_WR"},
            {"name": "routes", "table": "Players_Full_Percentiles_WR"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "TE": {
        "csv_dir": "Receiving/SeasonReports",
        "csv_file": "ReceivingGrades.csv",
        "stat_column": "grades_pass_route",
        "extra_columns": ["player_game_count", "yards", "touchdowns", "yards_per_reception", "receptions"],
        "additional_db_fields": [
            {"name": "TER", "table": "Players_Full_Percentiles_TE_Receiving"},
            {"name": "routes", "table": "Players_Full_Percentiles_TE_Receiving"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "C": {
        "csv_dir": "Blocking/SeasonReports",
        "csv_file": "BlockingGrades.csv",
        "stat_column": "grades_offense",
        "extra_columns": ["player_game_count", "grades_offense", "snap_counts_offense", "hurries_allowed", "pressures_allowed", "hits_allowed", "sacks_allowed", "pbe"],
        "additional_db_fields": [
            {"name": "CR", "table": "Players_Full_Percentiles_C_Blocking"},
            {"name": "snap_counts_block", "table": "Players_Full_Percentiles_C_Blocking"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "G": {
        "csv_dir": "Blocking/SeasonReports",
        "csv_file": "BlockingGrades.csv",
        "stat_column": "grades_offense",
        "extra_columns": ["player_game_count", "grades_offense", "snap_counts_offense", "hurries_allowed", "pressures_allowed", "hits_allowed", "sacks_allowed", "pbe"],
        "additional_db_fields": [
            {"name": "GR", "table": "Players_Full_Percentiles_G_Blocking"},
            {"name": "snap_counts_block", "table": "Players_Full_Percentiles_G_Blocking"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "T": {
        "csv_dir": "Blocking/SeasonReports",
        "csv_file": "BlockingGrades.csv",
        "stat_column": "grades_offense",
        "extra_columns": ["player_game_count", "grades_offense", "snap_counts_offense", "hurries_allowed", "pressures_allowed", "hits_allowed", "sacks_allowed", "pbe"],
        "additional_db_fields": [
            {"name": "TR", "table": "Players_Full_Percentiles_T_Blocking"},
            {"name": "snap_counts_block", "table": "Players_Full_Percentiles_T_Blocking"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "LB": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "DefenseGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "grades_defense", "hits", "hurries", "sacks", "snap_counts_defense", "stops", "tackles", "tackles_for_loss", "total_pressures", "grades_coverage_defense"],
        "additional_db_fields": [
            {"name": "LBR", "table": "Players_Full_Percentiles_LBE"},
            {"name": "snap_counts_defense", "table": "Players_Full_Percentiles_LBE"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "CB": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "CoverageGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "snap_counts_coverage", "grades_coverage_defense", "catch_rate", "pass_break_ups", "tackles", "coverage_percent", "forced_incompletion_rate", "avg_depth_of_target"],
        "additional_db_fields": [
            {"name": "CBR", "table": "Players_Full_Percentiles_CB"},
            {"name": "snap_counts_defense", "table": "Players_Full_Percentiles_CB"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "S": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "CoverageGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "snap_counts_coverage", "grades_coverage_defense", "catch_rate", "pass_break_ups", "tackles", "coverage_percent", "forced_incompletion_rate", "avg_depth_of_target"],
        "additional_db_fields": [
            {"name": "SR", "table": "Players_Full_Percentiles_S"},
            {"name": "snap_counts_defense", "table": "Players_Full_Percentiles_S"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "DE": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "DefenseGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "grades_defense", "hits", "hurries", "sacks", "snap_counts_defense", "stops", "tackles", "tackles_for_loss", "total_pressures"],
        "additional_db_fields": [
            {"name": "DLR", "table": "Players_Full_Percentiles_DL"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "DT": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "DefenseGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "grades_defense", "hits", "hurries", "sacks", "snap_counts_defense", "stops", "tackles", "tackles_for_loss", "total_pressures"],
        "additional_db_fields": [
            {"name": "DLR", "table": "Players_Full_Percentiles_DL"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "DL": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "DefenseGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "grades_defense", "hits", "hurries", "sacks", "snap_counts_defense", "stops", "tackles", "tackles_for_loss", "total_pressures"],
        "additional_db_fields": [
            {"name": "DLR", "table": "Players_Full_Percentiles_DL"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "EDGE": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "DefenseGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "grades_defense", "hits", "hurries", "sacks", "snap_counts_defense", "stops", "tackles", "tackles_for_loss", "total_pressures", "grades_coverage_defense"],
        "additional_db_fields": [
            {"name": "LBR", "table": "Players_Full_Percentiles_LBE"},
            {"name": "snap_counts_defense", "table": "Players_Full_Percentiles_LBE"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    },
    "DB": {
        "csv_dir": "Defense/SeasonReports",
        "csv_file": "CoverageGrades.csv",
        "stat_column": "grades_defense",
        "extra_columns": ["player_game_count", "snap_counts_coverage", "grades_coverage_defense", "catch_rate", "pass_break_ups", "tackles", "coverage_percent", "forced_incompletion_rate", "avg_depth_of_target"],
        "additional_db_fields": [
            {"name": "DBR", "table": "Players_Full_Percentiles_DB"},
            {"name": "snap_counts_defense", "table": "Players_Full_Percentiles_DB"},
            {"name": "headshotURL", "table": "Players_Basic"}

        ]
    }
}

# Database connection with absolute path
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Dynamically determine new columns from GRADE_CONFIG
new_columns = set()
for config in GRADE_CONFIG.values():
    new_columns.update(config.get("extra_columns", []))
    for field in config.get("additional_db_fields", []):
        new_columns.add(field["name"])

# Check if table exists and alter it to add new columns if needed
cursor.execute("PRAGMA table_info(Players_Basic_Grades)")
existing_columns = {row[1] for row in cursor.fetchall()}  # Set of column names
if new_columns - existing_columns:
    real_cols = ['completion_percent', 'yards', 'ypa', 'yards_per_reception', 'RBR']  # Add RBR as REAL
    for col in new_columns - existing_columns:
        col_type = 'REAL' if col in real_cols else 'INTEGER'
        cursor.execute(f"ALTER TABLE Players_Basic_Grades ADD COLUMN {col} {col_type}")

# Ensure school, teamID, and grades_defense are added if not present
if {'school', 'teamID', 'grades_defense'} - existing_columns:
    if 'school' not in existing_columns:
        cursor.execute("ALTER TABLE Players_Basic_Grades ADD COLUMN school TEXT")
    if 'teamID' not in existing_columns:
        cursor.execute("ALTER TABLE Players_Basic_Grades ADD COLUMN teamID INTEGER")
    if 'grades_defense' not in existing_columns:
        cursor.execute("ALTER TABLE Players_Basic_Grades ADD COLUMN grades_defense REAL")

# Create Players_Basic_Grades table if it doesn't exist (with all columns)
cursor.execute("""
CREATE TABLE IF NOT EXISTS Players_Basic_Grades (
    playerId TEXT NOT NULL,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    position TEXT NOT NULL,
    player_id_PFF TEXT,
    grades_pass REAL,
    grades_run REAL,
    grades_pass_route REAL,
    grades_offense REAL,
    grades_defense REAL,
    school TEXT,
    teamID INTEGER,
    player_game_count INTEGER,
    completion_percent REAL,
    yards INTEGER,
    ypa REAL,
    touchdowns INTEGER,
    interceptions INTEGER,
    fumbles INTEGER,
    yards_per_reception REAL,
    receptions INTEGER,
    attempts INTEGER,
    RBR REAL,
    PRIMARY KEY (playerId, year),
    FOREIGN KEY (playerId, year) REFERENCES Players_Basic(playerId, year)
)
""")

def fetch_pff_grades_for_position(year):
    """Fetch grades and extra stats for all positions from Players_Basic and match with PFF CSV."""
    # Fetch all players from Players_Basic
    cursor.execute("SELECT playerId, year, name, team, position, player_id_PFF, school, teamID FROM Players_Basic WHERE year = ?", (year,))
    players_basic = {row[5]: row for row in cursor.fetchall()}  # Map player_id_PFF to (playerId, year, name, team, pos, pff_id, school, teamID)
    for position in GRADE_CONFIG.keys():
        config = GRADE_CONFIG.get(position)
        csv_path = Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/{config['csv_dir']}/{year}_{config['csv_file']}")
        if not csv_path.exists():
            print(f"CSV not found for {position}: {csv_path}")
            continue
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            required_columns = {"player_id", config["stat_column"]}
            if config["extra_columns"]:
                required_columns.update(config["extra_columns"])
            if not required_columns.issubset(reader.fieldnames):
                print(f"Invalid CSV format for {position} in {csv_path}: missing required columns")
                continue
            pff_data = {}
            for row in reader:
                player_id_pff = row["player_id"]
                if player_id_pff in players_basic:
                    stat_value = row.get(config["stat_column"], "").strip()
                    if stat_value and stat_value.replace(".", "").replace("-", "").replace("+", "").isdigit():
                        pff_data[player_id_pff] = {"grade": float(stat_value)}
                    else:
                        pff_data[player_id_pff] = {"grade": None}  # Allow NULL for invalid values
                    for col in config["extra_columns"]:
                        value = row.get(col, "").strip()
                        if value and value.replace(".", "").replace("-", "").replace("+", "").isdigit():
                            pff_data[player_id_pff][col] = float(value) if "." in value else int(value)
                        else:
                            pff_data[player_id_pff][col] = None  # Allow NULL for invalid values
            # Update or insert data
            for player_id_pff, (player_id, year, name, team, pos, _, school, team_id) in players_basic.items():
                if player_id_pff in pff_data and pos == position:  # Match position from Players_Basic
                    data = pff_data[player_id_pff]
                    grade_value = data.get("grade")
                    school = school if school is not None else team.lower()  # Fallback to lowercase team if school is null
                    team_id = team_id if team_id is not None else None  # Keep teamID as is, or None if not set
                    extra_values = [data.get(col) for col in config["extra_columns"]]
                    # Fetch additional DB fields if defined
                    additional_values = []
                    additional_columns = []
                    if "additional_db_fields" in config:
                        for field in config["additional_db_fields"]:
                            cursor.execute(f"SELECT {field['name']} FROM {field['table']} WHERE playerId = ? AND year = ?", (player_id, year))
                            result = cursor.fetchone()
                            additional_values.append(result[0] if result else None)
                            additional_columns.append(field['name'])
                    if config["extra_columns"] or additional_columns:
                        # Update existing row
                        set_clause = f"{config['stat_column']} = ?, school = ?, teamID = ?, {', '.join(f'{col} = ?' for col in config['extra_columns'] + additional_columns)}"
                        update_query = f"UPDATE Players_Basic_Grades SET {set_clause} WHERE playerId = ? AND year = ?"
                        update_params = [grade_value, school, team_id] + extra_values + additional_values + [player_id, year]
                        cursor.execute(update_query, update_params)
                        if cursor.rowcount == 0:
                            # Insert if not exists
                            insert_columns = ["playerId", "year", "name", "team", "position", "player_id_PFF", config["stat_column"], "school", "teamID"]
                            insert_columns.extend(config["extra_columns"])
                            insert_columns.extend(additional_columns)
                            insert_params = [player_id, year, name, team, pos or 'Unknown', player_id_pff, grade_value, school, team_id] + extra_values + additional_values
                            insert_query = f"INSERT INTO Players_Basic_Grades ({', '.join(insert_columns)}) VALUES ({'?,' * (len(insert_columns) - 1)}?)"
                            cursor.execute(insert_query, insert_params)
                    else:
                        # Update existing row with the correct stat column
                        cursor.execute(
                            f"UPDATE Players_Basic_Grades SET {config['stat_column']} = ?, school = ?, teamID = ? WHERE playerId = ? AND year = ?",
                            (grade_value, school, team_id, player_id, year)
                        )
                        if cursor.rowcount == 0:
                            # Insert if not exists
                            cursor.execute(
                                f"""
                                    INSERT INTO Players_Basic_Grades (playerId, year, name, team, position, player_id_PFF, {config['stat_column']}, school, teamID)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    """,
                                (player_id, year, name, team, pos or 'Unknown', player_id_pff, grade_value, school, team_id)
                            )

def main(year):
    try:
        # Process all positions
        for position in GRADE_CONFIG.keys():
            fetch_pff_grades_for_position(year)
        conn.commit()
        print(f"Population of Players_Basic_Grades completed for all positions in year {year}")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    year = 2025
    main(year)