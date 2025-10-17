import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Step 1: Fetch data from Team_DefenseRunDefense_Weekly
print("\nStep 1: Fetching Team_DefenseRunDefense_Weekly data...")
defense_columns = ['year', 'week', 'seasonType', 'teamID', 'opponentID', 'missed_tackles', 'missed_tackle_rate', 'stop_percent',
                   'grades_tackle', 'grades_run_defense', 'avg_depth_of_tackle', 'stops', 'run_stop_opp', 'tackles',
                   'grades_defense_penalty', 'grades_defense_adjusted', 'grades_tackle_adjusted', 'grades_run_defense_adjusted',
                   'grades_defense_penalty_adjusted']
query_defense = f"""
    SELECT {', '.join(defense_columns)}
    FROM Team_DefenseRunDefense_Weekly
    WHERE year = 2024 AND seasonType = 'regular'
"""
df_defense = pd.read_sql_query(query_defense, conn)
print(f"Step 1: Team_DefenseRunDefense_Weekly shape: {df_defense.shape}")
print("Step 1: Team_DefenseRunDefense_Weekly sample (first 5 rows):")
print(df_defense.head())

# Step 2: Fetch data from Team_RushingGrades_Weekly
print("\nStep 2: Fetching Team_RushingGrades_Weekly data...")
offense_columns = ['year', 'week', 'seasonType', 'teamID', 'ypa', 'zone_attempts', 'touchdowns', 'elusive_rating', 'elu_yco',
                   'attempts', 'grades_offense_penalty', 'grades_offense', 'explosive', 'run_plays', 'total_touches',
                   'elu_rush_mtf', 'grades_run', 'gap_attempts', 'scramble_yards', 'breakaway_percent', 'scrambles',
                   'yards_after_contact', 'first_downs', 'yco_attempt', 'breakaway_yards', 'breakaway_attempts', 'longest',
                   'avoided_tackles', 'grades_hands_fumble', 'fumbles', 'yards', 'grades_offense_penalty_adjusted',
                   'grades_offense_adjusted', 'grades_run_adjusted', 'grades_hands_fumble_adjusted']
query_offense = f"""
    SELECT {', '.join(offense_columns)}
    FROM Team_RushingGrades_Weekly
    WHERE year = 2024 AND seasonType = 'regular'
"""
df_offense = pd.read_sql_query(query_offense, conn)
print(f"Step 2: Team_RushingGrades_Weekly shape: {df_offense.shape}")
print("Step 2: Team_RushingGrades_Weekly sample (first 5 rows):")
print(df_offense.head())

# Step 3: Merge data based on opponentID and matching game context
print("\nStep 3: Merging data...")
df_merged = df_defense.merge(df_offense, 
                            left_on=['year', 'week', 'seasonType', 'opponentID'],
                            right_on=['year', 'week', 'seasonType', 'teamID'],
                            suffixes=('_defense', '_offense'))
# Drop the redundant teamID from offense (opponentID from defense is the key)
df_merged = df_merged.drop(columns=['teamID_offense'])

# Rename columns with prefixes
defense_prefix = 'team_'
offense_prefix = 'opposition_'
df_merged = df_merged.rename(columns={
    'missed_tackles': f'{defense_prefix}missed_tackles',
    'missed_tackle_rate': f'{defense_prefix}missed_tackle_rate',
    'stop_percent': f'{defense_prefix}stop_percent',
    'grades_tackle': f'{defense_prefix}grades_tackle',
    'grades_run_defense': f'{defense_prefix}grades_run_defense',
    'avg_depth_of_tackle': f'{defense_prefix}avg_depth_of_tackle',
    'stops': f'{defense_prefix}stops',
    'run_stop_opp': f'{defense_prefix}run_stop_opp',
    'tackles': f'{defense_prefix}tackles',
    'grades_defense_penalty': f'{defense_prefix}grades_defense_penalty',
    'grades_defense_adjusted': f'{defense_prefix}grades_defense_adjusted',
    'grades_tackle_adjusted': f'{defense_prefix}grades_tackle_adjusted',
    'grades_run_defense_adjusted': f'{defense_prefix}grades_run_defense_adjusted',
    'grades_defense_penalty_adjusted': f'{defense_prefix}grades_defense_penalty_adjusted',
    'ypa': f'{offense_prefix}ypa',
    'zone_attempts': f'{offense_prefix}zone_attempts',
    'touchdowns': f'{offense_prefix}touchdowns',
    'elusive_rating': f'{offense_prefix}elusive_rating',
    'elu_yco': f'{offense_prefix}elu_yco',
    'attempts': f'{offense_prefix}attempts',
    'grades_offense_penalty': f'{offense_prefix}grades_offense_penalty',
    'grades_offense': f'{offense_prefix}grades_offense',
    'explosive': f'{offense_prefix}explosive',
    'run_plays': f'{offense_prefix}run_plays',
    'total_touches': f'{offense_prefix}total_touches',
    'elu_rush_mtf': f'{offense_prefix}elu_rush_mtf',
    'grades_run': f'{offense_prefix}grades_run',
    'gap_attempts': f'{offense_prefix}gap_attempts',
    'scramble_yards': f'{offense_prefix}scramble_yards',
    'breakaway_percent': f'{offense_prefix}breakaway_percent',
    'scrambles': f'{offense_prefix}scrambles',
    'yards_after_contact': f'{offense_prefix}yards_after_contact',
    'first_downs': f'{offense_prefix}first_downs',
    'yco_attempt': f'{offense_prefix}yco_attempt',
    'breakaway_yards': f'{offense_prefix}breakaway_yards',
    'breakaway_attempts': f'{offense_prefix}breakaway_attempts',
    'longest': f'{offense_prefix}longest',
    'avoided_tackles': f'{offense_prefix}avoided_tackles',
    'grades_hands_fumble': f'{offense_prefix}grades_hands_fumble',
    'fumbles': f'{offense_prefix}fumbles',
    'yards': f'{offense_prefix}yards',
    'grades_offense_penalty_adjusted': f'{offense_prefix}grades_offense_penalty_adjusted',
    'grades_offense_adjusted': f'{offense_prefix}grades_offense_adjusted',
    'grades_run_adjusted': f'{offense_prefix}grades_run_adjusted',
    'grades_hands_fumble_adjusted': f'{offense_prefix}grades_hands_fumble_adjusted'
})
print(f"Step 3: Merged data shape after renaming: {df_merged.shape}")
print("Step 3: Merged data sample (first 5 rows) after renaming:")
print(df_merged.head())

