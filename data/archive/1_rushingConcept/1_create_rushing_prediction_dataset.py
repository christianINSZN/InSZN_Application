import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("RUSHING PREDICTION DATASET V2 - WITH GAP/ZONE & RECENT FORM")
print("=" * 80)

# ============================================================================
# STEP 1: Load all three tables
# ============================================================================
print("\n[STEP 1] Loading data tables...")

# Rushing stats (offense)
rushing = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID, 
           attempts, yards, touchdowns, first_downs,
           ypa, yco_attempt, explosive, breakaway_percent,
           grades_run, elusive_rating
    FROM Team_RushingGrades_Weekly
    ORDER BY year, seasonType, week, teamID
""", conn)
print(f"  ✓ Loaded {len(rushing)} rushing records")

# Run blocking stats (offense) - WITH GAP/ZONE SPLITS
run_blocking = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           grades_run_block,
           gap_grades_run_block, zone_grades_run_block,
           gap_snap_counts_run_play, zone_snap_counts_run_play,
           snap_counts_run_play
    FROM Team_RunBlocking_Weekly
    ORDER BY year, seasonType, week, teamID
""", conn)
print(f"  ✓ Loaded {len(run_blocking)} run blocking records")

# Run defense stats (defense)
run_defense = pd.read_sql_query("""
    SELECT year, week, seasonType, teamID,
           grades_run_defense,
           tackles, missed_tackles, stops, stop_percent,
           snap_counts_run
    FROM Team_DefenseRunDefense_Weekly
    ORDER BY year, seasonType, week, teamID
""", conn)
print(f"  ✓ Loaded {len(run_defense)} run defense records")

# Get game info
games = pd.read_sql_query("""
    SELECT id, season as year, week, seasonType,
           homeId, awayId
    FROM Teams_Games
    ORDER BY season, seasonType, week
""", conn)
print(f"  ✓ Loaded {len(games)} games")

conn.close()

# ============================================================================
# STEP 2: Merge offensive stats
# ============================================================================
print("\n[STEP 2] Merging offensive stats...")

offense = rushing.merge(
    run_blocking,
    on=['year', 'week', 'seasonType', 'teamID'],
    how='left'
)
print(f"  ✓ Created offense dataset: {len(offense)} records")

# ============================================================================
# STEP 3: Create game-level dataset
# ============================================================================
print("\n[STEP 3] Creating game-level dataset...")

# Home teams
home_games = games.copy()
home_games['teamID'] = home_games['homeId']
home_games['opponentID'] = home_games['awayId']
home_games['is_home'] = 1

# Away teams
away_games = games.copy()
away_games['teamID'] = away_games['awayId']
away_games['opponentID'] = away_games['homeId']
away_games['is_home'] = 0

# Combine
all_games = pd.concat([home_games, away_games], ignore_index=True)
all_games = all_games[['id', 'year', 'week', 'seasonType', 'teamID', 'opponentID', 'is_home']]

# Merge with offensive stats
game_data = all_games.merge(
    offense,
    on=['year', 'week', 'seasonType', 'teamID'],
    how='inner'
)

# Merge with opponent's defensive stats
opponent_defense = run_defense.copy()
opponent_defense.columns = ['opp_' + col if col not in ['year', 'week', 'seasonType', 'teamID'] else col for col in opponent_defense.columns]
opponent_defense = opponent_defense.rename(columns={'teamID': 'opponentID'})

game_data = game_data.merge(
    opponent_defense,
    on=['year', 'week', 'seasonType', 'opponentID'],
    how='left'
)

# Remove duplicates
game_data = game_data.drop_duplicates(subset=['year', 'week', 'seasonType', 'teamID', 'opponentID']).reset_index(drop=True)
print(f"  ✓ Created game dataset: {len(game_data)} team-games")

# ============================================================================
# STEP 4: Calculate rolling averages (ALL GAMES and LAST 3 GAMES)
# ============================================================================
print("\n[STEP 4] Calculating rolling averages (season and recent form)...")

game_data = game_data.sort_values(['teamID', 'year', 'seasonType', 'week']).reset_index(drop=True)

