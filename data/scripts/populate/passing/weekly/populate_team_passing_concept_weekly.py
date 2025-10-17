import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Step 1: Dynamically fetch all columns from Players_PassingConcept_Weekly
print("\nStep 1: Fetching table schema...")
cursor.execute("PRAGMA table_info(Players_PassingConcept_Weekly)")
columns = [row[1] for row in cursor.execute("PRAGMA table_info(Players_PassingConcept_Weekly)")]
print(f"Step 1: Total columns in Players_PassingConcept_Weekly: {len(columns)}")
print(f"Step 1: Column names: {columns}")

# Step 1b: Fetch data with all columns and join with Teams_Games, including tg columns
print("\nStep 1b: Executing Query with all columns...")
# Qualify all columns from Players_PassingConcept_Weekly with table alias 'b' and add tg columns
qualified_columns = [f"b.{col}" for col in columns]
tg_columns = ['tg.id', 'tg.homeId', 'tg.awayId', "CASE WHEN b.teamID = tg.homeId THEN tg.awayId ELSE tg.homeId END AS opponent_id"]
query = f"""
    SELECT DISTINCT {', '.join(qualified_columns + tg_columns)}
    FROM Players_PassingConcept_Weekly b
    JOIN Teams_Games tg ON b.year = tg.season AND b.week = tg.week AND b.seasonType = tg.seasonType
    WHERE b.year = 2024 AND b.teamID IN (tg.homeId, tg.awayId)
    GROUP BY b.playerId, b.teamID, b.year, b.week, b.seasonType, tg.id
"""
df = pd.read_sql_query(query, conn)
print(f"Step 1b: Raw Data shape: {df.shape}")
print("Step 1b: Raw Data sample (first 5 rows):")
print(df.head())
print(f"Step 1b: Raw Data columns: {df.columns.tolist()}")

# Step 2: Define aggregation logic with default sum and manual overrides
print("\nStep 2: Defining aggregation logic...")
# Exclude groupby columns from aggregation
groupby_cols = ['year', 'week', 'seasonType', 'teamID']
# Default all aggregations to sum for non-groupby columns
agg_dict = {col: 'sum' for col in df.columns if col not in groupby_cols + ['player', 'team']}
# Manual overrides for specific fields
agg_overrides = {
    'no_screen_btt_rate':'mean',
    'no_screen_ypa':'mean',
    'npa_btt_rate':'mean',
    'npa_ypa':'mean',
    'pa_btt_rate':'mean',
    'pa_ypa':'mean',
    'screen_btt_rate':'mean',
    'screen_ypa':'mean',
    
    'no_screen_accuracy_percent':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_completion_percent':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_drop_rate':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_dropbacks_percent':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_grades_pass':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'no_screen_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'no_screen_attempts']).sum() / df.loc[x.index, 'no_screen_attempts'].sum() if df.loc[x.index, 'no_screen_attempts'].sum() > 0 else 0,
    'npa_grades_pass':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    
    'no_screen_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_offense':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_run':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_qb_rating':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_sack_percent':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,
    'no_screen_twp_rate':lambda x: (x * df.loc[x.index, 'no_screen_passing_snaps']).sum() / df.loc[x.index, 'no_screen_passing_snaps'].sum() if df.loc[x.index, 'no_screen_passing_snaps'].sum() > 0 else 0,

    'npa_accuracy_percent':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_completion_percent':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_drop_rate':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,
    'npa_dropbacks_percent':lambda x: (x * df.loc[x.index, 'npa_attempts']).sum() / df.loc[x.index, 'npa_attempts'].sum() if df.loc[x.index, 'npa_attempts'].sum() > 0 else 0,

    'npa_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_offense':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_run':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_qb_rating':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_sack_percent':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,
    'npa_twp_rate':lambda x: (x * df.loc[x.index, 'npa_passing_snaps']).sum() / df.loc[x.index, 'npa_passing_snaps'].sum() if df.loc[x.index, 'npa_passing_snaps'].sum() > 0 else 0,

    'pa_accuracy_percent':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_completion_percent':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_drop_rate':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_dropbacks_percent':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_grades_pass':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,
    'pa_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'pa_attempts']).sum() / df.loc[x.index, 'pa_attempts'].sum() if df.loc[x.index, 'pa_attempts'].sum() > 0 else 0,

    'pa_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_offense':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_run':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_qb_rating':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_sack_percent':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,
    'pa_twp_rate':lambda x: (x * df.loc[x.index, 'pa_passing_snaps']).sum() / df.loc[x.index, 'pa_passing_snaps'].sum() if df.loc[x.index, 'pa_passing_snaps'].sum() > 0 else 0,

    'screen_accuracy_percent':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_completion_percent':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_drop_rate':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_dropbacks_percent':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_grades_pass':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,
    'screen_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'screen_attempts']).sum() / df.loc[x.index, 'screen_attempts'].sum() if df.loc[x.index, 'screen_attempts'].sum() > 0 else 0,

    'screen_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_offense':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_run':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_qb_rating':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_sack_percent':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,
    'screen_twp_rate':lambda x: (x * df.loc[x.index, 'screen_passing_snaps']).sum() / df.loc[x.index, 'screen_passing_snaps'].sum() if df.loc[x.index, 'screen_passing_snaps'].sum() > 0 else 0,

    'id': 'first',
    'homeId': 'first',
    'awayId': 'first',
    'opponent_id': 'first',
    'opponentID': 'first'
}
# Combine default and overrides
agg_dict.update(agg_overrides)
print(f"Step 2: Aggregation dictionary keys: {list(agg_dict.keys())}")

