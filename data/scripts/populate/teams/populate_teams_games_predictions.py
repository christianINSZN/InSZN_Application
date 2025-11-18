#!/usr/bin/env python3
import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import log_loss, brier_score_loss
from pathlib import Path
import os
from dotenv import load_dotenv
import warnings

load_dotenv()

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
YEAR = int(os.getenv("YEAR", 2025))
HOME_ADV = 2.5
TOP_FEATURES = 20
ROLLING_WINDOW = 3

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=== LOADING DATA ===")

stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(YEAR,))
games = pd.read_sql_query(
    "SELECT id, homeId, awayId, homePoints, awayPoints, week, completed, draftKingsSpread, draftKingsHomeMoneyline, draftKingsAwayMoneyline FROM Teams_Games WHERE season = ?",
    conn, params=(YEAR,)
)

stats["game_id"] = stats["game_id"].astype(int)
games["id"] = games["id"].astype(int)
games["homeId"] = games["homeId"].astype(int)
games["awayId"] = games["awayId"].astype(int)

# Clean non-numeric
object_cols = stats.select_dtypes(include=["object"]).columns
for col in object_cols:
    if col not in ["homeAway"]:
        stats[col] = pd.to_numeric(stats[col], errors="coerce")

# === TEAM ID MAP ===
team_id_map = {}
for _, row in stats.iterrows():
    gid = row["game_id"]
    team_id = row["team_id"]
    game_row = games[games["id"] == gid]
    if game_row.empty: 
        continue
    if row["homeAway"] == "home":
        team_id_map[game_row.iloc[0]["homeId"]] = team_id
    else:
        team_id_map[game_row.iloc[0]["awayId"]] = team_id

# === SPREAD & VEGAS IMPLIED PROB ===
games["home_spread"] = games["draftKingsSpread"].astype(str).str.replace('+', '', regex=False).str.strip()
games["home_spread"] = pd.to_numeric(games["home_spread"], errors='coerce')
games["home_spread"] = np.clip(games["home_spread"], -30, 30)

# Convert moneyline → true implied win probability
def moneyline_to_prob(ml):
    if pd.isna(ml) or ml == 0:
        return np.nan
    ml = float(ml)
    if ml > 0:
        return 100 / (ml + 100)
    else:
        return abs(ml) / (abs(ml) + 100)

games["vegas_home_win_prob"] = games["draftKingsHomeMoneyline"].apply(moneyline_to_prob)

# === FEATURES ===
base_feats = [c for c in stats.columns if not c.startswith("cumulative_") and c not in ["game_id", "season", "week", "team_id", "homeAway"]]
per_game_feats = []
for c in base_feats:
    sample = stats[c].dropna()
    if len(sample) == 0: 
        continue
    try:
        float(sample.iloc[0])
        per_game_feats.append(c)
    except:
        pass

# === PREDICTION TABLE ===
cursor.execute("DROP TABLE IF EXISTS Teams_Games_Predictions")
cursor.execute("""
CREATE TABLE Teams_Games_Predictions (
    game_id INTEGER, 
    home_team_id INTEGER, 
    away_team_id INTEGER,
    home_win_prob REAL, 
    predicted_winner TEXT, 
    actual_winner TEXT, 
    correct INTEGER,
    home_spread REAL,
    vegas_home_win_prob REAL,
    PRIMARY KEY (game_id)
)
""")

all_predictions = []
weekly_results = []

# === ELO (pre-game) ===
elo_by_week = {}
K = 32
current_elo = {}
for week in sorted(games["week"].unique()):
    week_games = games[(games["week"] == week)]
    points_lookup = stats.set_index(["game_id", "team_id"])["points"].to_dict()
    snapshot = current_elo.copy()
    for _, g in week_games.iterrows():
        gid, h_id, a_id = g["id"], g["homeId"], g["awayId"]
        h_team = team_id_map.get(h_id)
        a_team = team_id_map.get(a_id)
        if not h_team or not a_team: 
            continue
        h_elo = current_elo.get(h_team, 1500)
        a_elo = current_elo.get(a_team, 1500)
        h_pts = points_lookup.get((gid, h_team), 0)
        a_pts = points_lookup.get((gid, a_team), 0)
        exp_h = 1 / (1 + 10**((a_elo - h_elo - HOME_ADV) / 400))
        res_h = 1 if h_pts > a_pts else 0 if h_pts < a_pts else 0.5
        upd = K * (res_h - exp_h)
        current_elo[h_team] = h_elo + upd
        current_elo[a_team] = a_elo - upd
    elo_by_week[week] = snapshot

