#!/usr/bin/env python3
import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error
from pathlib import Path
import os
from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore")

load_dotenv()
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
YEAR = int(os.getenv("YEAR", 2025))
ROLLING_WINDOW = 3

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=== LOADING DATA FOR OVER/UNDER ===")
stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(YEAR,))
games = pd.read_sql_query("""
    SELECT id, homeId, awayId, homePoints, awayPoints, week, completed, draftKingsOverUnder
    FROM Teams_Games WHERE season = ?
""", conn, params=(YEAR,))

stats["game_id"] = stats["game_id"].astype(int)
games["id"] = games["id"].astype(int)

# Clean non-numeric
for col in stats.select_dtypes(include=["object"]):
    if col not in ["homeAway"]:
        stats[col] = pd.to_numeric(stats[col], errors="coerce")

# === TEAM ID MAP ===
team_id_map = {}
for _, row in stats.iterrows():
    gid = row["game_id"]
    game_row = games[games["id"] == gid]
    if game_row.empty: continue
    if row["homeAway"] == "home":
        team_id_map[game_row.iloc[0]["homeId"]] = row["team_id"]
    else:
        team_id_map[game_row.iloc[0]["awayId"]] = row["team_id"]

# Totals
games["total_points"] = games["homePoints"] + games["awayPoints"]
games["ou_line"] = pd.to_numeric(games["draftKingsOverUnder"], errors="coerce")

# === FEATURES ===
base_feats = [c for c in stats.columns if not c.startswith("cumulative_") and c not in ["game_id", "season", "week", "team_id", "homeAway"]]
per_game_feats = []
for c in base_feats:
    sample = stats[c].dropna()
    if len(sample) == 0: continue
    try:
        float(sample.iloc[0])
        per_game_feats.append(c)
    except:
        pass

# === TABLE ===
cursor.execute("DROP TABLE IF EXISTS Teams_Games_Totals_Predictions")
cursor.execute("""
CREATE TABLE Teams_Games_Totals_Predictions (
    game_id INTEGER PRIMARY KEY,
    home_team_id INTEGER,
    away_team_id INTEGER,
    predicted_total REAL,
    ou_line REAL,
    actual_total REAL,
    over_prob REAL
)
""")

all_predictions = []
weekly_results = []

