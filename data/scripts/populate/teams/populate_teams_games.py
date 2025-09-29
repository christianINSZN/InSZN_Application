import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

YEAR = int(os.getenv("YEAR", 2025))
WEEK = int(os.getenv("WEEK", 5))

# Fetch team abbreviations
cursor.execute("SELECT id, abbreviation FROM Teams WHERE year = ?", (YEAR,))
team_abbreviations = {row[0]: row[1] for row in cursor.fetchall()}

# Fetch existing incomplete game IDs
cursor.execute("""
SELECT DISTINCT id FROM Teams_Games 
WHERE season = ? AND week = ? AND completed = 0
""", (YEAR, WEEK))
existing_game_ids = [row[0] for row in cursor.fetchall()]

if not existing_game_ids:
    print(f"No incomplete games found for {YEAR} week {WEEK}")
    conn.close()
    exit(0)

# Fetch game data for the week
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

# Fetch betting lines for the week
lines_url = f"https://api.collegefootballdata.com/lines?year={YEAR}&week={WEEK}"
try:
    lines_response = requests.get(lines_url, headers=headers, timeout=30)
    lines_response.raise_for_status()
    lines_data = lines_response.json()
except requests.RequestException as e:
    print(f"Error fetching lines: {e}")
    lines_data = []

# Map betting lines by game ID
game_lines = {}
for game in lines_data:
    game_id = game.get("id")
    if game_id:
        draft_kings_line = next((line for line in game.get("lines", []) if line.get("provider") == "DraftKings"), None)
        if draft_kings_line:
            game_lines[game_id] = {
                "draftKingsSpread": draft_kings_line.get("spread"),
                "draftKingsFormattedSpread": draft_kings_line.get("formattedSpread"),
                "draftKingsSpreadOpen": draft_kings_line.get("spreadOpen"),
                "draftKingsOverUnder": draft_kings_line.get("overUnder"),
                "draftKingsOverUnderOpen": draft_kings_line.get("overUnderOpen"),
                "draftKingsHomeMoneyline": draft_kings_line.get("homeMoneyline"),
                "draftKingsAwayMoneyline": draft_kings_line.get("awayMoneyline")
            }

# Filter games to existing incomplete IDs
games_data = [g for g in games_data if g.get("id") in existing_game_ids]

# Prepare batch update
update_query = """
UPDATE Teams_Games SET 
    completed = ?, homePoints = ?, awayPoints = ?, homeLineScores = ?, awayLineScores = ?,
    homePostgameWinProbability = ?, awayPostgameWinProbability = ?, homePostgameElo = ?, awayPostgameElo = ?,
    excitementIndex = ?, attendance = ?,
    draftKingsSpread = ?, draftKingsFormattedSpread = ?, draftKingsSpreadOpen = ?, draftKingsOverUnder = ?,
    draftKingsOverUnderOpen = ?, draftKingsHomeMoneyline = ?, draftKingsAwayMoneyline = ?
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
    startDate = game.get("startDate")
    startTimeTBD = bool(game.get("startTimeTBD"))
    completed = bool(game.get("completed"))
    neutralSite = bool(game.get("neutralSite"))
    conferenceGame = bool(game.get("conferenceGame"))
    attendance = game.get("attendance")
    venueId = game.get("venueId")
    venue = game.get("venue")
    homeId = game.get("homeId")
    homeTeam = game.get("homeTeam")
    homeClassification = game.get("homeClassification")
    homeConference = game.get("homeConference")
    homePoints = game.get("homePoints")
    homeLineScores = str(game.get("homeLineScores")) if game.get("homeLineScores") else None
    homePostgameWinProbability = game.get("homePostgameWinProbability")
    homePregameElo = game.get("homePregameElo")
    homePostgameElo = game.get("homePostgameElo")
    awayId = game.get("awayId")
    awayTeam = game.get("awayTeam")
    awayClassification = game.get("awayClassification")
    awayConference = game.get("awayConference")
    awayPoints = game.get("awayPoints")
    awayLineScores = str(game.get("awayLineScores")) if game.get("awayLineScores") else None
    awayPostgameWinProbability = game.get("awayPostgameWinProbability")
    awayPregameElo = game.get("awayPregameElo")
    awayPostgameElo = game.get("awayPostgameElo")
    excitementIndex = game.get("excitementIndex")
    highlights = game.get("highlights")
    notes = game.get("notes")

    # Restore original playoff week logic
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

    homeTeamAbrev = team_abbreviations.get(homeId)
    awayTeamAbrev = team_abbreviations.get(awayId)
    betting_lines = game_lines.get(id, {})
    draftKingsSpread = betting_lines.get("draftKingsSpread")
    draftKingsFormattedSpread = betting_lines.get("draftKingsFormattedSpread")
    draftKingsSpreadOpen = betting_lines.get("draftKingsSpreadOpen")
    draftKingsOverUnder = betting_lines.get("draftKingsOverUnder")
    draftKingsOverUnderOpen = betting_lines.get("overUnderOpen")
    draftKingsHomeMoneyline = betting_lines.get("homeMoneyline")
    draftKingsAwayMoneyline = betting_lines.get("awayMoneyline")

    # Add update values for home team
    if homeTeam:
        values.append((
            completed, homePoints, awayPoints, homeLineScores, awayLineScores,
            homePostgameWinProbability, awayPostgameWinProbability, homePostgameElo, awayPostgameElo,
            excitementIndex, attendance,
            draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
            draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline,
            id, season, week, homeTeam
        ))

    # Add update values for away team
    if awayTeam:
        values.append((
            completed, homePoints, awayPoints, homeLineScores, awayLineScores,
            homePostgameWinProbability, awayPostgameWinProbability, homePostgameElo, awayPostgameElo,
            excitementIndex, attendance,
            draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
            draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline,
            id, season, week, awayTeam
        ))

# Batch update
cursor.executemany(update_query, values)
conn.commit()
conn.close()
print(f"Updated {len(values)} rows for {YEAR} week {WEEK}")