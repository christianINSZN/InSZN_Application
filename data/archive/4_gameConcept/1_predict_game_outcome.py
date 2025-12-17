import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score
import warnings
warnings.filterwarnings('ignore')

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("GAME OUTCOME PREDICTION - FROM TOTAL OFFENSE MODEL")
print("=" * 80)

# ============================================================================
# STEP 1: Load game results
# ============================================================================
print("\n[STEP 1] Loading game results...")

games_df = pd.read_sql_query("""
    SELECT 
        id as game_id,
        season as year,
        week,
        seasonType,
        homeId as home_team_id,
        awayId as away_team_id,
        homePoints as home_score,
        awayPoints as away_score,
        homeTeam as home_team_name,
        awayTeam as away_team_name,
        draftKingsSpread as vegas_spread,
        draftKingsHomeMoneyline as home_moneyline,
        draftKingsAwayMoneyline as away_moneyline,
        draftKingsOverUnder as over_under
    FROM Teams_Games
    WHERE season IN (2024, 2025)
        AND homePoints IS NOT NULL
        AND awayPoints IS NOT NULL
        AND seasonType = 'regular'
    ORDER BY season, week
""", conn)

print(f"  ✓ Loaded {len(games_df)} completed games")
print(f"    Games with Vegas lines: {games_df['vegas_spread'].notna().sum()}")

print(f"  ✓ Loaded {len(games_df)} completed games")

# Create win indicator (1 = home win, 0 = away win)
games_df['home_win'] = (games_df['home_score'] > games_df['away_score']).astype(int)
games_df['point_differential'] = games_df['home_score'] - games_df['away_score']

print(f"    Home team wins: {games_df['home_win'].sum()} ({games_df['home_win'].mean()*100:.1f}%)")
print(f"    Away team wins: {(1-games_df['home_win']).sum()} ({(1-games_df['home_win']).mean()*100:.1f}%)")

# ============================================================================
# STEP 2: Load our total offense predictions for both teams
# ============================================================================
print("\n[STEP 2] Loading total offense predictions...")

predictions_df = pd.read_sql_query("""
    SELECT 
        year, week, seasonType, teamID, 
        total_yards as actual_yards,
        predicted_total_yards
    FROM TotalOffense_Predictions_2025
""", conn)

print(f"  ✓ Loaded {len(predictions_df)} team predictions")

# ============================================================================
# STEP 3: Match predictions to games (home and away)
# ============================================================================
print("\n[STEP 3] Matching predictions to games...")

# Merge home team predictions
games_with_pred = games_df.merge(
    predictions_df,
    left_on=['year', 'week', 'seasonType', 'home_team_id'],
    right_on=['year', 'week', 'seasonType', 'teamID'],
    how='inner',
    suffixes=('', '_home')
)

# Merge away team predictions
games_with_pred = games_with_pred.merge(
    predictions_df,
    left_on=['year', 'week', 'seasonType', 'away_team_id'],
    right_on=['year', 'week', 'seasonType', 'teamID'],
    how='inner',
    suffixes=('_home', '_away')
)

# Clean up column names
games_with_pred = games_with_pred.rename(columns={
    'predicted_total_yards_home': 'home_predicted_yards',
    'predicted_total_yards_away': 'away_predicted_yards',
    'actual_yards_home': 'home_actual_yards',
    'actual_yards_away': 'away_actual_yards'
})

print(f"  ✓ Matched {len(games_with_pred)} games with predictions for both teams")

# Debug: Check Vegas line availability
vegas_available = games_with_pred['vegas_spread'].notna().sum()
print(f"  ✓ Vegas spreads available: {vegas_available} games ({vegas_available/len(games_with_pred)*100:.1f}%)")
print(f"  ✓ Home moneylines available: {games_with_pred['home_moneyline'].notna().sum()} games")

