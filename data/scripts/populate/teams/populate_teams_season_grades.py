import sqlite3
import pandas as pd
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define static metrics with numerator, denominator, and input table
metrics = [
    {'numerator': 'grades_pass', 'denominator': 'passing_snaps', 'input_table': 'Players_PassingGrades_Season'},
    {'numerator': 'qb_rating', 'denominator': 'passing_snaps', 'input_table': 'Players_PassingGrades_Season'},
    {'numerator': 'grades_run', 'denominator': 'attempts', 'input_table': 'Players_RushingGrades_Season'},
    {'numerator': 'grades_pass_route', 'denominator': 'routes', 'input_table': 'Players_ReceivingGrades_Season'},
    {'numerator': 'grades_run_block', 'denominator': 'snap_counts_run_block', 'input_table': 'Players_BlockingGrades_Season'},
    {'numerator': 'grades_pass_block', 'denominator': 'snap_counts_pass_play', 'input_table': 'Players_BlockingGrades_Season'},
    {'numerator': 'grades_coverage_defense', 'denominator': 'snap_counts_coverage', 'input_table': 'Players_DefenseGrades_Season'},
    {'numerator': 'grades_pass_rush_defense', 'denominator': 'snap_counts_pass_rush', 'input_table': 'Players_DefenseGrades_Season'},
    {'numerator': 'grades_run_defense', 'denominator': 'snap_counts_run_defense', 'input_table': 'Players_DefenseGrades_Season'},
    # Add more metrics here as needed, e.g., {'numerator': 'grades_run', 'denominator': 'run_snaps', 'input_table': 'Players_RunGrades_Season'}
]
output_table = 'Teams_Grades_Season'

# Initialize result DataFrame
final_team_df = None

for metric in metrics:
    numerator_col = metric['numerator']
    denominator_col = metric['denominator']
    input_table = metric['input_table']

    # Fetch all columns from input table
    cursor.execute(f"PRAGMA table_info({input_table})")
    columns = [row[1] for row in cursor.fetchall()]

    # Fetch data
    qualified_columns = [f"b.{col}" for col in columns]
    query = f"""
        SELECT {', '.join(qualified_columns)}
        FROM {input_table} b
    """
    df = pd.read_sql_query(query, conn)

    # Groupby columns
    groupby_cols = ['year', 'teamID']

    # Default agg: sum for non-groupby except player/team
    agg_dict = {col: 'sum' for col in df.columns if col not in groupby_cols + ['player', 'team', 'playerId']}

    # Overrides
    agg_overrides = {
        numerator_col: lambda x: (x * df.loc[x.index, denominator_col]).sum() / df.loc[x.index, denominator_col].sum() if df.loc[x.index, denominator_col].sum() > 0 else 0,
        'player': 'first',
        'team': 'first',
        'playerId': 'first'
    }
    agg_dict.update(agg_overrides)

    # Aggregate
    team_df = df.groupby(groupby_cols).agg(agg_dict).reset_index()
    team_df = team_df.loc[:, ~team_df.columns.duplicated()]

    # Select only relevant columns for merge
    metric_cols = groupby_cols + [numerator_col, 'team']
    team_df = team_df[metric_cols]

    # Merge with final_team_df
    if final_team_df is None:
        final_team_df = team_df
    else:
        final_team_df = final_team_df.merge(team_df, on=groupby_cols + ['team'], how='outer')

# Drop unwanted
columns_to_drop = ['playerId']
final_team_df = final_team_df.drop(columns=columns_to_drop, errors='ignore')

# Calculate percentiles
grade_cols = [m['numerator'] for m in metrics]
for col in grade_cols:
    final_team_df[f'percentile_{col}'] = final_team_df.groupby('year')[col].transform(lambda x: x.rank(pct=True) * 100)

# Create table
drop_table_sql = f"DROP TABLE IF EXISTS {output_table};"
cursor.execute(drop_table_sql)

create_table_columns = []
for col in final_team_df.columns:
    if col in ['team']:
        dtype = 'TEXT'
    elif col in ['year', 'teamID']:
        dtype = 'INTEGER'
    else:
        dtype = 'REAL'
    create_table_columns.append(f"{col} {dtype}")

create_table_sql = f"""
CREATE TABLE {output_table} (
    {', '.join(create_table_columns)},
    PRIMARY KEY (year, teamID)
);
"""
cursor.execute(create_table_sql)

# Insert data
to_sql_dtype = {col: 'REAL' if col not in ['team', 'year', 'teamID'] else 'TEXT' if col == 'team' else 'INTEGER' for col in final_team_df.columns}
final_team_df.to_sql(output_table, conn, if_exists='replace', index=False, dtype=to_sql_dtype)

conn.commit()
conn.close()