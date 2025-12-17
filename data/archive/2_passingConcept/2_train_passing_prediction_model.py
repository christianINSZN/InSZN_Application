import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("=" * 80)
print("PASSING YARDS PREDICTION MODEL - V2 TRAINING (CLEAN, NO LEAKAGE)")
print("=" * 80)

# ============================================================================
# STEP 1: Load dataset
# ============================================================================
print("\n[STEP 1] Loading prediction dataset...")

df = pd.read_sql_query("""
    SELECT * FROM Passing_Prediction_Dataset_V2
""", conn)

print(f"  ✓ Loaded {len(df)} games")
print(f"  ✓ Features: {len(df.columns)}")

# ============================================================================
# STEP 2: Define features
# ============================================================================
print("\n[STEP 2] Defining features...")

# Exclude non-feature columns
exclude_cols = ['year', 'week', 'seasonType', 'teamID', 'opponentID', 'yards']

# CRITICAL: Exclude same-game statistics (data leakage)
same_game_stats = [
    'completions',      # Derived from yards
    'touchdowns',       # Derived from yards  
    'interceptions',    # Same game stat
    'yprr',             # Calculated from yards we're predicting
    'grades_receiving', # Includes current game performance
    'grades_pass',      # Current game grade
    'qb_rating',        # Calculated from current game
    'caught_percent',   # Current game stat
    'drop_rate',        # Current game stat
    'receptions',       # Current game stat
    'targets',          # Current game stat
    'yards_after_catch', # Current game stat
    'sacks_allowed',    # Current game stat
    'hurries_allowed',  # Current game stat
    'hits_allowed',     # Current game stat
    'pressure_rate',    # Calculated from current game
    'opp_sacks',        # Opponent current game
    'opp_hurries',      # Opponent current game
    'opp_hits',         # Opponent current game
    'opp_interceptions', # Opponent current game
    'opp_pass_break_ups' # Opponent current game
]

exclude_cols.extend(same_game_stats)

# Get all feature columns
feature_cols = [col for col in df.columns if col not in exclude_cols]

# Remove any remaining NaN columns
feature_cols = [col for col in feature_cols if df[col].notna().sum() > 0]

print(f"  ✓ Using {len(feature_cols)} features (removed {len(same_game_stats)} same-game stats)")
print(f"  ✓ Target: yards (passing)")
print(f"  ✓ IMPORTANT: Only using historical averages and pre-game context")

# ============================================================================
# STEP 3: Train/test split by year
# ============================================================================
print("\n[STEP 3] Splitting train/test by year...")

train_df = df[df['year'] == 2024].copy()
test_df = df[df['year'] == 2025].copy()

print(f"  Training (2024): {len(train_df)} games")
print(f"  Testing (2025):  {len(test_df)} games")

# Prepare X and y
X_train = train_df[feature_cols]
y_train = train_df['yards']
X_test = test_df[feature_cols]
y_test = test_df['yards']

# Clean any remaining NaNs
X_train = X_train.fillna(X_train.mean())
X_test = X_test.fillna(X_train.mean())  # Use train mean for test

print(f"\n  After cleaning:")
print(f"    Training:  {len(X_train)} games")
print(f"    Testing:   {len(X_test)} games")

# ============================================================================
# STEP 4: Train models
# ============================================================================
print("\n[STEP 4] Training models...")

models = {
    'Linear Regression': LinearRegression(),
    'Ridge (alpha=1.0)': Ridge(alpha=1.0),
    'Ridge (alpha=5.0)': Ridge(alpha=5.0),
    'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
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
        'predictions': test_pred
    }
    
    print(f"    2024 (Train): MAE = {train_mae:.1f} yards | R² = {train_r2:.3f}")
    print(f"    2025 (Test):  MAE = {test_mae:.1f} yards | R² = {test_r2:.3f}")

# ============================================================================
# STEP 5: Model comparison
# ============================================================================
print("\n" + "=" * 90)
print("  MODEL COMPARISON SUMMARY")
print("=" * 90)
print(f"  {'Model':<25} | {'2024 MAE':>10} | {'2025 MAE':>10} | {'Gap':>8} | {'2025 R²':>10}")
print("  " + "-" * 88)

sorted_models = sorted(results.items(), key=lambda x: x[1]['test_mae'])
for model_name, metrics in sorted_models:
    gap = metrics['test_mae'] - metrics['train_mae']
    print(f"  {model_name:<25} | {metrics['train_mae']:>10.1f} | {metrics['test_mae']:>10.1f} | "
          f"{gap:>+8.1f} | {metrics['test_r2']:>10.3f}")

