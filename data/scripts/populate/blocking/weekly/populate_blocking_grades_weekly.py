import sqlite3
import pandas as pd
from pathlib import Path
import math

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Fetch data from Players_BlockingGrades_Weekly with game mapping
query = """
    SELECT DISTINCT b.year, b.week, b.seasonType, b.teamID, b.grades_pass_block, b.grades_run_block,
           b.grades_offense, b.snap_counts_pass_block, b.snap_counts_run_block, b.snap_counts_te, b.snap_counts_lt,
           b.hits_allowed, b.sacks_allowed, b.snap_counts_lg, b.declined_penalties, b.block_percent, b.grades_run_block,
           b.snap_counts_rt, b.penalties, b.pbe, b.pressures_allowed, b.non_spike_pass_block_percentage,
           b.snap_counts_ce, b.snap_counts_offense, b.pass_block_percent, b.snap_counts_pass_play, b.franchise_id,
           b.snap_counts_rg, b.hurries_allowed, b.non_spike_pass_block, b.team, b.team_name,
           b.opponent_defense_rating, b.grades_run_block_adjusted, b.grades_offense_adjusted,
           b.grades_pass_block_adjusted,
           tg.id, tg.homeId, tg.awayId,
           CASE WHEN b.teamID = tg.homeId THEN tg.awayId ELSE tg.homeId END AS opponent_id
    FROM Players_BlockingGrades_Weekly b
    JOIN Teams_Games tg ON b.year = tg.season AND b.week = tg.week AND b.seasonType = tg.seasonType
    WHERE b.year = 2024 AND b.teamID IN (tg.homeId, tg.awayId)
"""
df = pd.read_sql_query(query, conn)

# Debug: Inspect available columns
print("Available columns in df:", df.columns.tolist())

# Convert data types
int_cols = ['year', 'week', 'teamID', 'snap_counts_pass_block', 'snap_counts_run_block', 'snap_counts_te',
            'snap_counts_lt', 'hits_allowed', 'sacks_allowed', 'snap_counts_lg', 'declined_penalties',
            'snap_counts_rt', 'penalties', 'pressures_allowed', 'snap_counts_ce', 'snap_counts_offense',
            'snap_counts_pass_play', 'snap_counts_rg', 'hurries_allowed', 'non_spike_pass_block', 'id',
            'homeId', 'awayId', 'opponent_id']
df[int_cols] = df[int_cols].fillna(0).astype(int)

# Dynamically determine float columns based on available data
float_cols = [col for col in ['grades_pass_block', 'grades_run_block', 'grades_offense', 'block_percent',
                              'pass_block_percent', 'non_spike_pass_block_percentage', 'pbe',
                              'opponent_defense_rating', 'grades_run_block_adjusted', 'grades_offense_adjusted',
                              'grades_pass_block_adjusted'] if col in df.columns]
print("Float columns to convert:", float_cols)
# Preprocess: Replace 'Null' with 0 and fill NaN across all float columns
df[float_cols] = df[float_cols].replace({'Null': 0}, inplace=False).fillna(0)
# Debug: Check for non-numeric values (though most should be handled by fillna)
for col in float_cols:
    if df[col].dtype == 'object':  # Check if column is still object type
        non_numeric_values = df[col][~df[col].str.match(r'^-?\d*\.?\d+$', na=False)].unique()
        if len(non_numeric_values) > 0:
            print(f"Non-numeric values replaced with 0 in {col}: {non_numeric_values}")
            df[col] = df[col].replace(non_numeric_values, 0, inplace=False)
# Convert all float columns using vectorized operation
df[float_cols] = df[float_cols].astype(float)

df['seasonType'] = df['seasonType'].astype(str)
df[['team', 'team_name', 'franchise_id']] = df[['team', 'team_name', 'franchise_id']].fillna('')

# Debug: Inspect raw data
print("Raw Players_BlockingGrades_Weekly sample (first 5 rows):")
print(df.head())
print(f"\nData shape: {df.shape}")