if vegas_available == 0:
    print("\n  ⚠️  WARNING: No Vegas lines in matched games!")
    print("     This might be due to:")
    print("     - Lower-tier games (FCS, D2, D3)")
    print("     - Early-season 2025 games (lines not set yet)")
    print("     - Data source limitations")
    
    # Check a few sample games
    print("\n  Sample of games WITHOUT Vegas lines:")
    sample = games_with_pred[games_with_pred['vegas_spread'].isna()].head(3)
    for idx, row in sample.iterrows():
        print(f"    Week {row['week']}: {row.get('home_team_name', row['home_team_id'])} vs {row.get('away_team_name', row['away_team_id'])}")


# ============================================================================
# STEP 4: Calculate yards-to-points conversion
# ============================================================================
print("\n[STEP 4] Calculating yards-to-points conversion...")

# Calculate actual yards per point for calibration
games_with_pred['home_yards_per_point'] = games_with_pred['home_actual_yards'] / games_with_pred['home_score']
games_with_pred['away_yards_per_point'] = games_with_pred['away_actual_yards'] / games_with_pred['away_score']

avg_yards_per_point = pd.concat([
    games_with_pred['home_yards_per_point'],
    games_with_pred['away_yards_per_point']
]).median()

print(f"  ✓ Average yards per point: {avg_yards_per_point:.2f}")
print(f"    Inverse: {1/avg_yards_per_point:.4f} points per yard")

# ============================================================================
# STEP 5: Predict game outcomes from yards
# ============================================================================
print("\n[STEP 5] Predicting game outcomes...")

# Convert predicted yards to predicted points
games_with_pred['home_predicted_points'] = games_with_pred['home_predicted_yards'] / avg_yards_per_point
games_with_pred['away_predicted_points'] = games_with_pred['away_predicted_yards'] / avg_yards_per_point

# Predicted point differential and winner
games_with_pred['predicted_point_diff'] = (
    games_with_pred['home_predicted_points'] - 
    games_with_pred['away_predicted_points']
)
games_with_pred['predicted_home_win'] = (games_with_pred['predicted_point_diff'] > 0).astype(int)

# Calculate prediction confidence (based on margin)
games_with_pred['prediction_confidence'] = np.abs(games_with_pred['predicted_point_diff'])

print(f"  ✓ Generated predictions for {len(games_with_pred)} games")

# ============================================================================
# STEP 5b: Add Vegas-based features
# ============================================================================
print("\n[STEP 5b] Adding Vegas line features...")

# Convert moneylines to implied probabilities
def moneyline_to_prob(moneyline):
    """Convert American moneyline to implied win probability"""
    if pd.isna(moneyline):
        return np.nan
    if moneyline > 0:
        return 100 / (moneyline + 100)
    else:
        return abs(moneyline) / (abs(moneyline) + 100)

games_with_pred['vegas_home_prob'] = games_with_pred['home_moneyline'].apply(moneyline_to_prob)
games_with_pred['vegas_away_prob'] = games_with_pred['away_moneyline'].apply(moneyline_to_prob)

# Vegas predicted winner (from spread)
games_with_pred['vegas_home_win'] = (games_with_pred['vegas_spread'] < 0).astype(int)
games_with_pred['vegas_spread_abs'] = np.abs(games_with_pred['vegas_spread'])

# Our model vs Vegas comparison
games_with_pred['spread_diff'] = games_with_pred['predicted_point_diff'] - games_with_pred['vegas_spread']
games_with_pred['spread_diff_abs'] = np.abs(games_with_pred['spread_diff'])

# Agreement/disagreement
games_with_pred['models_agree'] = (
    games_with_pred['predicted_home_win'] == games_with_pred['vegas_home_win']
).astype(int)

# Calculate our implied probability (from point differential)
# Simple sigmoid: prob = 1 / (1 + exp(-diff/14))
games_with_pred['our_home_prob'] = 1 / (1 + np.exp(-games_with_pred['predicted_point_diff'] / 14))

