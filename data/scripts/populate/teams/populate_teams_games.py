import sqlite3
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
YEAR = int(os.getenv("YEAR", 2025))
WEEK = int(os.getenv("WEEK", 14))

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Fetch team abbreviations and logos
cursor.execute("SELECT id, abbreviation, logos FROM Teams WHERE year = ?", (YEAR,))
team_data = cursor.fetchall()
team_abbreviations = {row[0]: row[1] for row in team_data}
team_logos = {}
for row in team_data:
    if row[2]:
        try:
            logos_list = json.loads(row[2])
            team_logos[row[0]] = logos_list[0] if logos_list else None
        except (json.JSONDecodeError, IndexError) as e:
            print(f"Error parsing logos for team {row[0]}: {e}")
            team_logos[row[0]] = None
    else:
        team_logos[row[0]] = None

# Fetch existing game IDs (all games, not just incomplete)
cursor.execute("""
SELECT DISTINCT id, homeId, awayId FROM Teams_Games
WHERE season = ? AND week = ?
""", (YEAR, WEEK))
existing_games = cursor.fetchall()
existing_game_ids = [row[0] for row in existing_games]
if not existing_game_ids:
    print(f"No games found for {YEAR} week {WEEK}")
    conn.close()
    exit(0)

# Fetch game data
url = "https://api.collegefootballdata.com/games"
headers = {"Authorization": f"Bearer {API_KEY}"}
params = {"year": YEAR, "week": WEEK}
try:
    response = requests.get(url, headers=headers, params=params, timeout=20)
    response.raise_for_status()
    games_data = response.json()
except requests.RequestException as e:
    print(f"Error fetching games: {e}")
    conn.close()
    exit(1)

# Fetch betting lines
lines_url = f"https://api.collegefootballdata.com/lines?year={YEAR}&week={WEEK}"
try:
    lines_response = requests.get(lines_url, headers=headers, timeout=30)
    lines_response.raise_for_status()
    lines_data = lines_response.json()
except requests.RequestException as e:
    print(f"Error fetching lines: {e}")
    lines_data = []

# Map betting lines (DraftKings > Bovada > ESPN Bet)
game_lines = {}
for game in lines_data:
    game_id = game.get("id")
    if not game_id:
        continue
    lines = game.get("lines", [])
    dk = next((l for l in lines if l.get("provider") == "DraftKings"), None)
    bov = next((l for l in lines if l.get("provider") == "Bovada"), None)
    espn = next((l for l in lines if l.get("provider") == "ESPN Bet"), None)
    line = dk or bov or espn
    if line:
        game_lines[game_id] = {
            "draftKingsSpread": line.get("spread"),
            "draftKingsFormattedSpread": line.get("formattedSpread"),
            "draftKingsSpreadOpen": line.get("spreadOpen"),
            "draftKingsOverUnder": line.get("overUnder"),
            "draftKingsOverUnderOpen": line.get("overUnderOpen"),
            "draftKingsHomeMoneyline": line.get("homeMoneyline"),
            "draftKingsAwayMoneyline": line.get("awayMoneyline")
        }

# Filter to existing games
games_data = [g for g in games_data if g.get("id") in existing_game_ids]

# Update query
update_query = """
UPDATE Teams_Games SET
    completed = ?, homePoints = ?, awayPoints = ?, homeLineScores = ?, awayLineScores = ?,
    homePostgameWinProbability = ?, awayPostgameWinProbability = ?, homePostgameElo = ?, awayPostgameElo = ?,
    excitementIndex = ?, attendance = ?,
    draftKingsSpread = ?, draftKingsFormattedSpread = ?, draftKingsSpreadOpen = ?, draftKingsOverUnder = ?,
    draftKingsOverUnderOpen = ?, draftKingsHomeMoneyline = ?, draftKingsAwayMoneyline = ?,
    homeTeamLogo = ?, awayTeamLogo = ?
WHERE id = ? AND season = ? AND week = ? AND team = ?
"""

values = []
for game in games_data:
    id = game.get("id")
    if not id:
        continue
    season = game.get("season")
    week = game.get("week")
    seasonType = game.get("seasonType")
    notes = game.get("notes")

    # Playoff week override
    if seasonType == "postseason":
        if "First Round" in (notes or ""):
            week = 1
        elif "Quarterfinal" in (notes or ""):
            week = 2
        elif "Semifinal" in (notes or ""):
            week = 3
        elif "Championship" in (notes or ""):
            week = 4
        else:
            week = 2

    completed = bool(game.get("completed"))
    homeId = game.get("homeId")
    awayId = game.get("awayId")
    homeTeam = game.get("homeTeam")
    awayTeam = game.get("awayTeam")
    homePoints = game.get("homePoints")
    awayPoints = game.get("awayPoints")
    homeLineScores = str(game.get("homeLineScores")) if game.get("homeLineScores") else None
    awayLineScores = str(game.get("awayLineScores")) if game.get("awayLineScores") else None
    homePostgameWinProbability = game.get("homePostgameWinProbability")
    awayPostgameWinProbability = game.get("awayPostgameWinProbability")
    homePostgameElo = game.get("homePostgameElo")
    awayPostgameElo = game.get("awayPostgameElo")
    excitementIndex = game.get("excitementIndex")
    attendance = game.get("attendance")

    homeTeamLogo = team_logos.get(homeId)
    awayTeamLogo = team_logos.get(awayId)

    betting_lines = game_lines.get(id, {})
    draftKingsSpread = betting_lines.get("draftKingsSpread")
    draftKingsFormattedSpread = betting_lines.get("draftKingsFormattedSpread")
    draftKingsSpreadOpen = betting_lines.get("draftKingsSpreadOpen")
    draftKingsOverUnder = betting_lines.get("draftKingsOverUnder")
    draftKingsOverUnderOpen = betting_lines.get("draftKingsOverUnderOpen")
    draftKingsHomeMoneyline = betting_lines.get("draftKingsHomeMoneyline")
    draftKingsAwayMoneyline = betting_lines.get("draftKingsAwayMoneyline")

    # Home team row
    if homeTeam:
        values.append((
            completed, homePoints, awayPoints, homeLineScores, awayLineScores,
            homePostgameWinProbability, awayPostgameWinProbability, homePostgameElo, awayPostgameElo,
            excitementIndex, attendance,
            draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
            draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline,
            homeTeamLogo, awayTeamLogo,
            id, season, week, homeTeam
        ))

    # Away team row
    if awayTeam:
        values.append((
            completed, homePoints, awayPoints, homeLineScores, awayLineScores,
            homePostgameWinProbability, awayPostgameWinProbability, homePostgameElo, awayPostgameElo,
            excitementIndex, attendance,
            draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
            draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline,
            homeTeamLogo, awayTeamLogo,
            id, season, week, awayTeam
        ))

# Execute update
cursor.executemany(update_query, values)
conn.commit()
conn.close()
print(f"Updated {len(values)} rows for {YEAR} week {WEEK}")