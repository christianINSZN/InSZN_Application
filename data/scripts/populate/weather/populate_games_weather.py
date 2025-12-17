import sqlite3
import requests
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Load API key
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("GAMES_WEATHER - POPULATION SCRIPT")
print("=" * 80)

# ============================================================================
# STEP 1: Create Games_Weather table
# ============================================================================
print("\n[STEP 1] Creating Games_Weather table...")

cursor.execute("DROP TABLE IF EXISTS Games_Weather")

create_sql = """
CREATE TABLE Games_Weather (
    id INTEGER PRIMARY KEY,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    season_type TEXT,
    start_time TEXT,
    game_indoors INTEGER,
    home_team TEXT,
    home_conference TEXT,
    away_team TEXT,
    away_conference TEXT,
    venue_id INTEGER,
    venue TEXT,
    temperature REAL,
    dew_point REAL,
    humidity REAL,
    precipitation REAL,
    snowfall REAL,
    wind_direction INTEGER,
    wind_speed REAL,
    pressure REAL,
    weather_condition_code INTEGER,
    weather_condition TEXT,
    FOREIGN KEY (id) REFERENCES Teams_Games(id)
)
"""

cursor.execute(create_sql)
print("  ✓ Table created")

# ============================================================================
# STEP 2: Fetch and populate data
# ============================================================================
print("\n[STEP 2] Fetching weather data from API...")

BASE_URL = "https://api.collegefootballdata.com/games/weather"
YEARS = [2021, 2022, 2023, 2024, 2025]
WEEKS = range(1, 16)  # Weeks 1-15

total_games = 0
total_requests = 0
errors = []

for year in YEARS:
    year_games = 0
    print(f"\n  Processing {year}...")
    
    for week in WEEKS:
        try:
            # Make API request with authentication
            params = {
                'year': year,
                'week': week
            }
            
            headers = {
                'Authorization': f'Bearer {API_KEY}'
            }
            
            response = requests.get(BASE_URL, params=params, headers=headers)
            total_requests += 1
            
            if response.status_code == 200:
                games = response.json()
                
                if games:
                    # Insert each game's weather data
                    for game in games:
                        try:
                            cursor.execute("""
                                INSERT OR REPLACE INTO Games_Weather (
                                    id, season, week, season_type, start_time,
                                    game_indoors, home_team, home_conference,
                                    away_team, away_conference, venue_id, venue,
                                    temperature, dew_point, humidity, precipitation,
                                    snowfall, wind_direction, wind_speed, pressure,
                                    weather_condition_code, weather_condition
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                game.get('id'),
                                game.get('season'),
                                game.get('week'),
                                game.get('seasonType'),  # camelCase
                                game.get('startTime'),   # camelCase
                                game.get('gameIndoors'), # camelCase
                                game.get('homeTeam'),    # camelCase
                                game.get('homeConference'), # camelCase
                                game.get('awayTeam'),    # camelCase
                                game.get('awayConference'), # camelCase
                                game.get('venueId'),     # camelCase
                                game.get('venue'),
                                game.get('temperature'),
                                game.get('dewPoint'),    # camelCase
                                game.get('humidity'),
                                game.get('precipitation'),
                                game.get('snowfall'),
                                game.get('windDirection'), # camelCase
                                game.get('windSpeed'),   # camelCase
                                game.get('pressure'),
                                game.get('weatherConditionCode'), # camelCase
                                game.get('weatherCondition')      # camelCase
                            ))
                            year_games += 1
                            total_games += 1
                        except sqlite3.Error as e:
                            errors.append(f"Error inserting game {game.get('id')}: {e}")
                    
                    # Commit after each week
                    conn.commit()
                    print(f"    Week {week:2d}: {len(games):3d} games")
                else:
                    print(f"    Week {week:2d}: No games found")
            else:
                error_msg = f"Week {week}: API returned status {response.status_code}"
                errors.append(error_msg)
                print(f"    ⚠ {error_msg}")
            
            # Rate limiting - 1 second between requests
            time.sleep(1)
            
        except requests.exceptions.RequestException as e:
            error_msg = f"{year} Week {week}: Request failed - {e}"
            errors.append(error_msg)
            print(f"    ⚠ {error_msg}")
            time.sleep(2)  # Wait longer after errors
        except Exception as e:
            error_msg = f"{year} Week {week}: Unexpected error - {e}"
            errors.append(error_msg)
            print(f"    ⚠ {error_msg}")
    
    print(f"  {year} Summary: {year_games} games added")

# ============================================================================
# STEP 3: Verification
# ============================================================================
print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

# Overall stats
cursor.execute("""
    SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN game_indoors = 1 THEN 1 END) as indoor_games,
        COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as games_with_temp,
        AVG(temperature) as avg_temp,
        MIN(temperature) as min_temp,
        MAX(temperature) as max_temp
    FROM Games_Weather