# Aggregate to team level per game
team_df = df.groupby(['id', 'teamID']).agg({
    'grades_pass_block': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0,
    'grades_run_block': lambda x: (x * df.loc[x.index, 'snap_counts_run_block']).sum() / df.loc[x.index, 'snap_counts_run_block'].sum() if df.loc[x.index, 'snap_counts_run_block'].sum() > 0 else 0,
    'grades_offense': lambda x: (x * df.loc[x.index, 'snap_counts_offense']).sum() / df.loc[x.index, 'snap_counts_offense'].sum() if df.loc[x.index, 'snap_counts_offense'].sum() > 0 else 0,
    'snap_counts_pass_block': 'max',  # Proxy for total pass-blocking snaps
    'snap_counts_run_block': 'max',  # Proxy for total run-blocking snaps
    'snap_counts_te': 'max',  # Proxy for total tackle-eligible snaps
    'snap_counts_lt': 'max',  # Proxy for total left tackle snaps
    'hits_allowed': 'sum',
    'sacks_allowed': 'sum',
    'snap_counts_lg': 'max',  # Proxy for total left guard snaps
    'declined_penalties': 'sum',
    'block_percent': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0,
    'snap_counts_rt': 'max',  # Proxy for total right tackle snaps
    'penalties': 'sum',
    'pbe': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0,
    'pressures_allowed': 'sum',
    'non_spike_pass_block_percentage': lambda x: (x * df.loc[x.index, 'non_spike_pass_block']).sum() / df.loc[x.index, 'non_spike_pass_block'].sum() if df.loc[x.index, 'non_spike_pass_block'].sum() > 0 else 0,
    'snap_counts_ce': 'max',  # Proxy for total center-eligible snaps
    'snap_counts_offense': 'max',  # Proxy for total offensive snaps
    'pass_block_percent': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0,
    'snap_counts_pass_play': 'max',  # Proxy for total pass play snaps
    'snap_counts_rg': 'max',  # Proxy for total right guard snaps
    'hurries_allowed': 'sum',
    'non_spike_pass_block': 'max',  # Proxy for total non-spike pass blocks
    'opponent_id': 'first',
    'year': 'first',
    'week': 'first',
    'seasonType': 'first',
    'team': 'first',  # Representative team name
    'team_name': 'first',  # Representative team name alias
    'franchise_id': 'first',  # Representative franchise ID
    'opponent_defense_rating': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0,
    'grades_run_block_adjusted': lambda x: (x * df.loc[x.index, 'snap_counts_run_block']).sum() / df.loc[x.index, 'snap_counts_run_block'].sum() if df.loc[x.index, 'snap_counts_run_block'].sum() > 0 else 0,
    'grades_offense_adjusted': lambda x: (x * df.loc[x.index, 'snap_counts_offense']).sum() / df.loc[x.index, 'snap_counts_offense'].sum() if df.loc[x.index, 'snap_counts_offense'].sum() > 0 else 0,
    'grades_pass_block_adjusted': lambda x: (x * df.loc[x.index, 'snap_counts_pass_block']).sum() / df.loc[x.index, 'snap_counts_pass_block'].sum() if df.loc[x.index, 'snap_counts_pass_block'].sum() > 0 else 0
}).reset_index().rename(columns={'teamID': 'team_id'})

# Debug: Check for duplicates
print("\nDuplicates in team_df by ['id', 'team_id', 'opponent_id']:", team_df.duplicated(subset=['id', 'team_id', 'opponent_id']).sum())

# Generate SQL to create and populate Team_Offense_Weekly
drop_table_sql = """
DROP TABLE IF EXISTS Team_Offense_Weekly;
"""
cursor.execute(drop_table_sql)
create_table_sql = """
CREATE TABLE Team_Offense_Weekly (
    id INTEGER,
    team_id INTEGER,
    opponent_id INTEGER,
    year INTEGER,
    week INTEGER,
    seasonType TEXT,
    grades_pass_block REAL,
    grades_run_block REAL,
    grades_offense REAL,
    snap_counts_pass_block INTEGER,
    snap_counts_run_block INTEGER,
    snap_counts_te INTEGER,
    snap_counts_lt INTEGER,
    hits_allowed INTEGER,
    sacks_allowed INTEGER,
    snap_counts_lg INTEGER,
    declined_penalties INTEGER,
    block_percent REAL,
    snap_counts_rt INTEGER,
    penalties INTEGER,
    pbe REAL,
    pressures_allowed INTEGER,
    non_spike_pass_block_percentage REAL,
    snap_counts_ce INTEGER,
    snap_counts_offense INTEGER,
    pass_block_percent REAL,
    snap_counts_pass_play INTEGER,
    snap_counts_rg INTEGER,
    hurries_allowed INTEGER,
    non_spike_pass_block INTEGER,
    team TEXT,
    team_name TEXT,
    franchise_id TEXT,
    opponent_defense_rating REAL,
    grades_run_block_adjusted REAL,
    grades_offense_adjusted REAL,
    grades_pass_block_adjusted REAL,
    PRIMARY KEY (id, team_id)
);
"""
cursor.execute(create_table_sql)

# Convert team_df to SQL and insert data
team_df.to_sql('Team_Offense_Weekly', conn, if_exists='replace', index=False, dtype={
    'id': 'INTEGER',
    'team_id': 'INTEGER',
    'opponent_id': 'INTEGER',
    'year': 'INTEGER',
    'week': 'INTEGER',
    'seasonType': 'TEXT',
    'grades_pass_block': 'REAL',
    'grades_run_block': 'REAL',
    'grades_offense': 'REAL',
    'snap_counts_pass_block': 'INTEGER',
    'snap_counts_run_block': 'INTEGER',
    'snap_counts_te': 'INTEGER',
    'snap_counts_lt': 'INTEGER',
    'hits_allowed': 'INTEGER',
    'sacks_allowed': 'INTEGER',
    'snap_counts_lg': 'INTEGER',
    'declined_penalties': 'INTEGER',
    'block_percent': 'REAL',
    'snap_counts_rt': 'INTEGER',
    'penalties': 'INTEGER',
    'pbe': 'REAL',
    'pressures_allowed': 'INTEGER',
    'non_spike_pass_block_percentage': 'REAL',
    'snap_counts_ce': 'INTEGER',
    'snap_counts_offense': 'INTEGER',
    'pass_block_percent': 'REAL',
    'snap_counts_pass_play': 'INTEGER',
    'snap_counts_rg': 'INTEGER',
    'hurries_allowed': 'INTEGER',
    'non_spike_pass_block': 'INTEGER',
    'team': 'TEXT',
    'team_name': 'TEXT',
    'franchise_id': 'TEXT',
    'opponent_defense_rating': 'REAL',
    'grades_run_block_adjusted': 'REAL',
    'grades_offense_adjusted': 'REAL',
    'grades_pass_block_adjusted': 'REAL'
})

# Commit and close
conn.commit()
print("\nTeam_Offense_Weekly table recreated and populated.")
conn.close()