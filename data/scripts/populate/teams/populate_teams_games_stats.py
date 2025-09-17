import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import sys
import time

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Check command line arguments
if len(sys.argv) not in [3, 4]:
    print("Usage: python populate_teams_games_stats.py <year> <seasonType> [<week>]")
    print("Example: python populate_teams_games_stats.py 2025 regular 4")
    sys.exit(1)
year = int(sys.argv[1])
seasonType = sys.argv[2]
week = int(sys.argv[3]) if len(sys.argv) == 4 else None

# Validate seasonType
valid_season_types = ['regular', 'postseason']
if seasonType not in valid_season_types:
    print(f"Invalid seasonType: {seasonType}. Must be one of {valid_season_types}")
    sys.exit(1)

# Create Teams_Games_Stats table
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Games_Stats (
    game_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    seasonType TEXT,
    team_id INTEGER NOT NULL,
    team TEXT,
    conference TEXT,
    homeAway TEXT,
    points INTEGER,
    firstDowns INTEGER,
    thirdDownEff TEXT,
    fourthDownEff TEXT,
    totalYards INTEGER,
    netPassingYards INTEGER,
    completionAttempts TEXT,
    yardsPerPass REAL,
    rushingYards INTEGER,
    rushingAttempts INTEGER,
    yardsPerRushAttempt REAL,
    totalPenaltiesYards TEXT,
    turnovers INTEGER,
    fumblesLost INTEGER,
    interceptions INTEGER,
    possessionTime TEXT,
    passesDeflected INTEGER,
    qbHurries INTEGER,
    sacks INTEGER,
    tackles INTEGER,
    defensiveTDs INTEGER,
    tacklesForLoss INTEGER,
    totalFumbles INTEGER,
    fumblesRecovered INTEGER,
    passesIntercepted INTEGER,
    interceptionTDs INTEGER,
    interceptionYards INTEGER,
    kickingPoints INTEGER,
    kickReturns INTEGER,
    kickReturnTDs INTEGER,
    kickReturnYards INTEGER,
    passingTDs INTEGER,
    puntReturns INTEGER,
    puntReturnTDs INTEGER,
    puntReturnYards INTEGER,
    rushingTDs INTEGER,
    PRIMARY KEY (game_id, season, week, seasonType, team_id),
    FOREIGN KEY (game_id, season, week, team) REFERENCES Teams_Games(id, season, week, team)
)
""")

# Fetch distinct completed games from Teams_Games
query = """
SELECT DISTINCT id, season, week, seasonType, team, homeId, awayId, homeTeam, awayTeam
FROM Teams_Games
WHERE season = ? AND seasonType = ? AND completed = 1
"""
params = [year, seasonType]
if week is not None:
    query += " AND week = ?"
    params.append(week)
cursor.execute(query, params)
games = cursor.fetchall()
if not games:
    print(f"No completed games found for year {year}, seasonType {seasonType}" + (f", week {week}" if week is not None else ""))
    conn.close()
    sys.exit(0)

# Group games by id
game_team_map = {}
for game in games:
    game_id, season, week, seasonType, team, homeId, awayId, homeTeam, awayTeam = game
    team_id = homeId if team == homeTeam else awayId
    if game_id not in game_team_map:
        game_team_map[game_id] = {'season': season, 'week': week, 'seasonType': seasonType, 'teams': []}
    game_team_map[game_id]['teams'].append({'team': team, 'team_id': team_id})

# Fetch stats for each game by id
headers = {"Authorization": f"Bearer {API_KEY}"}
for game_id, game_info in game_team_map.items():
    season = game_info['season']
    week = game_info['week']
    seasonType = game_info['seasonType']
    teams = [t['team'] for t in game_info['teams']]
    url = f"https://api.collegefootballdata.com/games/teams?id={game_id}"
    print(f"Fetching stats for game {game_id}, teams {teams}, year {season}, week {week}, seasonType {seasonType}")
    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        games_data = response.json()
    except requests.RequestException as e:
        print(f"Error fetching stats for game {game_id}: {e}")
        continue

    # Find matching game
    for game_data in games_data:
        if game_data.get("id") != game_id:
            continue
        for team_stat in game_data.get("teams", []):
            team_id = team_stat.get("teamId")
            team_name = team_stat.get("team")
            conference = team_stat.get("conference")
            homeAway = team_stat.get("homeAway")
            points = team_stat.get("points")
            stats = {stat["category"]: stat["stat"] for stat in team_stat.get("stats", [])}

            # Prepare values, defaulting to NULL for missing stats
            values = (
                game_id,
                season,
                week,
                seasonType,
                team_id,
                team_name,
                conference,
                homeAway,
                points,
                stats.get("firstDowns"),
                stats.get("thirdDownEff"),
                stats.get("fourthDownEff"),
                stats.get("totalYards"),
                stats.get("netPassingYards"),
                stats.get("completionAttempts"),
                stats.get("yardsPerPass"),
                stats.get("rushingYards"),
                stats.get("rushingAttempts"),
                stats.get("yardsPerRushAttempt"),
                stats.get("totalPenaltiesYards"),
                stats.get("turnovers"),
                stats.get("fumblesLost"),
                stats.get("interceptions"),
                stats.get("possessionTime"),
                stats.get("passesDeflected"),
                stats.get("qbHurries"),
                stats.get("sacks"),
                stats.get("tackles"),
                stats.get("defensiveTDs"),
                stats.get("tacklesForLoss"),
                stats.get("totalFumbles"),
                stats.get("fumblesRecovered"),
                stats.get("passesIntercepted"),
                stats.get("interceptionTDs"),
                stats.get("interceptionYards"),
                stats.get("kickingPoints"),
                stats.get("kickReturns"),
                stats.get("kickReturnTDs"),
                stats.get("kickReturnYards"),
                stats.get("passingTDs"),
                stats.get("puntReturns"),
                stats.get("puntReturnTDs"),
                stats.get("puntReturnYards"),
                stats.get("rushingTDs")
            )

            cursor.execute("""
                INSERT OR REPLACE INTO Teams_Games_Stats (
                    game_id, season, week, seasonType, team_id, team, conference, homeAway, points,
                    firstDowns, thirdDownEff, fourthDownEff, totalYards, netPassingYards,
                    completionAttempts, yardsPerPass, rushingYards, rushingAttempts,
                    yardsPerRushAttempt, totalPenaltiesYards, turnovers, fumblesLost,
                    interceptions, possessionTime, passesDeflected, qbHurries, sacks,
                    tackles, defensiveTDs, tacklesForLoss, totalFumbles, fumblesRecovered,
                    passesIntercepted, interceptionTDs, interceptionYards, kickingPoints,
                    kickReturns, kickReturnTDs, kickReturnYards, passingTDs, puntReturns,
                    puntReturnTDs, puntReturnYards, rushingTDs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, values)
    
    # Avoid API rate limits
    time.sleep(1)

conn.commit()
conn.close()
print(f"Populated Teams_Games_Stats for year {year}, seasonType {seasonType}" + (f", week {week}" if week is not None else ""))