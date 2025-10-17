import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Step 1: Dynamically fetch all columns from Players_PassingPressure_Weekly
print("\nStep 1: Fetching table schema...")
cursor.execute("PRAGMA table_info(Players_PassingPressure_Weekly)")
columns = [row[1] for row in cursor.execute("PRAGMA table_info(Players_PassingPressure_Weekly)")]
print(f"Step 1: Total columns in Players_PassingPressure_Weekly: {len(columns)}")
print(f"Step 1: Column names: {columns}")

# Step 1b: Fetch data with all columns and join with Teams_Games, including tg columns
print("\nStep 1b: Executing Query with all columns...")
# Qualify all columns from Players_PassingPressure_Weekly with table alias 'b' and add tg columns
qualified_columns = [f"b.{col}" for col in columns]
tg_columns = ['tg.id', 'tg.homeId', 'tg.awayId', "CASE WHEN b.teamID = tg.homeId THEN tg.awayId ELSE tg.homeId END AS opponent_id"]
query = f"""
    SELECT DISTINCT {', '.join(qualified_columns + tg_columns)}
    FROM Players_PassingPressure_Weekly b
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

    'blitz_accuracy_percent':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_btt_rate':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_completion_percent':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_drop_rate':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_dropbacks_percent':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_grades_pass':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    'blitz_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'blitz_attempts']).sum() / df.loc[x.index, 'blitz_attempts'].sum() if df.loc[x.index, 'blitz_attempts'].sum() > 0 else 0,
    
    'blitz_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_offense':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_run':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_qb_rating':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_sack_percent':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,
    'blitz_twp_rate':lambda x: (x * df.loc[x.index, 'blitz_passing_snaps']).sum() / df.loc[x.index, 'blitz_passing_snaps'].sum() if df.loc[x.index, 'blitz_passing_snaps'].sum() > 0 else 0,

    'no_blitz_accuracy_percent':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_btt_rate':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_completion_percent':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_drop_rate':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_dropbacks_percent':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_grades_pass':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,
    'no_blitz_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'no_blitz_attempts']).sum() / df.loc[x.index, 'no_blitz_attempts'].sum() if df.loc[x.index, 'no_blitz_attempts'].sum() > 0 else 0,

    'no_blitz_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_offense':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_run':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_qb_rating':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_sack_percent':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,
    'no_blitz_twp_rate':lambda x: (x * df.loc[x.index, 'no_blitz_passing_snaps']).sum() / df.loc[x.index, 'no_blitz_passing_snaps'].sum() if df.loc[x.index, 'no_blitz_passing_snaps'].sum() > 0 else 0,

    'no_pressure_accuracy_percent':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_btt_rate':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_completion_percent':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_drop_rate':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_dropbacks_percent':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_grades_pass':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,
    'no_pressure_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'no_pressure_attempts']).sum() / df.loc[x.index, 'no_pressure_attempts'].sum() if df.loc[x.index, 'no_pressure_attempts'].sum() > 0 else 0,

    'no_pressure_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_offense':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_run':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_qb_rating':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_sack_percent':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,
    'no_pressure_twp_rate':lambda x: (x * df.loc[x.index, 'no_pressure_passing_snaps']).sum() / df.loc[x.index, 'no_pressure_passing_snaps'].sum() if df.loc[x.index, 'no_pressure_passing_snaps'].sum() > 0 else 0,

    'pressure_accuracy_percent':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_avg_depth_of_target':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_avg_time_to_throw':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_btt_rate':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_completion_percent':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_drop_rate':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_dropbacks_percent':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_grades_pass':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,
    'pressure_grades_pass_adjusted':lambda x: (x * df.loc[x.index, 'pressure_attempts']).sum() / df.loc[x.index, 'pressure_attempts'].sum() if df.loc[x.index, 'pressure_attempts'].sum() > 0 else 0,

    'pressure_grades_hands_fumble':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_hands_fumble_adjusted':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_offense':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_offense_adjusted':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_offense_penalty':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_offense_penalty_adjusted':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_run':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_grades_run_adjusted':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_pressure_to_sack_rate':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_qb_rating':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_sack_percent':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,
    'pressure_twp_rate':lambda x: (x * df.loc[x.index, 'pressure_passing_snaps']).sum() / df.loc[x.index, 'pressure_passing_snaps'].sum() if df.loc[x.index, 'pressure_passing_snaps'].sum() > 0 else 0,

    'blitz_ypa':'mean',
    'no_blitz_ypa':'mean',
    'no_pressure_ypa':'mean',
    'pressure_ypa':'mean',

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

# Step 4: Generate SQL to create and populate Team_PassingPressure_Weekly
print("\nStep 4: Creating and populating SQL table...")
drop_table_sql = """
DROP TABLE IF EXISTS Team_PassingPressure_Weekly;
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
CREATE TABLE Team_PassingPressure_Weekly (
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
team_df.to_sql('Team_PassingPressure_Weekly', conn, if_exists='replace', index=False, dtype=to_sql_dtype)
print("\nStep 5: Data insertion completed.")

# Commit and close
conn.commit()
print("\nStep 6: Connection committed and closed.")
conn.close()