# Probability difference
games_with_pred['prob_diff'] = games_with_pred['our_home_prob'] - games_with_pred['vegas_home_prob']

vegas_available = games_with_pred['vegas_spread'].notna().sum()
print(f"  ✓ Vegas lines available for {vegas_available} games ({vegas_available/len(games_with_pred)*100:.1f}%)")
print(f"  ✓ Models agree on winner: {games_with_pred['models_agree'].sum()} games")
print(f"  ✓ Models disagree: {len(games_with_pred) - games_with_pred['models_agree'].sum()} games")

# ============================================================================
# STEP 6: Evaluate accuracy
# ============================================================================
print("\n[STEP 6] Evaluating prediction accuracy...")

accuracy = accuracy_score(games_with_pred['home_win'], games_with_pred['predicted_home_win'])

print(f"\n  Overall Accuracy: {accuracy*100:.1f}%")
print(f"  Correct predictions: {(games_with_pred['home_win'] == games_with_pred['predicted_home_win']).sum()}")
print(f"  Incorrect predictions: {(games_with_pred['home_win'] != games_with_pred['predicted_home_win']).sum()}")

# Confusion matrix
cm = confusion_matrix(games_with_pred['home_win'], games_with_pred['predicted_home_win'])
print(f"\n  Confusion Matrix:")
print(f"                    Predicted Away Win | Predicted Home Win")
print(f"  Actual Away Win:        {cm[0,0]:4d}        |       {cm[0,1]:4d}")
print(f"  Actual Home Win:        {cm[1,0]:4d}        |       {cm[1,1]:4d}")

# ============================================================================
# STEP 7: Accuracy by confidence level
# ============================================================================
print("\n[STEP 7] Accuracy by prediction confidence...")

confidence_ranges = [
    (0, 3, "±0-3 points (toss-up)"),
    (3, 7, "±3-7 points (narrow)"),
    (7, 14, "±7-14 points (comfortable)"),
    (14, 21, "±14-21 points (strong)"),
    (21, np.inf, "±21+ points (blowout)")
]

print(f"\n  {'Confidence Range':<25} | {'Games':<6} | {'Accuracy':<10} | {'Avg Error'}")
print("  " + "-" * 70)

for low, high, label in confidence_ranges:
    mask = (games_with_pred['prediction_confidence'] >= low) & (games_with_pred['prediction_confidence'] < high)
    if mask.sum() > 0:
        conf_accuracy = accuracy_score(
            games_with_pred.loc[mask, 'home_win'],
            games_with_pred.loc[mask, 'predicted_home_win']
        )
        avg_error = np.abs(
            games_with_pred.loc[mask, 'point_differential'] - 
            games_with_pred.loc[mask, 'predicted_point_diff']
        ).mean()
        print(f"  {label:<25} | {mask.sum():<6} | {conf_accuracy*100:>6.1f}%   | {avg_error:>8.1f}")

# ============================================================================
# STEP 8: Point spread accuracy
# ============================================================================
print("\n[STEP 8] Point spread prediction accuracy...")

spread_error = np.abs(
    games_with_pred['point_differential'] - 
    games_with_pred['predicted_point_diff']
)

print(f"\n  Mean Absolute Error (point spread): {spread_error.mean():.1f} points")
print(f"  Median Absolute Error: {spread_error.median():.1f} points")

print(f"\n  Spread accuracy distribution:")
for threshold in [3, 7, 10, 14, 21]:
    within = (spread_error <= threshold).sum()
    pct = (within / len(spread_error)) * 100
    print(f"    Within ±{threshold:2d} points: {within:3d} games ({pct:5.1f}%)")

# ============================================================================
# STEP 9: Compare to naive baselines
# ============================================================================
print("\n[STEP 9] Comparison to baseline predictions...")

# Baseline 1: Always predict home team wins (home field advantage)
home_always_accuracy = games_with_pred['home_win'].mean()

