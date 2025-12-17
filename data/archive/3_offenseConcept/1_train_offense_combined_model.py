import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("COMBINED TOTAL OFFENSE PREDICTION MODEL")
print("=" * 80)

# ============================================================================
# STEP 1: Load both rushing and passing datasets
# ============================================================================
print("\n[STEP 1] Loading rushing and passing datasets...")

rushing_df = pd.read_sql_query("""
    SELECT * FROM Rushing_Prediction_Dataset
""", conn)

passing_df = pd.read_sql_query("""
    SELECT * FROM Passing_Prediction_Dataset_V2
""", conn)

print(f"  ✓ Loaded rushing: {len(rushing_df)} games")
print(f"  ✓ Loaded passing: {len(passing_df)} games")

# ============================================================================
# STEP 2: Merge datasets
# ============================================================================
print("\n[STEP 2] Merging datasets...")

# Rename target columns
rushing_df = rushing_df.rename(columns={'yards': 'rushing_yards'})
passing_df = passing_df.rename(columns={'yards': 'passing_yards'})

# Merge on game identifiers
combined_df = rushing_df.merge(
    passing_df,
    on=['year', 'week', 'seasonType', 'teamID', 'opponentID'],
    how='inner',
    suffixes=('_rush', '_pass')
)

print(f"  ✓ Merged dataset: {len(combined_df)} games")

# Create total yards target
combined_df['total_yards'] = combined_df['rushing_yards'] + combined_df['passing_yards']

print(f"  ✓ Created total_yards target")
print(f"    Mean total yards: {combined_df['total_yards'].mean():.1f}")
print(f"    Mean rushing: {combined_df['rushing_yards'].mean():.1f}")
print(f"    Mean passing: {combined_df['passing_yards'].mean():.1f}")

# ============================================================================
# STEP 3: Feature engineering - add offensive balance metrics
# ============================================================================
print("\n[STEP 3] Adding offensive balance features...")

# Historical pass/rush ratios
combined_df['pass_rush_ratio_season'] = combined_df.groupby(['teamID', 'year']).apply(
    lambda g: (g['passing_yards'].shift(1).expanding().mean() / 
               g['rushing_yards'].shift(1).expanding().mean()).fillna(1)
).reset_index(level=[0, 1], drop=True)

combined_df['pass_rush_ratio_last3'] = combined_df.groupby(['teamID', 'year']).apply(
    lambda g: (g['passing_yards'].shift(1).rolling(3, min_periods=1).mean() / 
               g['rushing_yards'].shift(1).rolling(3, min_periods=1).mean()).fillna(1)
).reset_index(level=[0, 1], drop=True)

# Total attempts as balance indicator (attempts_rush from rushing, attempts_pass from passing)
if 'attempts_rush' in combined_df.columns and 'attempts_pass' in combined_df.columns:
    combined_df['total_attempts'] = combined_df['attempts_rush'] + combined_df['attempts_pass']
    combined_df['pass_attempt_rate'] = combined_df['attempts_pass'] / combined_df['total_attempts']

print(f"  ✓ Created offensive balance features")

# ============================================================================
# STEP 4: Define features for combined model
# ============================================================================
print("\n[STEP 4] Defining feature set...")

# Exclude identifiers and targets
exclude_cols = [
    'year', 'week', 'seasonType', 'teamID', 'opponentID',
    'rushing_yards', 'passing_yards', 'total_yards'
]

# Remove duplicate columns (those with _rush and _pass suffixes that are identical)
# Keep both offensive and defensive features from both datasets
feature_cols = [col for col in combined_df.columns if col not in exclude_cols]

# Remove any NaN columns
feature_cols = [col for col in feature_cols if combined_df[col].notna().sum() > 0]

print(f"  ✓ Using {len(feature_cols)} features")
print(f"    From rushing dataset features: ~{len([c for c in feature_cols if '_rush' in c])}")
print(f"    From passing dataset features: ~{len([c for c in feature_cols if '_pass' in c])}")
print(f"    Shared/balance features: ~{len([c for c in feature_cols if '_rush' not in c and '_pass' not in c])}")

# ============================================================================
# STEP 5: Train/test split
# ============================================================================
print("\n[STEP 5] Splitting train/test by year...")

train_df = combined_df[combined_df['year'] == 2024].copy()
test_df = combined_df[combined_df['year'] == 2025].copy()

print(f"  Training (2024): {len(train_df)} games")
print(f"  Testing (2025):  {len(test_df)} games")

X_train = train_df[feature_cols].fillna(train_df[feature_cols].mean())
y_train = train_df['total_yards']
X_test = test_df[feature_cols].fillna(train_df[feature_cols].mean())
y_test = test_df['total_yards']

y_train_rush = train_df['rushing_yards']
y_train_pass = train_df['passing_yards']
y_test_rush = test_df['rushing_yards']
y_test_pass = test_df['passing_yards']

