#!/usr/bin/env python3
import sqlite3
import pandas as pd

DB_FILE = "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db"
YEAR = 2025

conn = sqlite3.connect(DB_FILE)

print("=== FINAL DEBUG — THIS WILL TELL US THE TRUTH ===\n")

# 1. FBS teamIds from Rankings
fbs = pd.read_sql("SELECT teamId, school FROM Teams_Rankings WHERE year = ? AND FPI_Ranking IS NOT NULL LIMIT 20", conn, params=(YEAR,))
print("1. FBS teamIds from Rankings (should be 136):")
print(fbs)

# 2. homeId/awayId from Games
games_sample = pd.read_sql("SELECT homeId, awayId FROM Teams_Games WHERE season = ? LIMIT 20", conn, params=(YEAR,))
print("\n2. homeId/awayId from Games:")
print(games_sample)

# 3. Are they the same type?
print("\n3. Data types:")
print("Rankings teamId dtype:", fbs["teamId"].dtype)
print("Games homeId dtype:", games_sample["homeId"].dtype)

# 4. Direct overlap test
overlap = pd.read_sql(f"""
    SELECT COUNT(*) as count
    FROM Teams_Games g
    JOIN Teams_Rankings r ON g.homeId = r.teamId OR g.awayId = r.teamId
    WHERE g.season = {YEAR} AND r.year = {YEAR} AND r.FPI_Ranking IS NOT NULL
""", conn)
print(f"\n4. Number of games with direct ID match: {overlap.iloc[0,0]}")

# 5. Show one matching game if exists
if overlap.iloc[0,0] > 0:
    match = pd.read_sql(f"""
        SELECT g.id, g.homeId, g.awayId, r.school
        FROM Teams_Games g
        JOIN Teams_Rankings r ON g.homeId = r.teamId
        WHERE g.season = {YEAR} AND r.year = {YEAR}
        LIMIT 1
    """, conn)
    print("\n5. Example matching game:")
    print(match)

conn.close()