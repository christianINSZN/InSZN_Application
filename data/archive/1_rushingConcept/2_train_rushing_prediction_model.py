import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("RUSHING YARDS PREDICTION MODEL - TRAINING & EVALUATION")
print("=" * 80)

# ============================================================================
# STEP 1: Load the prediction dataset
# ============================================================================
print("\n[STEP 1] Loading prediction dataset...")

data = pd.read_sql_query("""
    SELECT *
    FROM Rushing_Prediction_Dataset
    WHERE yards IS NOT NULL
    AND team_season_avg_yards IS NOT NULL
    AND opp_season_avg_yards_allowed IS NOT NULL
""", conn)

print(f"  ✓ Loaded {len(data)} games")
print(f"  ✓ Years: {sorted(data['year'].unique())}")
print(f"  ✓ Teams: {data['teamID'].nunique()}")

# ============================================================================
# STEP 2: Feature Engineering
# ============================================================================
print("\n[STEP 2] Engineering features...")

# Select features for modeling
feature_cols = [
    # Season averages (existing)
    'team_season_avg_yards',
    'team_season_avg_ypa',
    'team_season_avg_run_block_grade',
    'team_adjusted_off_strength',
    
    # Recent form (last 3 games)
    'team_last3_avg_yards',
    'team_last3_avg_ypa',
    'team_last3_avg_run_block_grade',
    
    # NEW: Consistency/variance metrics
    'team_yards_std',
    'team_yards_cv',
    'team_boom_rate',
    'team_bust_rate',
    
    # Gap/zone splits
    'team_season_avg_gap_grade',
    'team_season_avg_zone_grade',
    'team_gap_pct',
    'team_gap_advantage',
    'team_zone_advantage',
    
    # Opponent defensive features
    'opp_season_avg_yards_allowed',
    'opp_season_avg_run_def_grade',
    'opp_adjusted_def_strength',
    'opp_yards_allowed_std',
    'opp_yards_allowed_cv',
    
    # Contextual features
    'is_home',
    'week'
]

# Check which features exist in the data
available_features = [col for col in feature_cols if col in data.columns]
missing_features = [col for col in feature_cols if col not in data.columns]

if missing_features:
    print(f"  ⚠ Missing features: {missing_features}")

print(f"  ✓ Using {len(available_features)} features: {available_features}")

# Create feature matrix and target
# Drop rows with missing values in features or target
modeling_data = data[available_features + ['yards', 'year', 'week', 'teamID', 'opponentID']].dropna()

# Ensure columns are flat (no MultiIndex)
if isinstance(modeling_data.columns, pd.MultiIndex):
    modeling_data.columns = ['_'.join(map(str, col)).strip('_') if isinstance(col, tuple) else col for col in modeling_data.columns]

X = modeling_data[available_features]
y = modeling_data['yards']

print(f"  ✓ Final modeling dataset: {len(modeling_data)} games")

# ============================================================================
# STEP 3: Train/Test Split (chronological)
# ============================================================================
print("\n[STEP 3] Splitting train/test data...")

# Option: Use 2024 for training, could use 2025 for testing (if you have it)
# For now, let's use chronological split within the data
# Train on first 70% of season, test on last 30%

train_size = int(0.7 * len(modeling_data))
train_data = modeling_data.iloc[:train_size].copy()
test_data = modeling_data.iloc[train_size:].copy()

# Ensure flat columns
for df in [train_data, test_data]:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(map(str, col)).strip('_') if isinstance(col, tuple) else col for col in df.columns]

X_train = train_data[available_features]
y_train = train_data['yards']
X_test = test_data[available_features]
y_test = test_data['yards']

print(f"  ✓ Training set: {len(train_data)} games")
print(f"  ✓ Test set: {len(test_data)} games")

# ============================================================================
# STEP 4: Train Multiple Models
# ============================================================================
print("\n[STEP 4] Training models...")

models = {
    'Linear Regression': LinearRegression(),
    'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
}

results = {}