# Step 3: Aggregate data
print("\nStep 3: Aggregating data...")
team_df = df.groupby(['year', 'week', 'seasonType', 'teamID']).agg(agg_dict).reset_index()
# Drop any duplicate columns caused by reset_index
team_df = team_df.loc[:, ~team_df.columns.duplicated()]
print(f"Step 3: Team_df shape: {team_df.shape}")
print("Step 3: Team_df sample (first 5 rows):")
print(team_df.head())

# Debug: Inspect aggregated data for Auburn Week 1
auburn_week1 = team_df[(team_df['teamID'] == 2) & (team_df['week'] == 1) & (team_df['seasonType'] == 'regular')]
print("\nStep 3: Auburn Week 1 Aggregated Data:")
print(auburn_week1)

# Debug: Check for duplicates
print("\nStep 3: Duplicates in team_df by ['year', 'week', 'seasonType', 'teamID']:", team_df.duplicated(subset=['year', 'week', 'seasonType', 'teamID']).sum())

# Step 3b: Drop unwanted columns
columns_to_drop = ['opponent_id', 'playerId']  # Replace with actual column names
team_df = team_df.drop(columns=columns_to_drop, errors='ignore')
print(f"Step 3b: Dropped columns: {columns_to_drop}")
print(f"Step 3b: Updated team_df shape: {team_df.shape}")

# Step 4: Generate SQL to create and populate Team_PassingConcept_Weekly
print("\nStep 4: Creating and populating SQL table...")
drop_table_sql = """
DROP TABLE IF EXISTS Team_PassingConcept_Weekly;
"""
cursor.execute(drop_table_sql)
# Dynamically generate CREATE TABLE statement based on team_df columns
create_table_columns = []
for col in team_df.columns:
    if col in ['seasonType', 'player', 'team']:
        dtype = 'TEXT'
    elif col in ['year', 'week', 'teamID', 'playerId', 'id', 'homeId', 'awayId', 'opponent_id', 'opponentID']:
        dtype = 'INTEGER'
    elif col in ['opponent_defense_rating']:
        dtype = 'REAL'
    else:
        dtype = 'REAL'  # Default to REAL for numeric fields
    create_table_columns.append(f"{col} {dtype}")
create_table_sql = f"""
CREATE TABLE Team_PassingConcept_Weekly (
    {', '.join(create_table_columns)},
    PRIMARY KEY (year, week, seasonType, teamID)
);
"""
cursor.execute(create_table_sql)

# Step 5: Convert team_df to SQL and insert data
print("\nStep 5: Inserting data into SQL table...")
# Dynamically generate dtype for to_sql based on team_df columns
to_sql_dtype = {}
for col in team_df.columns:
    if col in ['seasonType', 'player', 'team']:
        to_sql_dtype[col] = 'TEXT'
    elif col in ['year', 'week', 'teamID', 'playerId', 'id', 'homeId', 'awayId', 'opponent_id', 'opponentID']:
        to_sql_dtype[col] = 'INTEGER'
    elif col in ['opponent_defense_rating']:
        to_sql_dtype[col] = 'REAL'
    else:
        to_sql_dtype[col] = 'REAL'  # Default to REAL for numeric fields
team_df.to_sql('Team_PassingConcept_Weekly', conn, if_exists='replace', index=False, dtype=to_sql_dtype)
print("\nStep 5: Data insertion completed.")

# Commit and close
conn.commit()
print("\nStep 6: Connection committed and closed.")
conn.close()