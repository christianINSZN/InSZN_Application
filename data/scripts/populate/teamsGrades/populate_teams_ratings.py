import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
DATABASE_URL = f'sqlite:///{DB_FILE}'
engine = create_engine(DATABASE_URL)

# Define metrics to average
METRICS = [
    'RBR', 'WRR', 'TER', 'QBR', 'GR', 'TR', 'CR', 'DLR', 'SR', 'LBR', 'DBR', 'CBR'
]

# Map positions to snap count columns and their metrics
POSITION_SNAP_MAP = {
    'QB': {'snap_column': 'passing_snaps', 'metric': 'QBR'},
    'RB': {'snap_column': 'run_plays', 'metric': 'RBR'},
    'WR': {'snap_column': 'routes', 'metric': 'WRR'},
    'TE': {'snap_column': 'routes', 'metric': 'TER'},
    'C': {'snap_column': 'snap_counts_block', 'metric': 'CR'},
    'G': {'snap_column': 'snap_counts_block', 'metric': 'GR'},
    'T': {'snap_column': 'snap_counts_block', 'metric': 'TR'},
    'LB': {'snap_column': 'snap_counts_defense', 'metric': 'LBR'},
    'EDGE': {'snap_column': 'snap_counts_defense', 'metric': 'LBR'},
    'CB': {'snap_column': 'snap_counts_coverage', 'metric': 'CBR'},
    'S': {'snap_column': 'snap_counts_coverage', 'metric': 'SR'},
    'DB': {'snap_column': 'snap_counts_coverage', 'metric': 'DBR'},
    'DE': {'snap_column': 'snap_counts_defense', 'metric': 'DLR'},
    'DT': {'snap_column': 'snap_counts_defense', 'metric': 'DLR'},
    'DL': {'snap_column': 'snap_counts_defense', 'metric': 'DLR'},
}