print("=" * 90)

best_model_name = min(results.keys(), key=lambda k: results[k]['test_mae'])
best_gen_model = min(results.keys(), key=lambda k: abs(results[k]['test_mae'] - results[k]['train_mae']))
best_gen_gap = abs(results[best_gen_model]['test_mae'] - results[best_gen_model]['train_mae'])

print(f"\n  Best Performance: {best_model_name} (MAE: {results[best_model_name]['test_mae']:.1f} yards)")
print(f"  Best Generalization: {best_gen_model} (Gap: {best_gen_gap:.1f} yards)")

# ============================================================================
# STEP 6: Baseline comparisons
# ============================================================================
print("\n[STEP 6] Baseline Comparisons (2025 predictions):")

# Baseline 1: Team's season average
test_df['team_season_avg'] = test_df.groupby('teamID')['yards'].transform('mean')
baseline1_mae = mean_absolute_error(y_test, test_df['team_season_avg'])

# Baseline 2: Team's last 3 game average (if available)
test_df['team_last3_avg'] = test_df.groupby('teamID')['yards'].transform(
    lambda x: x.shift(1).rolling(window=3, min_periods=1).mean()
)
baseline2_mae = mean_absolute_error(y_test[test_df['team_last3_avg'].notna()], 
                                     test_df['team_last3_avg'][test_df['team_last3_avg'].notna()])

print(f"  Baseline 1 (Team's Season Avg):    MAE = {baseline1_mae:.1f} yards")
print(f"  Baseline 2 (Team's Last 3 Avg):    MAE = {baseline2_mae:.1f} yards")
print(f"  Our Model ({best_model_name}):  MAE = {results[best_model_name]['test_mae']:.1f} yards")

improvement = ((baseline1_mae - results[best_model_name]['test_mae']) / baseline1_mae) * 100
print(f"  ✓ Improvement over baseline: {improvement:.1f}%")

# ============================================================================
# STEP 7: Error distribution
# ============================================================================
print("\n[STEP 7] 2025 Prediction Error Distribution:")

best_pred = results[best_model_name]['predictions']
errors = np.abs(y_test - best_pred)

error_ranges = [
    (0, 30, "±0-30 yards"),
    (30, 60, "±30-60 yards"),
    (60, 90, "±60-90 yards"),
    (90, 120, "±90-120 yards"),
    (120, 150, "±120-150 yards"),
    (150, 200, "±150-200 yards"),
    (200, np.inf, "±200+ yards")
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
for threshold in [40, 75, 100, 150, 200]:
    within = (errors <= threshold).sum()
    pct = (within / len(errors)) * 100
    print(f"    Within ± {threshold:3d} yards: {within:4d} games ({pct:5.1f}%)")

# ============================================================================
# STEP 8: Feature importance (for Linear Regression)
# ============================================================================
print("\n[STEP 8] Top 15 Most Important Features (Linear Regression):")

lr_model = models['Linear Regression']
feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'coefficient': np.abs(lr_model.coef_)
}).sort_values('coefficient', ascending=False)

for i, row in feature_importance.head(15).iterrows():
    print(f"  {row['feature']:<40} {row['coefficient']:>10.4f}")

# ============================================================================
# STEP 9: Save predictions
# ============================================================================
print("\n[STEP 9] Saving predictions...")

# Save best model predictions
test_df['predicted_yards'] = best_pred
test_df['prediction_error'] = y_test - best_pred
test_df['abs_error'] = np.abs(test_df['prediction_error'])

predictions_df = test_df[['year', 'week', 'seasonType', 'teamID', 'opponentID', 
                           'yards', 'predicted_yards', 'prediction_error', 'abs_error']]

predictions_df.to_sql('Passing_Predictions_2025_V2', conn, if_exists='replace', index=False)

print(f"  ✓ Saved to Passing_Predictions_2025_V2 table")

conn.close()

print("\n" + "=" * 80)
print("✓ TRAINING COMPLETE")
print("=" * 80)
print(f"\nBest Model: {best_model_name}")
print(f"2025 MAE: {results[best_model_name]['test_mae']:.1f} yards")
print(f"2025 R²: {results[best_model_name]['test_r2']:.3f}")
print(f"Generalization Gap: {results[best_model_name]['test_mae'] - results[best_model_name]['train_mae']:.1f} yards")