# === TRAIN & PREDICT (PER TARGET WEEK) ===
for target_week in range(3, 14):
    print(f"\n=== PREDICTING WEEK {target_week} ===")
    
    train_games = games[(games["week"] < target_week) & (games["completed"] == 1)]
    if train_games.empty:
        print(" No training games")
        continue
        
    train_game_ids = train_games["id"].tolist()
    train_stats = stats[stats["game_id"].isin(train_game_ids)].copy()
    if train_stats.empty:
        continue

    train_stats_sorted = train_stats.sort_values(["team_id", "week"])
    rolling_stats = {}
    season_avg = train_stats.groupby("team_id")[per_game_feats].mean().astype(float)
    for team in train_stats["team_id"].unique():
        team_data = train_stats_sorted[train_stats_sorted["team_id"] == team][["week"] + per_game_feats].set_index("week")
        team_data = team_data.astype(float)
        rolling = team_data.rolling(window=ROLLING_WINDOW, min_periods=1).mean()
        rolling_stats[team] = rolling

    home = train_stats[train_stats["homeAway"] == "home"].copy()
    away = train_stats[train_stats["homeAway"] == "away"].copy()
    hist = home.merge(away, on="game_id", suffixes=("_h", "_a"))
    hist = hist.merge(games[["id", "week", "home_spread", "vegas_home_win_prob"]], left_on="game_id", right_on="id")
    hist = hist[hist["points_h"].notna() & hist["points_a"].notna()]
    if hist.empty:
        print(" No completed matchups")
        continue

    hist["h_elo"] = hist.apply(lambda r: elo_by_week.get(r["week"], {}).get(r["team_id_h"], 1500), axis=1)
    hist["a_elo"] = hist.apply(lambda r: elo_by_week.get(r["week"], {}).get(r["team_id_a"], 1500), axis=1)
    elo_diff = hist["h_elo"] - hist["a_elo"]

    def get_team_avg(team_id, week):
        if team_id not in rolling_stats:
            return season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({f: np.nan for f in per_game_feats})
        df = rolling_stats[team_id]
        prior = df.index[df.index < week]
        if len(prior) == 0:
            return season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({f: np.nan for f in per_game_feats})
        return df.loc[prior[-1]]

    X_list = []
    for col in per_game_feats:
        h_vals = hist.apply(lambda r: get_team_avg(r["team_id_h"], r["week"]).get(col, np.nan), axis=1)
        a_vals = hist.apply(lambda r: get_team_avg(r["team_id_a"], r["week"]).get(col, np.nan), axis=1)
        diff = h_vals - a_vals
        if diff.notna().sum() > 0:
            X_list.append(diff.rename(col))
    if not X_list:
        print(" No valid features")
        continue

    X = pd.concat(X_list, axis=1)
    X.columns = X.columns.astype(str)
    X = X.apply(pd.to_numeric, errors='coerce')
    if X.shape[1] == 0:
        print(" No numeric features")
        continue

    y = (hist["points_h"] > hist["points_a"]).astype(int)

    # === ADD CRITICAL FEATURES ===
    X_final = X.copy()
    X_final["home_spread"] = hist["home_spread"]
    X_final["vegas_home_win_prob"] = hist["vegas_home_win_prob"]  # ← NEW & POWERFUL
    X_final["home_adv"] = HOME_ADV
    X_final["elo_diff"] = elo_diff
    X_final = X_final.astype(float)

    # === FEATURE SELECTION ===
    imputer_temp = SimpleImputer(strategy="mean")
    X_imp = imputer_temp.fit_transform(X_final)
    scaler_temp = StandardScaler()
    X_scaled = scaler_temp.fit_transform(X_imp)
    model_temp = XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05,
                               subsample=0.7, colsample_bytree=0.7, reg_alpha=2, reg_lambda=2,
                               random_state=42)
    model_temp.fit(X_scaled, y)
    top_idx = np.argsort(model_temp.feature_importances_)[-min(TOP_FEATURES, X_final.shape[1]):]
    selected_cols = X_final.columns[top_idx].tolist()

    # FORCE THESE IN
    selected_cols = list(set(selected_cols + ["home_spread", "vegas_home_win_prob", "home_adv", "elo_diff"]))
    X_final = X_final[selected_cols]

    # === FINAL MODEL ===
    imputer = SimpleImputer(strategy="mean")
    X_imp = imputer.fit_transform(X_final)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)
    model = XGBClassifier(n_estimators=200, max_depth=3, learning_rate=0.05,
                          subsample=0.7, colsample_bytree=0.7, reg_alpha=2, reg_lambda=2,
                          random_state=42)
    model.fit(X_scaled, y)
    calibrated = CalibratedClassifierCV(model, method="isotonic", cv="prefit")  # uses all data, no splits
    calibrated.fit(X_scaled, y)
    
    # === PREDICT TARGET WEEK ===
    week_games = games[games["week"] == target_week]
    week_stats = stats[stats["game_id"].isin(week_games["id"])]
    is_future = week_stats.empty

    if is_future:
        print(" --> Future week: no stats – predictions only")
        week_pairs = week_games[["id", "homeId", "awayId", "home_spread", "vegas_home_win_prob"]].copy()
        week_pairs.rename(columns={"id": "game_id", "homeId": "home_team_id", "awayId": "away_team_id"}, inplace=True)
        week_pairs["team_id_h"] = week_pairs["home_team_id"].map(team_id_map)
        week_pairs["team_id_a"] = week_pairs["away_team_id"].map(team_id_map)
    else:
        print(" --> Completed week: full evaluation")
        home_w = week_stats[week_stats["homeAway"] == "home"]
        away_w = week_stats[week_stats["homeAway"] == "away"]
        week_pairs = home_w.merge(away_w, on="game_id", suffixes=("_h", "_a"))
        week_pairs = week_pairs.merge(games[["id", "home_spread", "vegas_home_win_prob"]], left_on="game_id", right_on="id", how="left")

    week_correct = week_total = 0
    week_probs = []
    week_actual = []

    for _, row in week_pairs.iterrows():
        h_id = row["team_id_h"] if "team_id_h" in row else row["home_team_id"]
        a_id = row["team_id_a"] if "team_id_a" in row else row["away_team_id"]
        h_avg = get_team_avg(h_id, target_week)
        a_avg = get_team_avg(a_id, target_week)
        if h_avg.isna().all().all() or a_avg.isna().all().all():
            continue

        feat_row = []
        for col in selected_cols:
            if col == "home_spread":
                val = row["home_spread"]
            elif col == "vegas_home_win_prob":
                val = row["vegas_home_win_prob"]
            elif col == "home_adv":
                val = HOME_ADV
            elif col == "elo_diff":
                h_elo = elo_by_week.get(target_week - 1, {}).get(h_id, 1500)
                a_elo = elo_by_week.get(target_week - 1, {}).get(a_id, 1500)
                val = h_elo - a_elo
            else:
                h_val = h_avg.get(col, np.nan)
                a_val = a_avg.get(col, np.nan)

                # ← THIS IS THE BULLETPROOF FIX
                try:
                    h_scalar = h_val.item() if hasattr(h_val, 'item') else float(h_val)
                    a_scalar = a_val.item() if hasattr(a_val, 'item') else float(a_val)
                except:
                    h_scalar = a_scalar = np.nan

                if pd.isna(h_scalar) or pd.isna(a_scalar):
                    val = np.nan
                else:
                    val = h_scalar - a_scalar

            feat_row.append(val)

        X_pred = np.array(feat_row, dtype=np.float64).reshape(1, -1)
        X_pred = imputer.transform(X_pred)
        X_pred = scaler.transform(X_pred)
        prob_home = calibrated.predict_proba(X_pred)[0][1]

        # Underdog adjustment
        spread = row["home_spread"]
        if pd.notna(spread):
            if spread > 7:
                prob_home = prob_home ** 1.3
            elif spread < -7:
                prob_home = 1 - (1 - prob_home) ** 1.3
        prob_home = np.clip(prob_home, 0.05, 0.95)

        pred = "home" if prob_home > 0.5 else "away"
        if is_future:
            actual = None
            correct = None
        else:
            actual = ("home" if row["points_h"] > row["points_a"] else "away" if row["points_h"] < row["points_a"] else "tie")
            correct = 1 if pred == actual else 0

        all_predictions.append((
            int(row["game_id"]), int(h_id), int(a_id),
            round(prob_home, 4), pred, actual, correct,
            row["home_spread"] if pd.notna(row["home_spread"]) else None,
            row["vegas_home_win_prob"] if pd.notna(row["vegas_home_win_prob"]) else None
        ))

        if not is_future:
            week_correct += correct
            week_total += 1
            week_probs.append(prob_home)
            week_actual.append(1 if row["points_h"] > row["points_a"] else 0)

    if not is_future:
        win_rate = week_correct / week_total if week_total else 0
        brier = brier_score_loss(week_actual, week_probs) if len(week_probs) > 1 else 0
        logloss = log_loss(week_actual, week_probs) if len(set(week_actual)) > 1 else 0
        weekly_results.append({"week": target_week, "games": week_total,
                               "win_rate": win_rate, "brier": brier, "logloss": logloss})
        print(f" Games: {week_total} | Acc: {win_rate:.1%} | Brier: {brier:.3f} | LogLoss: {logloss:.3f}")
    else:
        print(f" --> {len(week_pairs)} future-game predictions inserted")

# === SAVE ===
cursor.executemany("""
INSERT OR REPLACE INTO Teams_Games_Predictions
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", all_predictions)
conn.commit()
conn.close()

# === SUMMARY ===
print("\n" + "="*70)
print("WEEKLY RESULTS (completed weeks only)")
print("="*70)
for r in weekly_results:
    print(f"Week {r['week']:2d}: {r['games']:3d} games | Acc: {r['win_rate']:.1%} | Brier: {r['brier']:.3f} | LogLoss: {r['logloss']:.3f}")

total = sum(r["games"] for r in weekly_results)
overall_acc = sum(r["win_rate"] * r["games"] for r in weekly_results) / total if total else 0
overall_brier = sum(r["brier"] * r["games"] for r in weekly_results) / total if total else 0
overall_logloss = sum(r["logloss"] * r["games"] for r in weekly_results) / total if total else 0

print(f"\nOVERALL (completed): {total} games | Acc: {overall_acc:.1%} | Brier: {overall_brier:.3f} | LogLoss: {overall_logloss:.3f}")