# Step 4: Create Teams_Metrics_RushDefense_Weekly table
print("\nStep 4: Creating Teams_Metrics_RushDefense_Weekly table...")
drop_table_sql = """
DROP TABLE IF EXISTS Teams_Metrics_RushDefense_Weekly;
"""
cursor.execute(drop_table_sql)
create_table_sql = f"""
CREATE TABLE Teams_Metrics_RushDefense_Weekly (
    year INTEGER,
    week INTEGER,
    seasonType TEXT,
    teamID INTEGER,
    opponentID INTEGER,
    {', '.join(f'{col} REAL' for col in [f'team_{x}' for x in ['missed_tackles', 'missed_tackle_rate', 'stop_percent', 'grades_tackle', 
                                                              'grades_run_defense', 'avg_depth_of_tackle', 'stops', 'run_stop_opp', 
                                                              'tackles', 'grades_defense_penalty', 'grades_defense_adjusted', 
                                                              'grades_tackle_adjusted', 'grades_run_defense_adjusted', 
                                                              'grades_defense_penalty_adjusted']])},
    {', '.join(f'{col} REAL' for col in [f'opposition_{x}' for x in ['ypa', 'zone_attempts', 'touchdowns', 'elusive_rating', 'elu_yco', 
                                                                     'attempts', 'grades_offense_penalty', 'grades_offense', 'explosive', 
                                                                     'run_plays', 'total_touches', 'elu_rush_mtf', 'grades_run', 
                                                                     'gap_attempts', 'scramble_yards', 'breakaway_percent', 'scrambles', 
                                                                     'yards_after_contact', 'first_downs', 'yco_attempt', 'breakaway_yards', 
                                                                     'breakaway_attempts', 'longest', 'avoided_tackles', 'grades_hands_fumble', 
                                                                     'fumbles', 'yards', 'grades_offense_penalty_adjusted', 
                                                                     'grades_offense_adjusted', 'grades_run_adjusted', 
                                                                     'grades_hands_fumble_adjusted']])},
    PRIMARY KEY (year, week, seasonType, teamID, opponentID)
)
"""
cursor.execute(create_table_sql)

# Step 5: Insert merged data into the new table
print("\nStep 5: Inserting data into Teams_Metrics_RushDefense_Weekly...")
df_merged.to_sql('Teams_Metrics_RushDefense_Weekly', conn, if_exists='replace', index=False, dtype={
    'year': 'INTEGER',
    'week': 'INTEGER',
    'seasonType': 'TEXT',
    'teamID': 'INTEGER',
    'opponentID': 'INTEGER',
    'team_missed_tackles': 'REAL',
    'team_missed_tackle_rate': 'REAL',
    'team_stop_percent': 'REAL',
    'team_grades_tackle': 'REAL',
    'team_grades_run_defense': 'REAL',
    'team_avg_depth_of_tackle': 'REAL',
    'team_stops': 'REAL',
    'team_run_stop_opp': 'REAL',
    'team_tackles': 'REAL',
    'team_grades_defense_penalty': 'REAL',
    'team_grades_defense_adjusted': 'REAL',
    'team_grades_tackle_adjusted': 'REAL',
    'team_grades_run_defense_adjusted': 'REAL',
    'team_grades_defense_penalty_adjusted': 'REAL',
    'opposition_ypa': 'REAL',
    'opposition_zone_attempts': 'REAL',
    'opposition_touchdowns': 'REAL',
    'opposition_elusive_rating': 'REAL',
    'opposition_elu_yco': 'REAL',
    'opposition_attempts': 'REAL',
    'opposition_grades_offense_penalty': 'REAL',
    'opposition_grades_offense': 'REAL',
    'opposition_explosive': 'REAL',
    'opposition_run_plays': 'REAL',
    'opposition_total_touches': 'REAL',
    'opposition_elu_rush_mtf': 'REAL',
    'opposition_grades_run': 'REAL',
    'opposition_gap_attempts': 'REAL',
    'opposition_scramble_yards': 'REAL',
    'opposition_breakaway_percent': 'REAL',
    'opposition_scrambles': 'REAL',
    'opposition_yards_after_contact': 'REAL',
    'opposition_first_downs': 'REAL',
    'opposition_yco_attempt': 'REAL',
    'opposition_breakaway_yards': 'REAL',
    'opposition_breakaway_attempts': 'REAL',
    'opposition_longest': 'REAL',
    'opposition_avoided_tackles': 'REAL',
    'opposition_grades_hands_fumble': 'REAL',
    'opposition_fumbles': 'REAL',
    'opposition_yards': 'REAL',
    'opposition_grades_offense_penalty_adjusted': 'REAL',
    'opposition_grades_offense_adjusted': 'REAL',
    'opposition_grades_run_adjusted': 'REAL',
    'opposition_grades_hands_fumble_adjusted': 'REAL'
})
print("\nStep 5: Data insertion completed.")

# Commit and close
conn.commit()
print("\nStep 6: Connection committed and closed.")
conn.close()