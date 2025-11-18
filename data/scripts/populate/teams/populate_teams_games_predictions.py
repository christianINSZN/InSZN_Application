#!/usr/bin/env python3
import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
YEAR = int(os.getenv("YEAR", 2025))
HOME_ADV = 2.5
ROLLING_WINDOW = 3

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=== LOADING DATA ===")

stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(YEAR,))
games = pd.read_sql_query("""
    SELECT id, homeId, awayId, homePoints, awayPoints, week, completed,
           draftKingsSpread, draftKingsHomeMoneyline
    FROM Teams_Games WHERE season = ?
""", conn, params=(YEAR,))

# === ONLY CHANGE: CORRECT FBS FILTER WITH TYPE FIX ===
fbs_team_ids = pd.read_sql_query("""
    SELECT DISTINCT teamId 
    FROM Teams_Rankings 
    WHERE year = ? AND FPI_Ranking IS NOT NULL
""", conn, params=(YEAR,))["teamId"].astype(int)

games["homeId"] = pd.to_numeric(games["homeId"], errors="coerce").astype("int64")
games["awayId"] = pd.to_numeric(games["awayId"], errors="coerce").astype("int64")

original_count = len(games)
games = games[games["homeId"].isin(fbs_team_ids) | games["awayId"].isin(fbs_team_ids)].copy()

print(f"FILTERED: {original_count} → {len(games)} FBS-involved games")
# === END OF ONLY CHANGE ===

# YOUR ORIGINAL CODE — 100% RESTORED
for col in stats.select_dtypes("object").columns:
    if col != "homeAway":
        stats[col] = pd.to_numeric(stats[col], errors="coerce")

games["home_spread"] = pd.to_numeric(games["draftKingsSpread"].astype(str).str.replace("+", "", regex=False), errors="coerce").clip(-30, 30)

def moneyline_to_prob(ml):
    if pd.isna(ml) or ml == 0: return np.nan
    return 100 / (ml + 100) if ml > 0 else abs(ml) / (abs(ml) + 100)

games["vegas_home_win_prob"] = games["draftKingsHomeMoneyline"].apply(moneyline_to_prob)

team_id_map = {}
for _, row in stats.iterrows():
    gid = int(row["game_id"])
    game_row = games[games["id"] == gid]
    if game_row.empty: continue
    key = game_row.iloc[0]["homeId"] if row["homeAway"] == "home" else game_row.iloc[0]["awayId"]
    team_id_map[key] = int(row["team_id"])

# Pre-game Elo (your original system)
current_elo = {}
elo_pre_game = {0: current_elo.copy()}
for week in sorted(games["week"].unique()):
    snapshot = current_elo.copy()
    for _, g in games[games["week"] == week].iterrows():
        if pd.isna(g.homePoints): continue
        h = team_id_map.get(g.homeId)
        a = team_id_map.get(g.awayId)
        if not h or not a: continue
        h_elo = current_elo.get(h, 1500)
        a_elo = current_elo.get(a, 1500)
        exp = 1 / (1 + 10**((a_elo - h_elo - HOME_ADV)/400))
        res = 1 if g.homePoints > g.awayPoints else 0 if g.homePoints < g.awayPoints else 0.5
        upd = 32 * (res - exp)
        current_elo[h] = h_elo + upd
        current_elo[a] = a_elo - upd
    elo_pre_game[week] = snapshot

per_game_feats = [c for c in stats.columns if not c.startswith("cumulative_") and c not in ["game_id","season","week","team_id","homeAway"]]

cursor.execute("DROP TABLE IF EXISTS Teams_Games_Predictions")
cursor.execute("""CREATE TABLE Teams_Games_Predictions (
    game_id INTEGER PRIMARY KEY, home_team_id INTEGER, away_team_id INTEGER,
    home_win_prob REAL, predicted_winner TEXT, actual_winner TEXT, correct INTEGER,
    home_spread REAL, vegas_home_win_prob REAL
)""")

all_predictions = []
weekly_results = []

