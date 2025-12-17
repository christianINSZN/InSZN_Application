import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("CROSS-SEASON VALIDATION - TRAIN ON 2024, PREDICT 2025")
print("=" * 80)
print("\nThis simulates real-world usage:")
print("  → Use last season's data to predict this season")
print("  → Team-agnostic: Just stats vs stats")
print("  → Like sportsbooks operate!")

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

# Remove duplicate columns
data = data.loc[:, ~data.columns.duplicated()]

# Check what years we have
years_available = sorted(data['year'].unique())
print(f"  ✓ Years available: {years_available}")

# ============================================================================
# STEP 2: Define features (team-agnostic!)
# ============================================================================
print("\n[STEP 2] Defining team-agnostic features...")

feature_cols = [
    # Season performance (not team identity!)
    'team_season_avg_yards',
    'team_season_avg_ypa',
    'team_season_avg_run_block_grade',
    'team_adjusted_off_strength',
    
    # Recent form
    'team_last3_avg_yards',
    'team_last3_avg_ypa',
    'team_last3_avg_run_block_grade',
    
    # Consistency (key for generalization!)
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
    
    # Opponent features
    'opp_season_avg_yards_allowed',
    'opp_season_avg_run_def_grade',
    'opp_adjusted_def_strength',
    'opp_yards_allowed_std',
    'opp_yards_allowed_cv',
    
    # Context (NOT team identity)
    'is_home',
    'week'
]

available_features = [col for col in feature_cols if col in data.columns]
print(f"  ✓ Using {len(available_features)} features")
print(f"  ✓ NOTE: No team IDs used - purely statistical relationships!")

# ============================================================================
# STEP 3: Split by season
# ============================================================================
print("\n[STEP 3] Splitting by season...")

# Train on 2024, test on 2025
train_data = data[data['year'] == 2024].copy()
test_data = data[data['year'] == 2025].copy()

print(f"  Training (2024):  {len(train_data)} games")
print(f"  Testing (2025):   {len(test_data)} games")

# Clean data
train_clean = train_data[available_features + ['yards', 'teamID', 'week']].dropna()
test_clean = test_data[available_features + ['yards', 'teamID', 'week']].dropna()

X_train = train_clean[available_features]
y_train = train_clean['yards']
X_test = test_clean[available_features]
y_test = test_clean['yards']

print(f"\n  After cleaning:")
print(f"    Training:  {len(X_train)} games")
print(f"    Testing:   {len(X_test)} games")

# ============================================================================
# STEP 4: Train models
# ============================================================================
print("\n[STEP 4] Training models on 2024 data...")

models = {
    'Linear Regression': LinearRegression(),
    'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
}

results = {}

for model_name, model in models.items():
    print(f"\n  Training {model_name}...")
    model.fit(X_train, y_train)
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Metrics
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
        'predictions': y_test_pred
    }
    
    print(f"    2024 (Train): MAE = {train_mae:.1f} yards | R² = {train_r2:.3f}")
    print(f"    2025 (Test):  MAE = {test_mae:.1f} yards | R² = {test_r2:.3f}")

best_model_name = min(results.keys(), key=lambda k: results[k]['test_mae'])
print(f"\n  ✓ Best model for cross-season: {best_model_name}")

# ============================================================================
# STEP 5: Baseline comparisons
# ============================================================================
print("\n[STEP 5] Baseline Comparisons (2025 predictions):")

baseline_1_mae = mean_absolute_error(y_test, test_clean['team_season_avg_yards'])
print(f"  Baseline 1 (Team's Season Avg):    MAE = {baseline_1_mae:.1f} yards")

if 'team_last3_avg_yards' in test_clean.columns:
    test_with_last3 = test_clean.dropna(subset=['team_last3_avg_yards'])
    if len(test_with_last3) > 0:
        baseline_2_mae = mean_absolute_error(test_with_last3['yards'], test_with_last3['team_last3_avg_yards'])
        print(f"  Baseline 2 (Team's Last 3 Avg):    MAE = {baseline_2_mae:.1f} yards")

print(f"  Our Model ({best_model_name}):  MAE = {results[best_model_name]['test_mae']:.1f} yards")

improvement = ((baseline_1_mae - results[best_model_name]['test_mae']) / baseline_1_mae) * 100
print(f"\n  ✓ Improvement over baseline: {improvement:.1f}%")