# Initialize columns
rolling_cols = {
    # Season averages
    'team_season_avg_yards': np.nan,
    'team_season_avg_ypa': np.nan,
    'team_season_avg_run_block_grade': np.nan,
    'team_season_avg_gap_grade': np.nan,
    'team_season_avg_zone_grade': np.nan,
    
    # NEW: Consistency metrics
    'team_yards_std': np.nan,  # Standard deviation of rushing yards
    'team_yards_cv': np.nan,   # Coefficient of variation (std/mean)
    'team_boom_rate': np.nan,  # % of games significantly above average
    'team_bust_rate': np.nan,  # % of games significantly below average
    
    # Last 3 games averages (recent form)
    'team_last3_avg_yards': np.nan,
    'team_last3_avg_ypa': np.nan,
    'team_last3_avg_run_block_grade': np.nan,
    
    # Opponent season averages
    'opp_season_avg_yards_allowed': np.nan,
    'opp_season_avg_run_def_grade': np.nan,
    
    # NEW: Opponent consistency metrics
    'opp_yards_allowed_std': np.nan,
    'opp_yards_allowed_cv': np.nan,
    
    # Adjusted strength metrics
    'expected_yards': np.nan,
    'yards_over_expected': np.nan,
    'team_adjusted_off_strength': np.nan,
    'opp_adjusted_def_strength': np.nan
}

for col in rolling_cols.keys():
    game_data[col] = rolling_cols[col]

# Calculate for each team
for team_id in game_data['teamID'].unique():
    team_mask = game_data['teamID'] == team_id
    team_games = game_data[team_mask].copy()
    
    for idx in team_games.index:
        current_year = game_data.loc[idx, 'year']
        current_season_type = game_data.loc[idx, 'seasonType']
        current_week = game_data.loc[idx, 'week']
        
        # Get all prior games for this team (same season)
        prior_mask = (
            (game_data['teamID'] == team_id) &
            (game_data['year'] == current_year) &
            (game_data['seasonType'] == current_season_type) &
            (game_data['week'] < current_week)
        )
        
        prior_games = game_data[prior_mask]
        
        if len(prior_games) > 0:
            # Season averages
            team_avg_yards = prior_games['yards'].mean()
            game_data.loc[idx, 'team_season_avg_yards'] = team_avg_yards
            game_data.loc[idx, 'team_season_avg_ypa'] = prior_games['ypa'].mean()
            game_data.loc[idx, 'team_season_avg_run_block_grade'] = prior_games['grades_run_block'].mean()
            game_data.loc[idx, 'team_season_avg_gap_grade'] = prior_games['gap_grades_run_block'].mean()
            game_data.loc[idx, 'team_season_avg_zone_grade'] = prior_games['zone_grades_run_block'].mean()
            
            # NEW: Consistency metrics (need at least 3 games for meaningful stats)
            if len(prior_games) >= 3:
                yards_std = prior_games['yards'].std()
                game_data.loc[idx, 'team_yards_std'] = yards_std
                game_data.loc[idx, 'team_yards_cv'] = yards_std / team_avg_yards if team_avg_yards > 0 else 0
                
                # Boom = >50 yards above average, Bust = >50 yards below average
                yards_diff = prior_games['yards'] - team_avg_yards
                game_data.loc[idx, 'team_boom_rate'] = (yards_diff > 50).sum() / len(prior_games)
                game_data.loc[idx, 'team_bust_rate'] = (yards_diff < -50).sum() / len(prior_games)
            
            # Last 3 games (recent form)
            last_3 = prior_games.tail(3)
            if len(last_3) > 0:
                game_data.loc[idx, 'team_last3_avg_yards'] = last_3['yards'].mean()
                game_data.loc[idx, 'team_last3_avg_ypa'] = last_3['ypa'].mean()
                game_data.loc[idx, 'team_last3_avg_run_block_grade'] = last_3['grades_run_block'].mean()

print(f"  ✓ Calculated offensive rolling stats")

# Calculate opponent defensive stats
for team_id in game_data['opponentID'].unique():
    opp_mask = game_data['opponentID'] == team_id
    
    for idx in game_data[opp_mask].index:
        current_year = game_data.loc[idx, 'year']
        current_season_type = game_data.loc[idx, 'seasonType']
        current_week = game_data.loc[idx, 'week']
        
        # Find all games where this opponent played defense
        prior_def_mask = (
            (game_data['teamID'] == team_id) &
            (game_data['year'] == current_year) &
            (game_data['seasonType'] == current_season_type) &
            (game_data['week'] < current_week)
        )
        
        prior_def_games = game_data[prior_def_mask]
        
        if len(prior_def_games) > 0:
            opp_avg_yards_allowed = prior_def_games['yards'].mean()
            game_data.loc[idx, 'opp_season_avg_yards_allowed'] = opp_avg_yards_allowed
            game_data.loc[idx, 'opp_season_avg_run_def_grade'] = prior_def_games['opp_grades_run_defense'].mean()
            
            # NEW: Opponent consistency metrics
            if len(prior_def_games) >= 3:
                opp_yards_std = prior_def_games['yards'].std()
                game_data.loc[idx, 'opp_yards_allowed_std'] = opp_yards_std
                game_data.loc[idx, 'opp_yards_allowed_cv'] = opp_yards_std / opp_avg_yards_allowed if opp_avg_yards_allowed > 0 else 0

