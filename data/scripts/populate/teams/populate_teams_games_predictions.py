import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
YEAR = int(os.getenv("YEAR", 2025))
WEEK = int(os.getenv("WEEK", 12))
HOME_ADV = 2.5
MAX_SPREAD = 35  # Cap extreme spreads

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Load ALL stats
stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(YEAR,))

# Convert objects to numeric
object_cols = stats.select_dtypes(include=['object']).columns
for col in object_cols:
    if col not in ['homeAway', 'game_id', 'season', 'week', 'team_id']:
        stats[col] = pd.to_numeric(stats[col], errors='coerce')

# Core features
core_off = ['points', 'totalYards', 'ppa_overall_total', 'success_rate_overall_total']
core_def = ['defense_ppa', 'defense_success_rate']

off_feats = []
def_feats = []

for f in core_off:
    if f in stats.columns:
        off_feats.append(f)
        def_feats.append(core_def[core_off.index(f) % len(core_def)])

# Optional
optional_pairs = [
    ('netPassingYards', 'defense_ppa'),
    ('rushingYards', 'defense_ppa'),
    ('offense_ppa', 'defense_ppa'),
    ('offense_success_rate', 'defense_success_rate'),
    ('turnovers', 'interceptions'),
    ('sacks', 'rushingYards'),
    ('thirdDownEff', 'defense_ppa'),
    ('fourthDownEff', 'defense_ppa')
]

for off, deff in optional_pairs:
    if off in stats.columns and deff in stats.columns:
        if pd.api.types.is_numeric_dtype(stats[off]) and pd.api.types.is_numeric_dtype(stats[deff]):
            off_feats.append(off)
            def_feats.append(deff)

print(f"Using {len(off_feats)} offensive and {len(def_feats)} defensive features.")

# Weight recent games
max_week = stats['week'].max()
stats['weight'] = 0.8 ** (max_week - stats['week'])

# Weighted averages
def weighted_avg(group, cols):
    return np.average(group[cols], weights=group['weight'], axis=0)

num_cols = [c for c in stats.select_dtypes(include=np.number).columns 
            if c not in ['game_id', 'season', 'week', 'team_id']]

# Build features — asymmetric
def build_features(df):
    X_list = []
    for i, f in enumerate(off_feats):
        def_f = def_feats[i]
        h_off = f + '_h'
        a_def = def_f + '_a'
        if h_off in df.columns and a_def in df.columns:
            X_list.append(df[h_off] - df[a_def])
    return pd.concat(X_list, axis=1) if X_list else pd.DataFrame()

# === PREDICT ALL COMPLETED WEEKS + FUTURE ===
all_games = pd.read_sql_query("""
    SELECT tg.id, tg.homeId, tg.awayId, tg.completed
    FROM Teams_Games tg
    WHERE tg.season = ? AND tg.week <= ?
""", conn, params=(YEAR, WEEK))

predictions = []

for w in range(1, WEEK + 1):
    print(f"Predicting Week {w}...")
    
    # Train on weeks < w
    train_stats = stats[stats['week'] < w]
    if train_stats.empty:
        continue
    
    hist = train_stats.merge(train_stats, on='game_id', suffixes=('_h', '_a'))
    hist = hist[(hist['homeAway_h'] == 'home') & (hist['homeAway_a'] == 'away')]
    if hist.empty:
        continue
    
    X = build_features(hist)
    if X.empty:
        continue
    
    y_spread = hist['points_h'] - hist['points_a']
    y_total = hist['points_h'] + hist['points_a']
    
    imputer = SimpleImputer(strategy='mean')
    X_imp = imputer.fit_transform(X)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)
    
    model_spread = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, subsample=0.8, random_state=42)
    model_total = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, subsample=0.8, random_state=42)
    model_spread.fit(X_scaled, y_spread)
    model_total.fit(X_scaled, y_total)
    
    # Prior averages
    prior_avg = train_stats.groupby('team_id').apply(
        lambda g: pd.Series(weighted_avg(g, num_cols), index=num_cols)
    ).reset_index()
    
    # Games in week w
    week_games = all_games[all_games['id'].isin(
        stats[stats['week'] == w]['game_id'].unique()
    )]
    
    for _, g in week_games.iterrows():
        h_row = prior_avg[prior_avg['team_id'] == g['homeId']]
        a_row = prior_avg[prior_avg['team_id'] == g['awayId']]
        if h_row.empty or a_row.empty:
            continue
        h, a = h_row.iloc[0], a_row.iloc[0]
        row = []
        for i, f in enumerate(off_feats):
            def_f = def_feats[i]
            row.append(h.get(f, 0) - a.get(def_f, 0))
        row = imputer.transform([row])
        row = scaler.transform(row)
        spread = model_spread.predict(row)[0] + HOME_ADV
        spread = np.clip(spread, -MAX_SPREAD, MAX_SPREAD)  # ← CAP
        total = model_total.predict(row)[0]
        predictions.append((
            int(g['id']), int(g['homeId']), int(g['awayId']),
            round((total + spread)/2, 4), round((total - spread)/2, 4),
            round(-spread, 4), round(total, 4)  # -spread = home favorite
        ))

