#!/usr/bin/env python3
"""
Check Week 13 Games Status
"""

import sqlite3
import pandas as pd
from pathlib import Path

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)

print("="*80)
print("WEEK 13 GAMES CHECK")
print("="*80)

# Check week 13
week13 = pd.read_sql_query("""
    SELECT COUNT(*) as total,
           SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN homePoints IS NOT NULL THEN 1 ELSE 0 END) as with_scores
    FROM Teams_Games
    WHERE season = 2025 AND week = 13
""", conn)

print(f"\nWeek 13 Status:")
print(f"  Total games: {week13['total'].iloc[0]}")
print(f"  Completed: {week13['completed'].iloc[0]}")
print(f"  With scores: {week13['with_scores'].iloc[0]}")

if week13['completed'].iloc[0] > 0:
    print(f"\n✅ Week 13 has {week13['completed'].iloc[0]} completed games - can use for testing!")
elif week13['total'].iloc[0] > 0:
    print(f"\n⚠️  Week 13 has {week13['total'].iloc[0]} scheduled games but none completed yet")
    print(f"   We can predict them, but can't measure accuracy yet")
    
    # Show sample games
    sample = pd.read_sql_query("""
        SELECT id, homeTeam, awayTeam, startDate, draftKingsSpread
        FROM Teams_Games
        WHERE season = 2025 AND week = 13
        LIMIT 5
    """, conn)
    print(f"\n   Sample upcoming games:")
    for _, game in sample.iterrows():
        print(f"   • {game['awayTeam']} @ {game['homeTeam']} (spread: {game['draftKingsSpread']})")
else:
    print(f"\n❌ No week 13 games found")

conn.close()