print(f"  ✓ Calculated defensive rolling stats")

# Calculate expected yards and adjusted strength
game_data['expected_yards'] = game_data['opp_season_avg_yards_allowed']
game_data['yards_over_expected'] = game_data['yards'] - game_data['expected_yards']

# Calculate adjusted strength ratings (rolling average of over/under performance)
for team_id in game_data['teamID'].unique():
    team_mask = game_data['teamID'] == team_id
    
    for idx in game_data[team_mask].index:
        current_year = game_data.loc[idx, 'year']
        current_season_type = game_data.loc[idx, 'seasonType']
        current_week = game_data.loc[idx, 'week']
        
        prior_mask = (
            (game_data['teamID'] == team_id) &
            (game_data['year'] == current_year) &
            (game_data['seasonType'] == current_season_type) &
            (game_data['week'] < current_week) &
            (game_data['yards_over_expected'].notna())
        )
        
        prior_games = game_data[prior_mask]
        
        if len(prior_games) > 0:
            game_data.loc[idx, 'team_adjusted_off_strength'] = prior_games['yards_over_expected'].mean()

# Opponent adjusted defensive strength
for team_id in game_data['opponentID'].unique():
    opp_mask = game_data['opponentID'] == team_id
    
    for idx in game_data[opp_mask].index:
        current_year = game_data.loc[idx, 'year']
        current_season_type = game_data.loc[idx, 'seasonType']
        current_week = game_data.loc[idx, 'week']
        
        prior_def_mask = (
            (game_data['opponentID'] == team_id) &
            (game_data['year'] == current_year) &
            (game_data['seasonType'] == current_season_type) &
            (game_data['week'] < current_week) &
            (game_data['yards_over_expected'].notna())
        )
        
        prior_def_games = game_data[prior_def_mask]
        
        if len(prior_def_games) > 0:
            game_data.loc[idx, 'opp_adjusted_def_strength'] = prior_def_games['yards_over_expected'].mean()

print(f"  ✓ Calculated adjusted strength ratings")

# ============================================================================
# STEP 5: Calculate gap/zone preference metrics
# ============================================================================
print("\n[STEP 5] Calculating gap/zone preference metrics...")

# Calculate what % of runs are gap vs zone
game_data['team_gap_pct'] = (
    game_data['gap_snap_counts_run_play'] / 
    (game_data['gap_snap_counts_run_play'] + game_data['zone_snap_counts_run_play'])
)

# Calculate gap vs zone efficiency (compared to overall grade)
game_data['team_gap_advantage'] = game_data['gap_grades_run_block'] - game_data['grades_run_block']
game_data['team_zone_advantage'] = game_data['zone_grades_run_block'] - game_data['grades_run_block']

print(f"  ✓ Calculated gap/zone metrics")

# ============================================================================
# STEP 6: Create final modeling dataset
# ============================================================================
print("\n[STEP 6] Creating final modeling dataset...")

modeling_data = game_data[
    game_data['team_season_avg_yards'].notna() &
    game_data['opp_season_avg_yards_allowed'].notna()
].copy()

print(f"  ✓ Modeling dataset: {len(modeling_data)} games")
print(f"  ✓ Years covered: {sorted(modeling_data['year'].unique())}")
print(f"  ✓ Unique teams: {modeling_data['teamID'].nunique()}")

# ============================================================================
# STEP 7: Save to database
# ============================================================================
print("\n[STEP 7] Saving to database...")

conn = sqlite3.connect(DB_FILE)
modeling_data.to_sql('Rushing_Prediction_Dataset', conn, if_exists='replace', index=False)
print(f"  ✓ Saved to table: Rushing_Prediction_Dataset_V2")

summary = modeling_data.groupby('year').agg({
    'teamID': 'count',
    'yards': 'mean',
    'team_last3_avg_yards': lambda x: x.notna().sum()
}).round(2)
summary.columns = ['games', 'avg_yards', 'games_with_recent_form']
print("\n[SUMMARY BY YEAR]")
print(summary)

conn.close()

print("\n" + "=" * 80)
print("✓ ENHANCED DATASET CREATION COMPLETE")
print("=" * 80)
print("\nNew features added:")
print("  • Gap/zone blocking grades and percentages")
print("  • Recent form (last 3 games averages)")
print("  • Gap/zone advantage metrics")
print("  • Season vs recent form comparison")
print("  • Team consistency metrics (std dev, CV, boom/bust rates)")
print("  • Opponent consistency metrics")