# ============================================================================
# STEP 6: Train models
# ============================================================================
print("\n[STEP 6] Training models...")

models = {
    'Linear Regression': LinearRegression(),
    'Ridge (alpha=1.0)': Ridge(alpha=1.0),
    'Ridge (alpha=5.0)': Ridge(alpha=5.0),
}

results = {}

for model_name, model in models.items():
    print(f"\n  Training {model_name}...")
    
    model.fit(X_train, y_train)
    
    # Predictions
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)
    
    # Metrics
    train_mae = mean_absolute_error(y_train, train_pred)
    train_r2 = r2_score(y_train, train_pred)
    
    test_mae = mean_absolute_error(y_test, test_pred)
    test_r2 = r2_score(y_test, test_pred)
    
    results[model_name] = {
        'train_mae': train_mae,
        'train_r2': train_r2,
        'test_mae': test_mae,
        'test_r2': test_r2,
        'predictions': test_pred,
        'model': model
    }
    
    print(f"    2024 (Train): MAE = {train_mae:.1f} yards | R² = {train_r2:.3f}")
    print(f"    2025 (Test):  MAE = {test_mae:.1f} yards | R² = {test_r2:.3f}")

# ============================================================================
# STEP 7: Compare to individual model predictions
# ============================================================================
print("\n[STEP 7] Comparing to individual model predictions...")

# Load individual predictions
rushing_preds_df = pd.read_sql_query("""
    SELECT * FROM Rushing_Predictions_2025_CrossSeason
    LIMIT 5
""", conn)

print(f"  Rushing predictions columns: {rushing_preds_df.columns.tolist()}")

passing_preds_df = pd.read_sql_query("""
    SELECT * FROM Passing_Predictions_2025_V2
    LIMIT 5
""", conn)

print(f"  Passing predictions columns: {passing_preds_df.columns.tolist()}")

# Now load full data with correct columns
rushing_preds_df = pd.read_sql_query("""
    SELECT * FROM Rushing_Predictions_2025_CrossSeason
""", conn)

passing_preds_df = pd.read_sql_query("""
    SELECT * FROM Passing_Predictions_2025_V2
""", conn)

# Rename columns if needed
if 'predicted_yards' in rushing_preds_df.columns:
    rushing_preds_df = rushing_preds_df.rename(columns={'predicted_yards': 'predicted_rushing'})
if 'predicted_yards' in passing_preds_df.columns:
    passing_preds_df = passing_preds_df.rename(columns={'predicted_yards': 'predicted_passing'})

# Determine merge keys from available columns
merge_keys = [col for col in ['year', 'week', 'seasonType', 'teamID'] if col in rushing_preds_df.columns]

if len(merge_keys) < 3:
    print("\n  ⚠ Warning: Predictions tables may not have standard columns")
    print(f"    Available merge keys: {merge_keys}")
    # Try to merge by index or use a simpler approach
    if len(rushing_preds_df) == len(test_df) and len(passing_preds_df) == len(test_df):
        print("    Using index-based merge (same length)")
        test_with_individual = test_df.copy()
        test_with_individual['predicted_rushing'] = rushing_preds_df['predicted_rushing'].values
        test_with_individual['predicted_passing'] = passing_preds_df['predicted_passing'].values
    else:
        print("    Skipping individual model comparison")
        test_with_individual = test_df.copy()
        test_with_individual['predicted_rushing'] = np.nan
        test_with_individual['predicted_passing'] = np.nan
else:
    # Merge individual predictions
    test_with_individual = test_df.merge(
        rushing_preds_df[merge_keys + ['predicted_rushing']],
        on=merge_keys,
        how='left'
    ).merge(
        passing_preds_df[merge_keys + ['predicted_passing']],
        on=merge_keys,
        how='left'
    )

# Calculate sum of individual predictions
test_with_individual['sum_individual'] = (
    test_with_individual['predicted_rushing'] + 
    test_with_individual['predicted_passing']
)

# Compare approaches only if we have valid individual predictions
if test_with_individual['sum_individual'].notna().sum() > 0:
    valid_mask = test_with_individual['sum_individual'].notna()
    
    best_combined_model = min(results.keys(), key=lambda k: results[k]['test_mae'])
    combined_pred = results[best_combined_model]['predictions']
    
    individual_sum_mae = mean_absolute_error(
        y_test[valid_mask], 
        test_with_individual.loc[valid_mask, 'sum_individual']
    )
    
    print("\n  " + "=" * 70)
    print("  APPROACH COMPARISON")
    print("  " + "=" * 70)
    print(f"  Approach 1 (Sum Individual Models):  MAE = {individual_sum_mae:.1f} yards")
    print(f"  Approach 2 (Combined Model):         MAE = {results[best_combined_model]['test_mae']:.1f} yards")
    print("  " + "=" * 70)
    
    if results[best_combined_model]['test_mae'] < individual_sum_mae:
        improvement = ((individual_sum_mae - results[best_combined_model]['test_mae']) / individual_sum_mae) * 100
        print(f"  ✓ Combined model is {improvement:.1f}% better!")
    else:
        diff = individual_sum_mae - results[best_combined_model]['test_mae']
        print(f"  Individual sum approach is {abs(diff):.1f} yards {'better' if diff > 0 else 'worse'}")