for model_name, model in models.items():
    print(f"\n  Training {model_name}...")
    model.fit(X_train, y_train)
    
    # Make predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Calculate metrics
    train_mae = mean_absolute_error(y_train, y_train_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    
    results[model_name] = {
        'model': model,
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_rmse': train_rmse,
        'test_rmse': test_rmse,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'test_predictions': y_test_pred
    }
    
    print(f"    Train MAE: {train_mae:.1f} yards | RMSE: {train_rmse:.1f} | R²: {train_r2:.3f}")
    print(f"    Test MAE:  {test_mae:.1f} yards | RMSE: {test_rmse:.1f} | R²: {test_r2:.3f}")

# Select best model based on test MAE
best_model_name = min(results.keys(), key=lambda k: results[k]['test_mae'])
best_model = results[best_model_name]['model']
print(f"\n  ✓ Best model: {best_model_name} (Test MAE: {results[best_model_name]['test_mae']:.1f} yards)")

# ============================================================================
# STEP 5: Feature Importance (if available)
# ============================================================================
if best_model_name == 'Random Forest':
    print(f"\n[STEP 5] Feature Importance ({best_model_name}):")
    importances = best_model.feature_importances_
    feature_importance = pd.DataFrame({
        'feature': available_features,
        'importance': importances
    }).sort_values('importance', ascending=False)
    
    for _, row in feature_importance.iterrows():
        print(f"  {row['feature']:40s}: {row['importance']:.3f}")

# ============================================================================
# STEP 6: Weekly Performance Breakdown
# ============================================================================
print(f"\n[STEP 6] Weekly Performance Breakdown (Test Set - {best_model_name}):")

test_data_with_preds = test_data.copy().reset_index(drop=True)

# Remove duplicate columns
test_data_with_preds = test_data_with_preds.loc[:, ~test_data_with_preds.columns.duplicated()]

# Flatten columns if MultiIndex
if isinstance(test_data_with_preds.columns, pd.MultiIndex):
    test_data_with_preds.columns = ['_'.join(map(str, col)).strip('_') if isinstance(col, tuple) else col 
                                      for col in test_data_with_preds.columns]

test_data_with_preds['predicted_yards'] = results[best_model_name]['test_predictions']
test_data_with_preds['error'] = test_data_with_preds['yards'] - test_data_with_preds['predicted_yards']
test_data_with_preds['abs_error'] = np.abs(test_data_with_preds['error'])

# Group by week
weekly_performance = test_data_with_preds.groupby('week', as_index=False).agg({
    'yards': 'count',
    'abs_error': 'mean',
    'error': ['mean', 'std']
}).round(1)

# Flatten column names
weekly_performance.columns = ['week', 'games', 'mae', 'mean_error', 'std_error']
weekly_performance = weekly_performance.set_index('week')
print("\n" + weekly_performance.to_string())

# ============================================================================
# STEP 7: Best and Worst Predictions
# ============================================================================
print(f"\n[STEP 7] Best and Worst Predictions (Test Set):")

# Make sure we're working with clean data
test_data_with_preds = test_data_with_preds.loc[:, ~test_data_with_preds.columns.duplicated()]
test_data_with_preds = test_data_with_preds.sort_values('abs_error')

print("\n  BEST PREDICTIONS (smallest error):")
best_5 = test_data_with_preds.head(5)
for _, row in best_5.iterrows():
    print(f"    Week {int(row['week'])} | Team {int(row['teamID'])} vs {int(row['opponentID'])} | "
          f"Actual: {row['yards']:.0f} | Predicted: {row['predicted_yards']:.0f} | Error: {row['error']:.0f}")

print("\n  WORST PREDICTIONS (largest error):")
worst_5 = test_data_with_preds.tail(5)
for _, row in worst_5.iterrows():
    print(f"    Week {int(row['week'])} | Team {int(row['teamID'])} vs {int(row['opponentID'])} | "
          f"Actual: {row['yards']:.0f} | Predicted: {row['predicted_yards']:.0f} | Error: {row['error']:.0f}")

# ============================================================================
# STEP 8: Baseline Comparison
# ============================================================================
print(f"\n[STEP 8] Baseline Comparisons:")

# Baseline 1: Just use team's prior average (season)
baseline_1_mae = mean_absolute_error(test_data['yards'], test_data['team_season_avg_yards'])
print(f"  Baseline 1 (Team's Season Avg):    MAE = {baseline_1_mae:.1f} yards")

# Baseline 2: Use team's last 3 game average (recent form)
if 'team_last3_avg_yards' in test_data.columns:
    test_with_last3 = test_data.dropna(subset=['team_last3_avg_yards'])
    if len(test_with_last3) > 0:
        baseline_2_mae = mean_absolute_error(test_with_last3['yards'], test_with_last3['team_last3_avg_yards'])
        print(f"  Baseline 2 (Team's Last 3 Avg):    MAE = {baseline_2_mae:.1f} yards")

# Baseline 3: Use expected yards (based on opponent's defense)
if 'expected_yards' in test_data.columns:
    test_with_expected = test_data.dropna(subset=['expected_yards'])
    if len(test_with_expected) > 0:
        baseline_3_mae = mean_absolute_error(test_with_expected['yards'], test_with_expected['expected_yards'])
        print(f"  Baseline 3 (Expected Yards):       MAE = {baseline_3_mae:.1f} yards")

print(f"  Our Model ({best_model_name}):  MAE = {results[best_model_name]['test_mae']:.1f} yards")

improvement = ((baseline_1_mae - results[best_model_name]['test_mae']) / baseline_1_mae) * 100
print(f"\n  ✓ Improvement over baseline: {improvement:.1f}%")

# ============================================================================
# STEP 8b: Error Distribution Analysis
# ============================================================================
print(f"\n[STEP 8b] Prediction Error Distribution:")

# Make sure we have clean data
test_analysis = test_data_with_preds.loc[:, ~test_data_with_preds.columns.duplicated()].copy()

# Calculate error buckets
error_buckets = [
    (0, 20, "Excellent"),
    (20, 40, "Good"),
    (40, 60, "Fair"),
    (60, 80, "Poor"),
    (80, 100, "Bad"),
    (100, 150, "Very Bad"),
    (150, float('inf'), "Terrible")
]

print("\n  Error Range          | Games | % of Total | Avg Error")
print("  " + "-" * 60)

total_games = len(test_analysis)
for min_err, max_err, label in error_buckets:
    mask = (test_analysis['abs_error'] >= min_err) & (test_analysis['abs_error'] < max_err)
    count = mask.sum()
    pct = (count / total_games) * 100
    avg_err = test_analysis.loc[mask, 'abs_error'].mean() if count > 0 else 0
    
    range_str = f"±{min_err}-{max_err} yards" if max_err != float('inf') else f"±{min_err}+ yards"
    print(f"  {range_str:20s} | {count:5d} | {pct:6.1f}%   | {avg_err:6.1f}")

# Cumulative percentages
print("\n  Cumulative Accuracy:")
cumulative_thresholds = [25, 50, 75, 100, 150]
for threshold in cumulative_thresholds:
    within_threshold = (test_analysis['abs_error'] <= threshold).sum()
    pct = (within_threshold / total_games) * 100
    print(f"    Within ±{threshold:3d} yards: {within_threshold:4d} games ({pct:5.1f}%)")

# Over/under prediction analysis
print("\n  Over/Under Prediction Bias:")
over_predictions = (test_analysis['error'] < 0).sum()  # Predicted more than actual
under_predictions = (test_analysis['error'] > 0).sum()  # Predicted less than actual
avg_error = test_analysis['error'].mean()

print(f"    Over-predictions (too high):  {over_predictions:4d} games ({over_predictions/total_games*100:5.1f}%)")
print(f"    Under-predictions (too low):  {under_predictions:4d} games ({under_predictions/total_games*100:5.1f}%)")
print(f"    Average bias:                 {avg_error:+6.1f} yards")

if abs(avg_error) < 5:
    print(f"    ✓ Model is well-calibrated (low bias)")
elif avg_error > 5:
    print(f"    ⚠ Model tends to under-predict (predicts too low)")
else:
    print(f"    ⚠ Model tends to over-predict (predicts too high)")

# ============================================================================
# STEP 9: Save predictions to database
# ============================================================================
print(f"\n[STEP 9] Saving predictions to database...")

# Add predictions to full test set
test_data_with_preds_full = test_data.copy().reset_index(drop=True)

# Remove duplicate columns
test_data_with_preds_full = test_data_with_preds_full.loc[:, ~test_data_with_preds_full.columns.duplicated()]

test_data_with_preds_full['predicted_yards'] = results[best_model_name]['test_predictions']
test_data_with_preds_full['prediction_error'] = test_data_with_preds_full['yards'] - test_data_with_preds_full['predicted_yards']
test_data_with_preds_full['model_used'] = best_model_name

# Save to database
test_data_with_preds_full.to_sql('Rushing_Predictions_Evaluation', conn, if_exists='replace', index=False)
print(f"  ✓ Saved {len(test_data_with_preds_full)} predictions to Rushing_Predictions_Evaluation table")

conn.close()

print("\n" + "=" * 80)
print("✓ MODEL TRAINING & EVALUATION COMPLETE")
print("=" * 80)
print("\nNext Steps:")
print("1. Review weekly performance - which weeks had high errors?")
print("2. Examine worst predictions - what patterns do you see?")
print("3. Consider additional features:")
print("   - Gap vs zone run blocking splits")
print("   - Recent form (last 3 games vs season average)")
print("   - Opponent's tackles/missed tackles rates")
print("   - Weather conditions (if available)")
print("4. Try different model types or hyperparameters")