for target_week in range(3, 14):
    print(f"\n=== PREDICTING WEEK {target_week} TOTAL POINTS ===")

    # TRAIN ONLY ON PAST COMPLETED GAMES
    train_games = games[(games["week"] < target_week) & (games["completed"] == 1)]
    if train_games.empty:
        print("  No training games")
        continue

    train_game_ids = train_games["id"].tolist()
    train_stats = stats[stats["game_id"].isin(train_game_ids)].copy()

    season_avg = train_stats.groupby("team_id")[per_game_feats].mean().astype(float)

    rolling_stats = {}
    for team in train_stats["team_id"].unique():
        team_data = train_stats[train_stats["team_id"] == team][["week"] + per_game_feats].set_index("week")
        team_data = team_data.astype(float)
        rolling = team_data.rolling(ROLLING_WINDOW, min_periods=1).mean()
        rolling_stats[team] = rolling

    home = train_stats[train_stats["homeAway"] == "home"].copy()
    away = train_stats[train_stats["homeAway"] == "away"].copy()
    hist = home.merge(away, on="game_id", suffixes=("_h", "_a"))
    hist = hist.merge(games[["id", "week", "total_points", "ou_line"]], left_on="game_id", right_on="id")
    hist = hist[hist["total_points"].notna()]
    if hist.empty:
        print("  No completed matchups")
        continue

    def get_team_avg(team_id, week):
        if team_id not in rolling_stats:
            return season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({f: np.nan for f in per_game_feats})
        df = rolling_stats[team_id]
        prior = df.index[df.index < week]
        if len(prior) == 0:
            return season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({f: np.nan for f in per_game_feats})
        return df.loc[prior.max()]

    # SUM FEATURES
    X_list = []
    for col in per_game_feats:
        h_vals = hist.apply(lambda r: get_team_avg(r["team_id_h"], r["week"]).get(col, np.nan), axis=1)
        a_vals = hist.apply(lambda r: get_team_avg(r["team_id_a"], r["week"]).get(col, np.nan), axis=1)
        total = h_vals + a_vals
        if total.notna().sum() > 0:
            X_list.append(total.rename(col))

    if not X_list:
        continue

    X = pd.concat(X_list, axis=1)
    X["ou_line"] = hist["ou_line"]
    X = X.apply(pd.to_numeric, errors='coerce').astype(float)
    y = hist["total_points"]

    imputer = SimpleImputer(strategy="mean")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(imputer.fit_transform(X))

    model = XGBRegressor(n_estimators=300, max_depth=5, learning_rate=0.05, random_state=42)
    model.fit(X_scaled, y)

    # === PREDICT TARGET WEEK ===
    week_games = games[games["week"] == target_week]
    week_stats = stats[stats["game_id"].isin(week_games["id"])]
    is_future = week_stats.empty

    if is_future:
        print("  → Future week: predictions only")
        week_pairs = week_games[["id", "homeId", "awayId", "ou_line"]].copy()
        week_pairs.rename(columns={"id": "game_id", "homeId": "home_team_id", "awayId": "away_team_id"}, inplace=True)
        week_pairs["team_id_h"] = week_pairs["home_team_id"].map(team_id_map)
        week_pairs["team_id_a"] = week_pairs["away_team_id"].map(team_id_map)
    else:
        print("  → Completed week: full evaluation")
        home_w = week_stats[week_stats["homeAway"] == "home"]
        away_w = week_stats[week_stats["homeAway"] == "away"]
        week_pairs = home_w.merge(away_w, on="game_id", suffixes=("_h", "_a"))
        week_pairs = week_pairs.merge(games[["id", "ou_line", "total_points"]], left_on="game_id", right_on="id", how="left")

    week_correct = week_total = 0
    actuals = []
    preds = []

    for _, row in week_pairs.iterrows():
        h_id = row["team_id_h"] if "team_id_h" in row else row["home_team_id"]
        a_id = row["team_id_a"] if "team_id_a" in row else row["away_team_id"]
        h_avg = get_team_avg(h_id, target_week)
        a_avg = get_team_avg(a_id, target_week)

        feat_row = []
        for col in per_game_feats:
            h_val = h_avg.get(col, np.nan)
            a_val = a_avg.get(col, np.nan)
            try:
                h_s = h_val.item() if hasattr(h_val, 'item') else float(h_val)
                a_s = a_val.item() if hasattr(a_val, 'item') else float(a_val)
            except:
                h_s = a_s = np.nan
            val = h_s + a_s if pd.notna(h_s) and pd.notna(a_s) else np.nan
            feat_row.append(val)
        feat_row.append(row["ou_line"] if pd.notna(row["ou_line"]) else 55.0)

        X_pred = np.array(feat_row, dtype=np.float64).reshape(1, -1)
        X_pred = imputer.transform(X_pred)
        X_pred = scaler.transform(X_pred)
        pred_total = float(model.predict(X_pred)[0])

        # FIXED: Correct direction — higher predicted total = higher over probability
        over_prob = 1 / (1 + np.exp(-((pred_total - (row["ou_line"] or 55)) / 8)))

        actual_total = row.get("total_points")

        all_predictions.append((
            int(row["game_id"]), int(h_id), int(a_id),
            round(pred_total, 2),
            float(row["ou_line"]) if pd.notna(row["ou_line"]) else None,
            float(actual_total) if pd.notna(actual_total) else None,
            round(over_prob, 4)
        ))

        if pd.notna(actual_total):
            actuals.append(actual_total)
            preds.append(pred_total)
            line = row["ou_line"] if pd.notna(row["ou_line"]) else 55
            if (pred_total > line) == (actual_total > line):
                week_correct += 1
            week_total += 1

    if actuals:
        mae = mean_absolute_error(actuals, preds)
        ou_acc = week_correct / week_total if week_total > 0 else 0
        print(f"  Games: {week_total} | MAE: {mae:.2f} | O/U Acc: {ou_acc:.1%}")
        weekly_results.append({"week": target_week, "games": week_total, "mae": mae, "ou_acc": ou_acc})
    else:
        print(f"  → {len(week_pairs)} future games predicted")

# Save
cursor.executemany("INSERT OR REPLACE INTO Teams_Games_Totals_Predictions VALUES (?,?,?,?,?,?,?)", all_predictions)
conn.commit()
conn.close()

print("\n" + "="*70)
print("WEEKLY TOTAL POINTS RESULTS")
print("="*70)
for r in weekly_results:
    print(f"Week {r['week']:2d}: {r['games']:3d} games | MAE: {r['mae']:.2f} | O/U Acc: {r['ou_acc']:.1%}")

if weekly_results:
    total_games = sum(r["games"] for r in weekly_results)
    overall_mae = np.average([r["mae"] for r in weekly_results], weights=[r["games"] for r in weekly_results])
    overall_ou = np.average([r["ou_acc"] for r in weekly_results], weights=[r["games"] for r in weekly_results])
    print(f"\nOVERALL: {total_games} games | MAE: {overall_mae:.2f} | O/U Accuracy: {overall_ou:.1%}")
else:
    print("\nNo completed weeks to evaluate.")