# Baseline 2: Predict based on which team has higher season average yards
games_with_pred['home_season_avg'] = games_with_pred.groupby(['home_team_id', 'year'])['home_actual_yards'].transform('mean')
games_with_pred['away_season_avg'] = games_with_pred.groupby(['away_team_id', 'year'])['away_actual_yards'].transform('mean')
games_with_pred['baseline2_home_win'] = (games_with_pred['home_season_avg'] > games_with_pred['away_season_avg']).astype(int)
baseline2_accuracy = accuracy_score(games_with_pred['home_win'], games_with_pred['baseline2_home_win'])

# Baseline 3: Vegas spread
vegas_games = games_with_pred[games_with_pred['vegas_spread'].notna()].copy()
if len(vegas_games) > 0:
    vegas_accuracy = accuracy_score(vegas_games['home_win'], vegas_games['vegas_home_win'])
    print(f"\n  Baseline 1 (Always pick home):     {home_always_accuracy*100:.1f}%")
    print(f"  Baseline 2 (Season avg yards):     {baseline2_accuracy*100:.1f}%")
    print(f"  Baseline 3 (Vegas spread):         {vegas_accuracy*100:.1f}%")
    print(f"  Our Model (Yards prediction):      {accuracy*100:.1f}%")
    
    # Show performance on Vegas games only
    our_accuracy_vegas_games = accuracy_score(vegas_games['home_win'], vegas_games['predicted_home_win'])
    print(f"\n  Our Model (Vegas games only):      {our_accuracy_vegas_games*100:.1f}%")
    
    improvement = accuracy - max(home_always_accuracy, baseline2_accuracy, vegas_accuracy)
    print(f"\n  vs Best Baseline: {improvement*100:+.1f} percentage points")
else:
    print(f"\n  Baseline 1 (Always pick home):     {home_always_accuracy*100:.1f}%")
    print(f"  Baseline 2 (Season avg yards):     {baseline2_accuracy*100:.1f}%")
    print(f"  Our Model (Yards prediction):      {accuracy*100:.1f}%")
    
    improvement = accuracy - max(home_always_accuracy, baseline2_accuracy)
    print(f"\n  ✓ Improvement over best baseline: {improvement*100:.1f} percentage points")

# ============================================================================
# STEP 9b: Analyze where we beat Vegas
# ============================================================================
if len(vegas_games) > 0:
    print("\n[STEP 9b] Where we beat Vegas...")
    
    # Games where we were right and Vegas was wrong
    we_right_vegas_wrong = vegas_games[
        (vegas_games['predicted_home_win'] == vegas_games['home_win']) &
        (vegas_games['vegas_home_win'] != vegas_games['home_win'])
    ]
    
    # Games where Vegas was right and we were wrong
    vegas_right_we_wrong = vegas_games[
        (vegas_games['vegas_home_win'] == vegas_games['home_win']) &
        (vegas_games['predicted_home_win'] != vegas_games['home_win'])
    ]
    
    print(f"\n  We were right, Vegas wrong:   {len(we_right_vegas_wrong)} games")
    print(f"  Vegas right, we were wrong:   {len(vegas_right_we_wrong)} games")
    print(f"  Both right:                   {((vegas_games['predicted_home_win'] == vegas_games['home_win']) & (vegas_games['vegas_home_win'] == vegas_games['home_win'])).sum()} games")
    print(f"  Both wrong:                   {((vegas_games['predicted_home_win'] != vegas_games['home_win']) & (vegas_games['vegas_home_win'] != vegas_games['home_win'])).sum()} games")
    
    # Analyze disagreement games
    disagreement_games = vegas_games[vegas_games['models_agree'] == 0]
    if len(disagreement_games) > 0:
        our_accuracy_disagree = accuracy_score(
            disagreement_games['home_win'], 
            disagreement_games['predicted_home_win']
        )
        vegas_accuracy_disagree = accuracy_score(
            disagreement_games['home_win'],
            disagreement_games['vegas_home_win']
        )
        
        print(f"\n  DISAGREEMENT GAMES ({len(disagreement_games)} total):")
        print(f"    Our accuracy when we disagree:   {our_accuracy_disagree*100:.1f}%")
        print(f"    Vegas accuracy when we disagree: {vegas_accuracy_disagree*100:.1f}%")
        
        if our_accuracy_disagree > vegas_accuracy_disagree:
            print(f"    ✓ We're better on disagreements! (+{(our_accuracy_disagree - vegas_accuracy_disagree)*100:.1f}%)")
        else:
            print(f"    Vegas is better on disagreements (+{(vegas_accuracy_disagree - our_accuracy_disagree)*100:.1f}%)")

