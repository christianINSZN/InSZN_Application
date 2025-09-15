import sqlite3
import os
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create Teams_Games table with new betting line columns
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Games (
    id INTEGER,
    season INTEGER,
    week INTEGER,
    seasonType TEXT,
    startDate TEXT,
    startTimeTBD BOOLEAN,
    completed BOOLEAN,
    neutralSite BOOLEAN,
    conferenceGame BOOLEAN,
    attendance INTEGER,
    venueId INTEGER,
    venue TEXT,
    homeId INTEGER,
    homeTeam TEXT,
    homeClassification TEXT,
    homeConference TEXT,
    homePoints INTEGER,
    homeLineScores TEXT,
    homePostgameWinProbability REAL,
    homePregameElo INTEGER,
    homePostgameElo INTEGER,
    awayId INTEGER,
    awayTeam TEXT,
    awayClassification TEXT,
    awayConference TEXT,
    awayPoints INTEGER,
    awayLineScores TEXT,
    awayPostgameWinProbability REAL,
    awayPregameElo INTEGER,
    awayPostgameElo INTEGER,
    excitementIndex REAL,
    highlights TEXT,
    notes TEXT,
    team TEXT,
    homeTeamAbrev TEXT,
    awayTeamAbrev TEXT,
    draftKingsSpread REAL,
    draftKingsFormattedSpread TEXT,
    draftKingsSpreadOpen REAL,
    draftKingsOverUnder REAL,
    draftKingsOverUnderOpen REAL,
    draftKingsHomeMoneyline INTEGER,
    draftKingsAwayMoneyline INTEGER,
    PRIMARY KEY (id, season, week, seasonType, team),
    FOREIGN KEY (team) REFERENCES Teams(school)
)
""")

# Fetch all teams from Teams table
cursor.execute("SELECT school FROM Teams WHERE year = ?", (int(os.getenv("YEAR", 2025)),))
teams = [row[0] for row in cursor.fetchall()]

# Fetch team abbreviations using homeId and awayId
cursor.execute("SELECT id, abbreviation FROM Teams WHERE year = ?", (int(os.getenv("YEAR", 2025)),))
team_abbreviations = {row[0]: row[1] for row in cursor.fetchall()}

# Fetch game data from API
url = "https://api.collegefootballdata.com/games"
headers = {"Authorization": f"Bearer {API_KEY}"}
params = {"year": int(os.getenv("YEAR", 2025))}
try:
    response = requests.get(url, headers=headers, params=params, timeout=20)  # Increased timeout to 20 seconds
    response.raise_for_status()
    games_data = response.json()
except requests.RequestException as e:
    print(f"Error fetching game data: {e}")
    conn.close()
    exit(1)

# Fetch betting lines for each game with retry logic
game_lines = {}
max_retries = 3
retry_delay = 2  # seconds

for game in games_data:
    game_id = game.get("id")
    if game_id:
        for attempt in range(max_retries):
            try:
                lines_url = f"https://api.collegefootballdata.com/lines?gameId={game_id}"
                lines_response = requests.get(lines_url, headers=headers, timeout=20)
                lines_response.raise_for_status()
                lines_data = lines_response.json()
                # Extract the lines array from the first game object
                if lines_data and isinstance(lines_data, list) and len(lines_data) > 0:
                    game_lines_data = lines_data[0]["lines"]  # Access the lines array
                    # Filter for DraftKings provider
                    draft_kings_line = next((line for line in game_lines_data if line.get("provider") == "DraftKings"), None)
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
                break  # Exit loop if successful
            except requests.RequestException as e:
                print(f"Error fetching lines for game ID {game_id}, attempt {attempt + 1}/{max_retries}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)  # Wait before retrying
                else:
                    print(f"Max retries reached for game ID {game_id}, skipping.")

# Optionally filter by TEAM
team_filter = os.getenv("TEAM")
if team_filter:
    games_data = [game for game in games_data if game.get("homeTeam").lower() == team_filter.lower() or game.get("awayTeam").lower() == team_filter.lower()]

# Determine which teams have postseason week 2
cursor.execute("SELECT DISTINCT team FROM Teams_Games WHERE season = ? AND seasonType = 'postseason' AND week = 2", (int(os.getenv("YEAR", 2025)),))
playoff_teams = {row[0] for row in cursor.fetchall()}

# Populate Teams_Games table with adjusted week for non-playoff teams
for game in games_data:
    id = game.get("id")
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

    # Override week for playoff games based on notes
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

    # Get team abbreviations using homeId and awayId
    homeTeamAbrev = team_abbreviations.get(homeId)
    awayTeamAbrev = team_abbreviations.get(awayId)

    # Get DraftKings betting lines for this game
    betting_lines = game_lines.get(id, {})
    draftKingsSpread = betting_lines.get("draftKingsSpread")
    draftKingsFormattedSpread = betting_lines.get("draftKingsFormattedSpread")
    draftKingsSpreadOpen = betting_lines.get("draftKingsSpreadOpen")
    draftKingsOverUnder = betting_lines.get("draftKingsOverUnder")
    draftKingsOverUnderOpen = betting_lines.get("draftKingsOverUnderOpen")
    draftKingsHomeMoneyline = betting_lines.get("draftKingsHomeMoneyline")
    draftKingsAwayMoneyline = betting_lines.get("draftKingsAwayMoneyline")

    # Ensure all 43 values are provided with defaults for missing betting lines
    home_values = (id, season, week, seasonType, startDate, startTimeTBD, completed, neutralSite, conferenceGame,
                   attendance, venueId, venue, homeId, homeTeam, homeClassification, homeConference, homePoints,
                   homeLineScores, homePostgameWinProbability, homePregameElo, homePostgameElo, awayId, awayTeam,
                   awayClassification, awayConference, awayPoints, awayLineScores, awayPostgameWinProbability,
                   awayPregameElo, awayPostgameElo, excitementIndex, highlights, notes, homeTeam, homeTeamAbrev,
                   awayTeamAbrev, draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
                   draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline)
    away_values = (id, season, week, seasonType, startDate, startTimeTBD, completed, neutralSite, conferenceGame,
                   attendance, venueId, venue, homeId, homeTeam, homeClassification, homeConference, homePoints,
                   homeLineScores, homePostgameWinProbability, homePregameElo, homePostgameElo, awayId, awayTeam,
                   awayClassification, awayConference, awayPoints, awayLineScores, awayPostgameWinProbability,
                   awayPregameElo, awayPostgameElo, excitementIndex, highlights, notes, awayTeam, homeTeamAbrev,
                   awayTeamAbrev, draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder,
                   draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline)

    # Debug: Print tuple length
    print(f"Home values length for game {id}: {len(home_values)}")

    # Row for home team
    if homeTeam in teams or not team_filter:
        cursor.execute(
            """
            INSERT OR REPLACE INTO Teams_Games (id, season, week, seasonType, startDate, startTimeTBD, completed, neutralSite, conferenceGame, attendance, venueId, venue, homeId, homeTeam, homeClassification, homeConference, homePoints, homeLineScores, homePostgameWinProbability, homePregameElo, homePostgameElo, awayId, awayTeam, awayClassification, awayConference, awayPoints, awayLineScores, awayPostgameWinProbability, awayPregameElo, awayPostgameElo, excitementIndex, highlights, notes, team, homeTeamAbrev, awayTeamAbrev, draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder, draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            home_values
        )

    # Row for away team
    if awayTeam in teams or not team_filter:
        cursor.execute(
            """
            INSERT OR REPLACE INTO Teams_Games (id, season, week, seasonType, startDate, startTimeTBD, completed, neutralSite, conferenceGame, attendance, venueId, venue, homeId, homeTeam, homeClassification, homeConference, homePoints, homeLineScores, homePostgameWinProbability, homePregameElo, homePostgameElo, awayId, awayTeam, awayClassification, awayConference, awayPoints, awayLineScores, awayPostgameWinProbability, awayPregameElo, awayPostgameElo, excitementIndex, highlights, notes, team, homeTeamAbrev, awayTeamAbrev, draftKingsSpread, draftKingsFormattedSpread, draftKingsSpreadOpen, draftKingsOverUnder, draftKingsOverUnderOpen, draftKingsHomeMoneyline, draftKingsAwayMoneyline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            away_values
        )

conn.commit()
conn.close()
print("Proof of concept completed for Teams_Games table with DraftKings lines for 5 games")