else:
    print("\n  ⚠ Could not compare to individual models (predictions not available)")
    best_combined_model = min(results.keys(), key=lambda k: results[k]['test_mae'])

# ============================================================================
# STEP 8: Error analysis
# ============================================================================
print("\n[STEP 8] Error Analysis (Combined Model)...")

best_pred = results[best_combined_model]['predictions']
errors = np.abs(y_test - best_pred)

error_ranges = [
    (0, 50, "±0-50 yards"),
    (50, 100, "±50-100 yards"),
    (100, 150, "±100-150 yards"),
    (150, 200, "±150-200 yards"),
    (200, 250, "±200-250 yards"),
    (250, np.inf, "±250+ yards")
]

print(f"\n  {'Error Range':<20} | {'Games':<6} | {'% of Total':<12} | {'Avg Error'}")
print("  " + "-" * 60)

for low, high, label in error_ranges:
    mask = (errors >= low) & (errors < high)
    count = mask.sum()
    pct = (count / len(errors)) * 100
    avg_error = errors[mask].mean() if count > 0 else 0
    print(f"  {label:<20} | {count:<6} | {pct:>6.1f}%   | {avg_error:>8.1f}")

print(f"\n  Cumulative Accuracy (2025):")
for threshold in [75, 100, 150, 200, 250]:
    within = (errors <= threshold).sum()
    pct = (within / len(errors)) * 100
    print(f"    Within ± {threshold:3d} yards: {within:4d} games ({pct:5.1f}%)")

# ============================================================================
# STEP 9: Baseline comparisons
# ============================================================================
print("\n[STEP 9] Baseline Comparisons...")

test_df['team_total_season_avg'] = test_df.groupby('teamID')['total_yards'].transform('mean')
baseline_mae = mean_absolute_error(y_test, test_df['team_total_season_avg'])

print(f"  Baseline (Team's Season Avg):  MAE = {baseline_mae:.1f} yards")
print(f"  Combined Model:                 MAE = {results[best_combined_model]['test_mae']:.1f} yards")
improvement = ((baseline_mae - results[best_combined_model]['test_mae']) / baseline_mae) * 100
print(f"  ✓ Improvement over baseline: {improvement:.1f}%")

# ============================================================================
# STEP 10: Feature importance
# ============================================================================
print("\n[STEP 10] Top 15 Features (Linear Regression):")

lr_model = models['Linear Regression']
feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'coefficient': np.abs(lr_model.coef_)
}).sort_values('coefficient', ascending=False)

for i, row in feature_importance.head(15).iterrows():
    print(f"  {row['feature']:<50} {row['coefficient']:>10.4f}")

# ============================================================================
# STEP 11: Save results
# ============================================================================
print("\n[STEP 11] Saving predictions...")

test_df['predicted_total_yards'] = best_pred
test_df['prediction_error'] = y_test - best_pred
test_df['abs_error'] = np.abs(test_df['prediction_error'])

# Also save with individual predictions for comparison (if available)
if 'predicted_rushing' in test_with_individual.columns:
    test_df['predicted_rushing_individual'] = test_with_individual['predicted_rushing']
    test_df['predicted_passing_individual'] = test_with_individual['predicted_passing']
    test_df['sum_individual_predictions'] = test_with_individual['sum_individual']
    
    save_cols = [
        'year', 'week', 'seasonType', 'teamID', 'opponentID',
        'rushing_yards', 'passing_yards', 'total_yards',
        'predicted_total_yards', 'prediction_error', 'abs_error',
        'predicted_rushing_individual', 'predicted_passing_individual',
        'sum_individual_predictions'
    ]
else:
    save_cols = [
        'year', 'week', 'seasonType', 'teamID', 'opponentID',
        'rushing_yards', 'passing_yards', 'total_yards',
        'predicted_total_yards', 'prediction_error', 'abs_error'
    ]

test_df[save_cols].to_sql('TotalOffense_Predictions_2025', conn, if_exists='replace', index=False)

print(f"  ✓ Saved to TotalOffense_Predictions_2025 table")

conn.close()

print("\n" + "=" * 80)
print("✓ COMBINED MODEL COMPLETE")
print("=" * 80)
print(f"\nBest Combined Model: {best_combined_model}")
print(f"Total Yards MAE: {results[best_combined_model]['test_mae']:.1f} yards")
print(f"R²: {results[best_combined_model]['test_r2']:.3f}")
print(f"Average error: {(results[best_combined_model]['test_mae'] / combined_df['total_yards'].mean()) * 100:.1f}% of mean")