def calculate_weighted_team_ratings():
    try:
        # Collect all unique snap columns
        snap_columns = list(set(config['snap_column'] for config in POSITION_SNAP_MAP.values()))
        columns = ['teamID', 'year', 'position', 'playerId'] + METRICS + snap_columns
        
        # Verify columns exist in Players_Basic_Grades
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM Players_Basic_Grades LIMIT 0"))
            existing_columns = set(result.keys())
            missing_columns = [col for col in columns if col not in existing_columns]
            if missing_columns:
                print(f"Warning: Columns {missing_columns} not found in Players_Basic_Grades. They will be treated as NULL.")

        query = f"SELECT {', '.join(col for col in columns if col in existing_columns)} FROM Players_Basic_Grades"
        df = pd.read_sql(query, engine)

        # Debug: Check data for each position and its metric
        for position, config in POSITION_SNAP_MAP.items():
            metric = config['metric']
            snap_column = config['snap_column']
            if snap_column in df.columns:
                pos_data = df[df['position'] == position][['playerId', 'teamID', 'year', metric, snap_column]]
                print(f"{position} Data (playerId, teamID, year, {metric}, {snap_column}):")
                print(pos_data)
            else:
                print(f"Warning: {snap_column} not in Players_Basic_Grades for {position}")

        # Initialize result DataFrame for ratings
        team_ratings = []

        # Group by teamID and year
        for (team_id, year), group in df.groupby(['teamID', 'year']):
            ratings = {'teamID': team_id, 'year': year}

            # Calculate weighted average for each metric
            for metric in METRICS:
                relevant_positions = [pos for pos, config in POSITION_SNAP_MAP.items() if config['metric'] == metric]
                if not relevant_positions:
                    ratings[metric] = None
                    continue

                metric_data = group[(group['position'].isin(relevant_positions)) & (group[metric].notnull())].copy()
                if metric_data.empty:
                    ratings[metric] = None
                    continue

                snap_column = POSITION_SNAP_MAP[relevant_positions[0]]['snap_column']
                
                if snap_column in metric_data.columns and metric_data[snap_column].notnull().any():
                    print(f"Team {team_id}, Year {year} - {metric} Data with {snap_column}:")
                    print(metric_data[['playerId', metric, snap_column]])
                    metric_data['weighted_grade'] = metric_data[metric] * metric_data[snap_column]
                    total_snaps = metric_data[snap_column].sum()
                    weighted_avg = metric_data['weighted_grade'].sum() / total_snaps if total_snaps > 0 else None
                    ratings[metric] = round(weighted_avg, 2) if weighted_avg is not None else None
                else:
                    print(f"Team {team_id}, Year {year} - No valid {snap_column} for {metric}, using simple average")
                    print(metric_data[['playerId', metric]])
                    ratings[metric] = round(metric_data[metric].mean(), 2) if metric_data[metric].notnull().any() else None

            team_ratings.append(ratings)

        # Convert to DataFrame
        team_ratings_df = pd.DataFrame(team_ratings)

        # Convert teamID to integer, handling NULLs
        team_ratings_df['teamID'] = pd.to_numeric(team_ratings_df['teamID'], errors='coerce').astype('Int64')

        # Save Teams_Season_Ratings
        team_ratings_df.to_sql('Teams_Season_Ratings', engine, if_exists='replace', index=False)

        # Check Teams_Stats_Season columns
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM Teams_Stats_Season LIMIT 0"))
            stats_columns = list(result.keys())
            print("Teams_Stats_Season columns:", stats_columns)

        # Load Teams_Stats_Season
        stats_query = "SELECT teamId, season, school, conference, statName, statValue FROM Teams_Stats_Season"
        stats_df = pd.read_sql(stats_query, engine)

        # Rename season to year and teamId to teamID for consistency
        stats_df = stats_df.rename(columns={'season': 'year', 'teamId': 'teamID'})

        # Convert teamID to integer, handling NULLs
        stats_df['teamID'] = pd.to_numeric(stats_df['teamID'], errors='coerce').astype('Int64')

        # Debug: Check Teams_Stats_Season data
        print("Teams_Stats_Season sample:")
        print(stats_df.head())

        # Pivot Teams_Stats_Season to make statName as columns
        stats_pivot_df = stats_df.pivot_table(
            index=['teamID', 'year', 'school', 'conference'],
            columns='statName',
            values='statValue',
            aggfunc='first'
        ).reset_index()

        # Convert teamID to integer in pivoted DataFrame
        stats_pivot_df['teamID'] = pd.to_numeric(stats_pivot_df['teamID'], errors='coerce').astype('Int64')

        # Calculate per-game stats
        numeric_stats = [col for col in stats_pivot_df.columns if col not in ['teamID', 'year', 'school', 'conference', 'games']]
        for stat in numeric_stats:
            stats_pivot_df[f'{stat}_perGame'] = stats_pivot_df.apply(
                lambda row: round(row[stat] / row['games'], 2) if pd.notnull(row[stat]) and pd.notnull(row['games']) and row['games'] > 0 else None,
                axis=1
            )

        # Debug: Check pivoted stats columns
        print("Pivoted Teams_Stats_Season columns (with per-game):", stats_pivot_df.columns.tolist())

        # Join with Teams_Season_Ratings
        merged_df = pd.merge(
            team_ratings_df,
            stats_pivot_df,
            how='left',
            on=['teamID', 'year'],
            suffixes=('_ratings', '_stats')
        )

        # Convert teamID to integer in merged DataFrame
        merged_df['teamID'] = pd.to_numeric(merged_df['teamID'], errors='coerce').astype('Int64')

        # Debug: Check merged data
        print("Merged DataFrame sample (Teams_Full_Stats_Ratings):")
        print(merged_df.head())

        # Create or replace Teams_Full_Stats_Ratings
        merged_df.to_sql('Teams_Full_Stats_Ratings', engine, if_exists='replace', index=False)

        print("Teams_Full_Stats_Ratings table created successfully!")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    calculate_weighted_team_ratings()