# ============================================================================
# STEP 10: Best and worst predictions
# ============================================================================
print("\n[STEP 10] Most confident correct predictions (2025)...")

correct_preds = games_with_pred[
    games_with_pred['home_win'] == games_with_pred['predicted_home_win']
].copy()
correct_preds = correct_preds.sort_values('prediction_confidence', ascending=False)

print(f"\n  Top 5 most confident CORRECT predictions:")
print(f"  {'Home Team':<20} {'Away Team':<20} {'Predicted':<12} {'Actual':<10} {'Confidence'}")
for idx, row in correct_preds.head(5).iterrows():
    winner = "Home" if row['predicted_home_win'] == 1 else "Away"
    home = row.get('home_team_name', row['home_team_id'])[:18]
    away = row.get('away_team_name', row['away_team_id'])[:18]
    print(f"  {home:<20} {away:<20} {winner:<12} {row['point_differential']:>5.1f}     {row['prediction_confidence']:>8.1f}")

print(f"\n  Top 5 biggest UPSETS (wrong predictions with high confidence):")
incorrect_preds = games_with_pred[
    games_with_pred['home_win'] != games_with_pred['predicted_home_win']
].copy()
incorrect_preds = incorrect_preds.sort_values('prediction_confidence', ascending=False)

print(f"  {'Home Team':<20} {'Away Team':<20} {'Predicted':<12} {'Actual':<10} {'Confidence'}")
for idx, row in incorrect_preds.head(5).iterrows():
    winner = "Home" if row['predicted_home_win'] == 1 else "Away"
    home = row.get('home_team_name', row['home_team_id'])[:18]
    away = row.get('away_team_name', row['away_team_id'])[:18]
    print(f"  {home:<20} {away:<20} {winner:<12} {row['point_differential']:>5.1f}     {row['prediction_confidence']:>8.1f}")

# ============================================================================
# STEP 11: Save results
# ============================================================================
print("\n[STEP 11] Saving predictions...")

save_cols = [
    'game_id', 'year', 'week', 'seasonType',
    'home_team_id', 'away_team_id',
    'home_team_name', 'away_team_name',
    'home_score', 'away_score', 'home_win', 'point_differential',
    'home_predicted_yards', 'away_predicted_yards',
    'home_predicted_points', 'away_predicted_points',
    'predicted_point_diff', 'predicted_home_win', 'prediction_confidence',
    'vegas_spread', 'home_moneyline', 'away_moneyline',
    'vegas_home_prob', 'vegas_away_prob', 'our_home_prob',
    'vegas_home_win', 'models_agree', 'spread_diff', 'prob_diff'
]

# Only save columns that exist
save_cols = [col for col in save_cols if col in games_with_pred.columns]

games_with_pred[save_cols].to_sql('Game_Outcome_Predictions_2025', conn, if_exists='replace', index=False)

print(f"  ✓ Saved to Game_Outcome_Predictions_2025 table")

conn.close()

print("\n" + "=" * 80)
print("✓ GAME OUTCOME PREDICTION COMPLETE")
print("=" * 80)
print(f"\nOverall Accuracy: {accuracy*100:.1f}%")
print(f"Point Spread MAE: {spread_error.mean():.1f} points")
print(f"Games Analyzed: {len(games_with_pred)}")