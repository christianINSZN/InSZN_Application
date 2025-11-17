#!/usr/bin/env python3
import sqlite3
import pandas as pd
import numpy as np
from xgboost import XGBClassifier, XGBRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import log_loss, brier_score_loss
from pathlib import Path
import os
from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore")

load_dotenv()
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
YEAR = int(os.getenv("YEAR", 2025))
HOME_ADV = 2.5
TOP_FEATURES = 20
ROLLING_WINDOW = 3

MODEL_WEIGHT = 0.65
VEGAS_WEIGHT = 0.35

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=== LOADING DATA ===")
stats = pd.read_sql_query("SELECT * FROM Teams_Games_Stats WHERE season = ?", conn, params=(YEAR,))
games = pd.read_sql_query(
    "SELECT id, homeId, awayId, homePoints, awayPoints, week, completed, draftKingsSpread, draftKingsHomeMoneyline, draftKingsAwayMoneyline FROM Teams_Games WHERE season = ?",
    conn, params=(YEAR,)
)

# ... [all the data cleaning and ELO code unchanged until get_team_avg] ...

# === FIXED get_team_avg — always returns a clean Series with scalar values ===
def get_team_avg(team_id, week):
    if team_id not in rolling_stats:
        fallback = season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({c: np.nan for c in per_game_feats})
        return fallback.astype(float)
    df = rolling_stats[team_id]
    prior = df.index[df.index < week]
    if len(prior) == 0:
        fallback = season_avg.loc[team_id] if team_id in season_avg.index else pd.Series({c: np.nan for c in per_game_feats})
        return fallback.astype(float)
    return df.loc[prior.max()].astype(float)  # ← critical: .max() + .astype(float)

# === SAFE feature building — now bulletproof ===
X_list = []
for col in per_game_feats:
    def safe_get(row, side):
        avg_series = get_team_avg(row[f"team_id_{side}"], row["week"])
        val = avg_series.get(col)
        return float(val) if pd.notna(val) else np.nan

    h_vals = hist.apply(lambda r: safe_get(r, "h"), axis=1)
    a_vals = hist.apply(lambda r: safe_get(r, "a"), axis=1)
    diff = h_vals - a_vals
    if diff.notna().sum() > 0:
        X_list.append(diff.rename(col))

if not X_list:
    print(" No valid stat features")
    continue

X = pd.concat(X_list, axis=1)
X["home_spread"] = hist["home_spread"].values
X["vegas_home_win_prob"] = hist["vegas_home_win_prob"].values
X["home_adv"] = HOME_ADV
X["elo_diff"] = elo_diff.values
X = X.astype(float)  # now 100% safe

# ... rest of the script exactly the same from previous working version ...