""")

stats = cursor.fetchone()
print(f"\nOverall Statistics:")
print(f"  Total games: {stats[0]:,}")
print(f"  Indoor games: {stats[1]:,}")
print(f"  Games with temperature data: {stats[2]:,}")
if stats[3]:
    print(f"  Average temperature: {stats[3]:.1f}°F")
    print(f"  Temperature range: {stats[4]:.1f}°F to {stats[5]:.1f}°F")

# Summary by year
cursor.execute("""
    SELECT season, COUNT(*) as games,
           COUNT(CASE WHEN game_indoors = 1 THEN 1 END) as indoor,
           AVG(temperature) as avg_temp
    FROM Games_Weather
    GROUP BY season
    ORDER BY season
""")

print(f"\nGames by year:")
print("  Year | Games | Indoor | Avg Temp")
print("  " + "-" * 45)
for row in cursor.fetchall():
    avg_temp = f"{row[3]:.1f}°F" if row[3] else "N/A"
    print(f"  {row[0]} | {row[1]:5d} | {row[2]:6d} | {avg_temp}")

# Weather extremes
cursor.execute("""
    SELECT home_team, away_team, week, season, temperature, weather_condition
    FROM Games_Weather
    WHERE temperature IS NOT NULL
    ORDER BY temperature ASC
    LIMIT 5
""")

print(f"\nColdest games:")
for home, away, week, year, temp, condition in cursor.fetchall():
    cond_str = f" ({condition})" if condition else ""
    print(f"  {home} vs {away} ({year} Week {week}): {temp:.1f}°F{cond_str}")

cursor.execute("""
    SELECT home_team, away_team, week, season, temperature, weather_condition
    FROM Games_Weather
    WHERE temperature IS NOT NULL
    ORDER BY temperature DESC
    LIMIT 5
""")

print(f"\nHottest games:")
for home, away, week, year, temp, condition in cursor.fetchall():
    cond_str = f" ({condition})" if condition else ""
    print(f"  {home} vs {away} ({year} Week {week}): {temp:.1f}°F{cond_str}")

# Wind extremes
cursor.execute("""
    SELECT home_team, away_team, week, season, wind_speed, weather_condition
    FROM Games_Weather
    WHERE wind_speed IS NOT NULL
    ORDER BY wind_speed DESC
    LIMIT 5
""")

print(f"\nWindiest games:")
for home, away, week, year, wind, condition in cursor.fetchall():
    cond_str = f" ({condition})" if condition else ""
    print(f"  {home} vs {away} ({year} Week {week}): {wind:.1f} mph{cond_str}")

# Errors summary
if errors:
    print(f"\n⚠ Errors encountered: {len(errors)}")
    print("  First 5 errors:")
    for error in errors[:5]:
        print(f"    - {error}")
else:
    print(f"\n✓ No errors encountered")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ POPULATION COMPLETE")
print("=" * 80)
print(f"\nTotal API requests: {total_requests}")
print(f"Total games inserted: {total_games:,}")
print(f"Table: Games_Weather")
print("=" * 80)