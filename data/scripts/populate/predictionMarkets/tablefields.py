#!/usr/bin/env python3
"""
Quick diagnostic - Check what weeks have completed games
"""

import sqlite3
import pandas as pd
from pathlib import Path

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("="*80)
print("CHECKING AVAILABLE TEST DATA")
print("="*80)

# Check 2025 games by week
games = pd.read_sql_query("""
    SELECT week, 
           COUNT(*) as total_games,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_games,
           SUM(CASE WHEN homePoints IS NOT NULL THEN 1 ELSE 0 END) as games_with_scores
    FROM Teams_Games 
    WHERE season = 2025
    GROUP BY week
    ORDER BY week
""", conn)

print("\n2025 Games by Week:")
print(games.to_string(index=False))

print("\n" + "="*80)
print("TEST WEEKS ANALYSIS (weeks 11-15):")
print("="*80)

for week in range(11, 16):
    week_data = games[games['week'] == week]
    if len(week_data) > 0:
        completed = week_data['completed_games'].iloc[0]
        print(f"Week {week}: {completed} completed games")
    else:
        print(f"Week {week}: NO GAMES SCHEDULED")

# Check if we should use different test weeks
print("\n" + "="*80)
print("RECOMMENDATION:")
print("="*80)

completed_weeks = games[games['completed_games'] > 0]['week'].tolist()
if len(completed_weeks) > 10:
    train_weeks = completed_weeks[:10]
    test_weeks = completed_weeks[10:]
    print(f"\n✅ Use these weeks instead:")
    print(f"   TRAIN: Weeks {min(train_weeks)}-{max(train_weeks)} ({len(train_weeks)} weeks)")
    print(f"   TEST: Weeks {min(test_weeks)}-{max(test_weeks)} ({len(test_weeks)} weeks)")
else:
    print(f"\n⚠️  Only {len(completed_weeks)} weeks have completed games")
    print(f"   Can only train on weeks {min(completed_weeks)}-{max(completed_weeks)}")
    print(f"   Not enough data for train/test split")

conn.close()