# Insert all
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Games_Predictions (
    game_id INTEGER PRIMARY KEY,
    home_id INTEGER,
    away_id INTEGER,
    home_score_pred REAL,
    away_score_pred REAL,
    ai_spread REAL,
    ai_over_under REAL
)
""")

insert_query = """
INSERT OR REPLACE INTO Teams_Games_Predictions VALUES (?, ?, ?, ?, ?, ?, ?)
"""
cursor.executemany(insert_query, predictions)
conn.commit()
conn.close()

print(f"Predicted {len(predictions)} games (Weeks 1–{WEEK})")

# === CONVICTION ANALYSIS ===
print("\nAnalyzing AI Conviction vs DraftKings...")

dk_query = """
SELECT 
    tg.id, tg.homeId, tg.awayId,
    tg.homePoints, tg.awayPoints,
    tg.draftKingsSpread,
    tgp.ai_spread
FROM Teams_Games tg
JOIN Teams_Games_Predictions tgp ON tg.id = tgp.game_id
WHERE tg.season = ? AND tg.completed = 1
  AND tg.draftKingsSpread IS NOT NULL
  AND tgp.ai_spread IS NOT NULL
"""
dk_df = pd.read_sql_query(dk_query, sqlite3.connect(DB_FILE), params=(YEAR,))

if dk_df.empty:
    print("No completed games with DK spread and AI prediction.")
else:
    dk_df['dk_spread'] = pd.to_numeric(dk_df['draftKingsSpread'], errors='coerce')
    dk_df = dk_df.dropna(subset=['dk_spread'])
    
    dk_df['actual_margin'] = dk_df['homePoints'] - dk_df['awayPoints']
    dk_df['dk_cover'] = (dk_df['actual_margin'] >= dk_df['dk_spread']).astype(int)
    dk_df['ai_conviction'] = dk_df['ai_spread'] - dk_df['dk_spread']
    
    bearish = dk_df['ai_conviction'] < 0
    bullish = dk_df['ai_conviction'] > 0
    
    dk_df['ai_win'] = 0
    dk_df.loc[bearish & (dk_df['dk_cover'] == 1), 'ai_win'] = 1
    dk_df.loc[bullish & (dk_df['dk_cover'] == 0), 'ai_win'] = 1
    
    total = len(dk_df)
    ai_wins = dk_df['ai_win'].sum()
    win_rate = ai_wins / total if total > 0 else 0
    
    print(f"Games analyzed: {total}")
    print(f"AI conviction wins: {ai_wins} ({win_rate:.1%})")
    
    print("\nTop 10 AI Conviction Wins:")
    wins = dk_df[dk_df['ai_win'] == 1].copy()
    wins['abs_conviction'] = wins['ai_conviction'].abs()
    top = wins.nlargest(10, 'abs_conviction')[
        ['homeId', 'awayId', 'actual_margin', 'dk_spread', 'ai_spread', 'ai_conviction']
    ]
    print(top.to_string(index=False))

# === SAME-DIRECTION FILTER (AI agrees with DK on favorite) ===
print("\nSame-Direction Conviction (AI & DK agree on favorite)")

# AI and DK both negative = home favorite
# Both positive = away favorite
same_dir = dk_df[
    ((dk_df['dk_spread'] < 0) & (dk_df['ai_spread'] < 0)) |
    ((dk_df['dk_spread'] > 0) & (dk_df['ai_spread'] > 0))
]

# Add abs_conviction to same_dir
same_dir = same_dir.copy()
same_dir['abs_conviction'] = same_dir['ai_conviction'].abs()

total_same = len(same_dir)
wins_same = same_dir['ai_win'].sum()
rate_same = wins_same / total_same if total_same > 0 else 0

print(f"Same-direction games: {total_same}")
print(f"AI conviction wins: {wins_same} ({rate_same:.1%})")

# High-conviction same-direction
high_same = same_dir[same_dir['abs_conviction'] >= same_dir['abs_conviction'].quantile(0.8)]
total_high_same = len(high_same)
wins_high_same = high_same['ai_win'].sum()
rate_high_same = wins_high_same / total_high_same if total_high_same > 0 else 0

print(f"\nHigh-conviction same-direction: {total_high_same} games → {wins_high_same} wins ({rate_high_same:.1%})")