for target_week in range(3, 16):
    print(f"\n=== PREDICTING WEEK {target_week} ===")
    
    train_games = games[(games["week"] < target_week) & (games["completed"] == 1)]
    if train_games.empty:
        print(" No training data")
        continue

    train_stats = stats[stats["game_id"].isin(train_games["id"])].copy()
    season_avg = train_stats.groupby("team_id")[per_game_feats].mean()

    rolling = {}
    for team in train_stats["team_id"].unique():
        df = train_stats[train_stats["team_id"] == team][["week"] + per_game_feats].set_index("week").astype(float)
        rolling[team] = df.rolling(ROLLING_WINDOW, min_periods=1).mean()

    def get_stat(team_id, week, col):
        if team_id not in rolling:
            val = season_avg.at[team_id, col] if team_id in season_avg.index and col in season_avg.columns else np.nan
        else:
            past = rolling[team_id].index < week
            if not past.any():
                val = season_avg.at[team_id, col] if team_id in season_avg.index and col in season_avg.columns else np.nan
            else:
                val = rolling[team_id].loc[rolling[team_id].index[past][-1], col]
                if isinstance(val, pd.Series):
                    val = val.iloc[0]
        return float(val) if pd.notna(val) else np.nan

    home = train_stats[train_stats["homeAway"] == "home"]
    away = train_stats[train_stats["homeAway"] == "away"]
    hist = home.merge(away, on="game_id", suffixes=("_h", "_a"))
    hist = hist.merge(games[["id","week","home_spread","vegas_home_win_prob"]], left_on="game_id", right_on="id")
    hist = hist[hist["points_h"].notna() & hist["points_a"].notna()]
    if hist.empty: continue

    hist["h_elo"] = hist.apply(lambda r: elo_pre_game.get(r["week"], {}).get(r["team_id_h"], 1500), axis=1)
    hist["a_elo"] = hist.apply(lambda r: elo_pre_game.get(r["week"], {}).get(r["team_id_a"], 1500), axis=1)

    rows = []
    for _, r in hist.iterrows():
        row = {col: get_stat(r["team_id_h"], r["week"], col) - get_stat(r["team_id_a"], r["week"], col) for col in per_game_feats}
        row.update({
            "home_adv": HOME_ADV,
            "elo_diff": r["h_elo"] - r["a_elo"],
            "home_spread": r["home_spread"],
            "vegas_home_win_prob": r["vegas_home_win_prob"],
            "vegas_model_gap": r["vegas_home_win_prob"] - 0.5
        })
        rows.append(row)

    X = pd.DataFrame(rows).astype(float)
    y = (hist["points_h"] > hist["points_a"]).astype(int)

    imp = SimpleImputer(strategy="mean")
    scaler = StandardScaler()
    X_sc = scaler.fit_transform(imp.fit_transform(X))

    model = XGBClassifier(n_estimators=600, max_depth=5, learning_rate=0.03,
                          subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1)
    model.fit(X_sc, y)

    week_games = games[games["week"] == target_week]
    is_future = week_games["completed"].eq(0).all()
    probs = []
    actuals = []
    for _, g in week_games.iterrows():
        h_id = team_id_map.get(g.homeId)
        a_id = team_id_map.get(g.awayId)
        if not h_id or not a_id: continue

        row = {col: get_stat(h_id, target_week, col) - get_stat(a_id, target_week, col) for col in per_game_feats}
        row.update({
            "home_adv": HOME_ADV,
            "elo_diff": elo_pre_game.get(target_week, current_elo).get(h_id, 1500) - elo_pre_game.get(target_week, current_elo).get(a_id, 1500),
            "home_spread": g.home_spread,
            "vegas_home_win_prob": g.vegas_home_win_prob,
            "vegas_model_gap": g.vegas_home_win_prob - 0.5
        })

        Xp = pd.DataFrame([row]).reindex(columns=X.columns, fill_value=np.nan)
        Xp_sc = scaler.transform(imp.transform(Xp))
        prob = float(model.predict_proba(Xp_sc)[0][1])
        pred = "home" if prob > 0.5 else "away"
        actual = None
        correct = None

        if not is_future and pd.notna(g.homePoints) and pd.notna(g.awayPoints):
            actual = "home" if g.homePoints > g.awayPoints else "away"
            correct = 1 if pred == actual else 0
            actuals.append(1 if g.homePoints > g.awayPoints else 0)

        probs.append(prob)
        all_predictions.append((
            int(g.id), int(g.homeId), int(g.awayId),
            round(prob, 4), pred, actual, correct,
            float(g.home_spread) if pd.notna(g.home_spread) else None,
            float(g.vegas_home_win_prob) if pd.notna(g.vegas_home_win_prob) else None
        ))

    if actuals:
        acc = accuracy_score(actuals, [1 if p > 0.5 else 0 for p in probs])
        brier = brier_score_loss(actuals, probs)
        ll = log_loss(actuals, probs) if len(set(actuals)) > 1 else 0
        print(f" Completed — {len(actuals)} games | Acc: {acc:.1%} | Brier: {brier:.3f} | LogLoss: {ll:.3f}")
        weekly_results.append({"week": target_week, "games": len(actuals), "acc": acc, "brier": brier, "ll": ll})
    else:
        print(f" Future week — {len(week_games)} predictions")

cursor.executemany("INSERT OR REPLACE INTO Teams_Games_Predictions VALUES (?,?,?,?,?,?,?,?,?)", all_predictions)
conn.commit()
conn.close()

print("\n" + "="*70)
print("WEEKLY RESULTS")
for r in weekly_results:
    print(f"Week {r['week']:2d} — {r['games']:3d} games | Acc: {r['acc']:.1%} | Brier: {r['brier']:.3f}")
if weekly_results:
    total = sum(r["games"] for r in weekly_results)
    overall_acc = sum(r["acc"] * r["games"] for r in weekly_results) / total
    print(f"\nOVERALL: {total} games | Accuracy: {overall_acc:.1%}")