# ============================================================================
# STEP 6: Error distribution on 2025
# ============================================================================
print(f"\n[STEP 6] 2025 Prediction Error Distribution:")

test_clean_with_preds = test_clean.copy()
test_clean_with_preds['predicted_yards'] = results[best_model_name]['predictions']
test_clean_with_preds['error'] = test_clean_with_preds['yards'] - test_clean_with_preds['predicted_yards']
test_clean_with_preds['abs_error'] = np.abs(test_clean_with_preds['error'])

error_buckets = [
    (0, 20), (20, 40), (40, 60), (60, 80), (80, 100), (100, 150), (150, float('inf'))
]

print("\n  Error Range          | Games | % of Total | Avg Error")
print("  " + "-" * 60)

total_games = len(test_clean_with_preds)
for min_err, max_err in error_buckets:
    mask = (test_clean_with_preds['abs_error'] >= min_err) & (test_clean_with_preds['abs_error'] < max_err)
    count = mask.sum()
    pct = (count / total_games) * 100
    avg_err = test_clean_with_preds.loc[mask, 'abs_error'].mean() if count > 0 else 0
    
    range_str = f"±{min_err}-{max_err} yards" if max_err != float('inf') else f"±{min_err}+ yards"
    print(f"  {range_str:20s} | {count:5d} | {pct:6.1f}%   | {avg_err:6.1f}")

# Cumulative
print("\n  Cumulative Accuracy (2025):")
for threshold in [25, 50, 75, 100, 150]:
    within = (test_clean_with_preds['abs_error'] <= threshold).sum()
    pct = (within / total_games) * 100
    print(f"    Within ±{threshold:3d} yards: {within:4d} games ({pct:5.1f}%)")

# ============================================================================
# STEP 7: Week-by-week performance in 2025
# ============================================================================
print(f"\n[STEP 7] 2025 Performance by Week:")

# Remove duplicate columns
test_clean_with_preds = test_clean_with_preds.loc[:, ~test_clean_with_preds.columns.duplicated()]

weekly_2025 = test_clean_with_preds.groupby('week').agg({
    'abs_error': ['count', 'mean'],
    'error': ['mean', 'std']
}).round(1)

weekly_2025.columns = ['games', 'mae', 'mean_error', 'std_error']
print("\n" + weekly_2025.to_string())

# ============================================================================
# STEP 8: Generalization analysis
# ============================================================================
print(f"\n[STEP 8] Generalization Analysis:")

train_test_gap = results[best_model_name]['test_mae'] - results[best_model_name]['train_mae']
print(f"  Train (2024) MAE: {results[best_model_name]['train_mae']:.1f} yards")
print(f"  Test (2025) MAE:  {results[best_model_name]['test_mae']:.1f} yards")
print(f"  Gap:              {train_test_gap:+.1f} yards")

if abs(train_test_gap) < 5:
    print(f"\n  ✓✓✓ EXCELLENT GENERALIZATION!")
    print(f"      Model performs similarly on new season")
    print(f"      → Statistical relationships hold across years")
elif abs(train_test_gap) < 10:
    print(f"\n  ✓✓ GOOD GENERALIZATION")
    print(f"      Model performs well on new season")
elif abs(train_test_gap) < 20:
    print(f"\n  ✓ ACCEPTABLE GENERALIZATION")
    print(f"      Some degradation but still useful")
else:
    print(f"\n  ⚠ POOR GENERALIZATION")
    print(f"      Model may be overfitting to 2024 specifics")

# ============================================================================
# STEP 9: Save results
# ============================================================================
print(f"\n[STEP 9] Saving cross-season predictions...")

test_clean_with_preds.to_sql('Rushing_Predictions_2025_CrossSeason', conn, if_exists='replace', index=False)
print(f"  ✓ Saved to Rushing_Predictions_2025_CrossSeason table")

conn.close()

print("\n" + "=" * 80)
print("✓ CROSS-SEASON VALIDATION COMPLETE")
print("=" * 80)
print("\nKey Takeaway:")
print("  This shows if your model learned generalizable patterns")
print("  vs just memorizing 2024-specific quirks.")
print("\n  Good generalization = Ready for real-world betting/predictions!")
print("  Poor generalization = Need simpler model or more features")