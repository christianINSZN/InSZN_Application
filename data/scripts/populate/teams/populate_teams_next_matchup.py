import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
YEAR = int(os.getenv("YEAR", 2024))

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create Teams_Matchup table with logo columns
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Matchup (
    id INTEGER PRIMARY KEY,
    startDate TEXT,
    startTimeTBD BOOLEAN,
    tv TEXT,
    neutralSite BOOLEAN,
    conferenceGame BOOLEAN,
    status TEXT,
    venueName TEXT,
    venueCity TEXT,
    venueState TEXT,
    homeTeamId INTEGER,
    homeTeamName TEXT,
    homeTeamLogo TEXT,
    awayTeamId INTEGER,
    awayTeamName TEXT,
    awayTeamLogo TEXT,
    spread REAL,
    overUnder REAL,
    homeMoneyline INTEGER,
    awayMoneyline INTEGER,
    year INTEGER,
    FOREIGN KEY (homeTeamId) REFERENCES Teams(id),
    FOREIGN KEY (awayTeamId) REFERENCES Teams(id)
)
""")

# Fetch matchup data from API
url = "https://api.collegefootballdata.com/scoreboard"
headers = {"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"}
params = {"classification": "fbs", "year": YEAR}
try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    matchups_data = response.json()
    print(f"Successfully fetched {len(matchups_data)} matchups from API")
except requests.RequestException as e:
    print(f"Error fetching matchup data: {e}")
    conn.close()
    exit(1)

# Fetch logos from Teams table
def get_team_logo(team_id):
    if not team_id:
        return None
    try:
        cursor.execute("SELECT logos FROM Teams WHERE id = ? AND year = ?", (team_id, YEAR))
        team_data = cursor.fetchone()
        if team_data and team_data[0]:
            logos = eval(team_data[0])  # Convert string representation of list to actual list
            return logos[0] if logos else None
        return None
    except sqlite3.Error as e:
        print(f"Error fetching logo for team {team_id}: {e}")
        return None

# Populate Teams_Matchup table with logos
for matchup in matchups_data:
    id = matchup.get("id")
    startDate = matchup.get("startDate")
    startTimeTBD = bool(matchup.get("startTimeTBD"))
    tv = matchup.get("tv")
    neutralSite = bool(matchup.get("neutralSite"))
    conferenceGame = bool(matchup.get("conferenceGame"))
    status = matchup.get("status")
    venueName = matchup.get("venue", {}).get("name")
    venueCity = matchup.get("venue", {}).get("city")
    venueState = matchup.get("venue", {}).get("state")
    homeTeamId = matchup.get("homeTeam", {}).get("id")
    homeTeamName = matchup.get("homeTeam", {}).get("name")
    awayTeamId = matchup.get("awayTeam", {}).get("id")
    awayTeamName = matchup.get("awayTeam", {}).get("name")
    spread = matchup.get("betting", {}).get("spread")
    overUnder = matchup.get("betting", {}).get("overUnder")
    homeMoneyline = matchup.get("betting", {}).get("homeMoneyline")
    awayMoneyline = matchup.get("betting", {}).get("awayMoneyline")

    # Extract year from startDate
    try:
        game_year = datetime.strptime(startDate, "%Y-%m-%dT%H:%M:%S.%fZ").year
    except (ValueError, TypeError) as e:
        print(f"Error parsing startDate {startDate} for matchup {id}: {e}")
        game_year = YEAR  # Fallback to YEAR if parsing fails

    # Fetch logos from Teams table
    homeTeamLogo = get_team_logo(homeTeamId)
    awayTeamLogo = get_team_logo(awayTeamId)

    if homeTeamId and awayTeamId:
        print(f"Processing matchup {id}: {homeTeamName} vs {awayTeamName}, Year: {game_year}, Logos - Home: {homeTeamLogo}, Away: {awayTeamLogo}")
        cursor.execute("""
            INSERT OR REPLACE INTO Teams_Matchup (id, startDate, startTimeTBD, tv, neutralSite, conferenceGame, status, venueName, venueCity, venueState, homeTeamId, homeTeamName, homeTeamLogo, awayTeamId, awayTeamName, awayTeamLogo, spread, overUnder, homeMoneyline, awayMoneyline, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (id, startDate, startTimeTBD, tv, neutralSite, conferenceGame, status, venueName, venueCity, venueState, homeTeamId, homeTeamName, homeTeamLogo, awayTeamId, awayTeamName, awayTeamLogo, spread, overUnder, homeMoneyline, awayMoneyline, game_year))
    else:
        print(f"Skipping matchup {id} due to missing team IDs: home={homeTeamId}, away={awayTeamId}")

conn.commit()
conn.close()
print("Teams_Matchup table population with logos completed")