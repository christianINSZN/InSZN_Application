import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# ============================================================================
# CONFIGURATION: Columns to exclude from final table
# ============================================================================
COLUMNS_TO_EXCLUDE = [
    'position',
    'opponent_id',
    'playerId', 
    'receptions'
    'scramble_yards',
    'grades_offense',
    'grades_pass',
    'targets',
    'drops',
    'grades_pass_route',
    'routes',
    'grades_pass_block',
    'yprr',
    'scrambles',
    'designed_yards',
    'rec_yards',
    'grades_run_block',
    'grades_run_adjusted',
    'grades_offense_adjusted',
    'grades_pass_adjusted',
    'grades_offense_penalty_adjusted',
    'grades_pass_route_adjusted',
    'grades_pass_block_adjusted',
    'grades_hands_fumble_adjusted',
    'grades_run_block_adjusted',
    'opponent_defense_rating'
    # Add any other columns you want to exclude here
]
# ============================================================================

# Fetch all columns from Players_RushingGrades_Weekly
cursor.execute("PRAGMA table_info(Players_RushingGrades_Weekly)")
columns = [row[1] for row in cursor.execute("PRAGMA table_info(Players_RushingGrades_Weekly)")]

qualified_columns = [f"b.{col}" for col in columns]
tg_columns = ['tg.id', 'tg.homeId', 'tg.awayId', "CASE WHEN b.teamID = tg.homeId THEN tg.awayId ELSE tg.homeId END AS opponent_id"]

# Query individual player records for ALL years
query = f"""
    SELECT {', '.join(qualified_columns + tg_columns)}
    FROM Players_RushingGrades_Weekly b
    JOIN Teams_Games tg ON b.year = tg.season AND b.week = tg.week AND b.seasonType = tg.seasonType
    WHERE b.teamID IN (tg.homeId, tg.awayId)
    AND b.playerId IS NOT NULL
    AND b.playerId > 0
"""
df = pd.read_sql_query(query, conn)

# Filter out any team-level rows if 'player' column contains team indicators
if 'player' in df.columns:
    team_indicators = df['player'].str.lower().str.contains('team|total|aggregate', case=False, na=False)
    if team_indicators.any():
        df = df[~team_indicators]

# Remove duplicate player records
duplicate_check_cols = ['playerId', 'teamID', 'year', 'week', 'seasonType']
df = df.drop_duplicates(subset=duplicate_check_cols, keep='first')

# Define aggregation columns
groupby_cols = ['year', 'week', 'seasonType', 'teamID']
exclude_from_sum = groupby_cols + ['player', 'team', 'id', 'homeId', 'awayId', 'opponent_id', 'opponentID', 'playerId', 'opponent_defense_rating', 'longest']
sum_cols = [col for col in df.columns if col not in exclude_from_sum]
first_cols = ['id', 'homeId', 'awayId', 'opponent_id', 'opponentID', 'opponent_defense_rating']
max_cols_special = ['longest']  # longest should use max, not sum

# Note: 'attempts' is a count column, so we'll sum it normally (no max needed)

# Create weighted columns for grade calculations (all weighted by attempts)
weighted_avg_configs = [
    ('yco_attempt', 'attempts'),
    ('ypa', 'attempts'),
    ('breakaway_percent', 'attempts'),
    ('grades_hands_fumble', 'attempts'),
    ('elusive_rating', 'attempts'),
    ('explosive', 'attempts'),
    ('grades_offense_penalty', 'attempts'),
    ('grades_run', 'attempts'),
    ('grades_offense', 'attempts'),
    ('grades_hands_fumble_adjusted', 'attempts'),
    ('grades_offense_penalty_adjusted', 'attempts'),
    ('grades_run_adjusted', 'attempts'),
    ('grades_offense_adjusted', 'attempts'), 
    
]

weighted_cols = []
for grade_col, snap_col in weighted_avg_configs:
    if grade_col in df.columns and snap_col in df.columns:
        # Create weighted numerator column (grade * attempts for each player)
        weighted_col_name = f'{grade_col}_weighted'
        df[weighted_col_name] = df[grade_col] * df[snap_col]
        weighted_cols.append(weighted_col_name)

sum_cols_with_weighted = sum_cols + weighted_cols

# Aggregate to team level (grouped by year, week, seasonType, teamID)
agg_dict = {
    **{col: 'sum' for col in sum_cols_with_weighted if col in df.columns},
    **{col: 'first' for col in first_cols if col in df.columns},
    **{col: 'max' for col in max_cols_special if col in df.columns}
}

team_df = df.groupby(groupby_cols).agg(agg_dict).reset_index()

# Calculate final weighted averages
# We need the sum of (grade * attempts) divided by sum of attempts
for grade_col, snap_col in weighted_avg_configs:
    weighted_col_name = f'{grade_col}_weighted'
    
    if grade_col in team_df.columns and snap_col in team_df.columns and weighted_col_name in team_df.columns:
        # Calculate sum of attempts for this grade (re-aggregate from original df)
        snap_sums = df.groupby(groupby_cols)[snap_col].sum().reset_index()
        snap_sums = snap_sums.rename(columns={snap_col: f'{snap_col}_for_calc'})
        
        # Merge the attempts sum for calculation
        team_df = team_df.merge(snap_sums, on=groupby_cols, how='left')
        
        # Calculate weighted average
        team_df[grade_col] = team_df.apply(
            lambda row: row[weighted_col_name] / row[f'{snap_col}_for_calc'] if row[f'{snap_col}_for_calc'] > 0 else 0,
            axis=1
        )
        
        # Drop temporary columns
        team_df = team_df.drop(columns=[weighted_col_name, f'{snap_col}_for_calc'])

# Drop excluded columns
team_df = team_df.drop(columns=COLUMNS_TO_EXCLUDE, errors='ignore')
excluded_found = [col for col in COLUMNS_TO_EXCLUDE if col in df.columns or col in team_df.columns]

# Create and populate SQL table
cursor.execute("DROP TABLE IF EXISTS Team_RushingGrades_Weekly;")

create_table_columns = []
for col in team_df.columns:
    if col in ['seasonType', 'player', 'team']:
        dtype = 'TEXT'
    elif col in ['year', 'week', 'teamID', 'playerId', 'id', 'homeId', 'awayId', 'opponent_id', 'opponentID']:
        dtype = 'INTEGER'
    else:
        dtype = 'REAL'
    create_table_columns.append(f"{col} {dtype}")

create_table_sql = f"""
CREATE TABLE Team_RushingGrades_Weekly (
    {', '.join(create_table_columns)},
    PRIMARY KEY (year, week, seasonType, teamID)
);
"""
cursor.execute(create_table_sql)

# Insert data
to_sql_dtype = {}
for col in team_df.columns:
    if col in ['seasonType', 'player', 'team']:
        to_sql_dtype[col] = 'TEXT'
    elif col in ['year', 'week', 'teamID', 'playerId', 'id', 'homeId', 'awayId', 'opponent_id', 'opponentID']:
        to_sql_dtype[col] = 'INTEGER'
    else:
        to_sql_dtype[col] = 'REAL'

team_df.to_sql('Team_RushingGrades_Weekly', conn, if_exists='replace', index=False, dtype=to_sql_dtype)

# Commit and close
conn.commit()
conn.close()

# Get year range for reporting
years = sorted(team_df['year'].unique())
year_range = f"{years[0]}-{years[-1]}" if len(years) > 1 else str(years[0])

print(f"✓ Team_RushingGrades_Weekly table created with {len(team_df)} records ({year_range})")
if excluded_found:
    print(f"✓ Excluded columns: {', '.join(excluded_found)}")