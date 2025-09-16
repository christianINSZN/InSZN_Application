import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import time

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Alter Teams_Rankings table to add new columns if they don't exist
cursor.execute("PRAGMA table_info(Teams_Rankings)")
columns = [col[1] for col in cursor.fetchall()]
new_columns = [
    ("SOR", "INTEGER"),
    ("FPI_Ranking", "INTEGER"),
    ("SOS", "INTEGER")
]
for col_name, col_type in new_columns:
    if col_name not in columns:
        cursor.execute(f"ALTER TABLE Teams_Rankings ADD COLUMN {col_name} {col_type}")

# Create Teams_Rankings table if it doesn't exist
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Rankings (
    teamId TEXT NOT NULL,
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    school TEXT NOT NULL,
    coaches_poll_rank TEXT,
    ap_poll_rank TEXT,
    SP_Ranking INTEGER,
    SP_Rating REAL,
    SP_Off_Ranking INTEGER,
    SP_Off_Rating REAL,
    SP_Def_Ranking INTEGER,
    SP_Def_Rating REAL,
    ELO_Rating REAL,
    SOR INTEGER,
    FPI_Ranking INTEGER,
    SOS INTEGER,
    PRIMARY KEY (teamId, year, week)
)
""")

# Set up requests session with retries
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

def fetch_rankings(year, week):
    url = "https://api.collegefootballdata.com/rankings"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year, "week": week}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        data = response.json()
        print(f"Fetched rankings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching rankings data: {e}")
        return []

def fetch_sp_ratings(year):
    url = "https://api.collegefootballdata.com/ratings/sp"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        data = response.json()
        print(f"Fetched SP+ ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching SP+ ratings: {e}")
        return []

def fetch_elo_ratings(year):
    url = "https://api.collegefootballdata.com/ratings/elo"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        data = response.json()
        print(f"Fetched Elo ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching Elo ratings: {e}")
        return []

def fetch_fpi_ratings(year):
    url = "https://api.collegefootballdata.com/ratings/fpi"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        data = response.json()
        print(f"Fetched FPI ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching FPI ratings: {e}")
        return []

def save_rankings(year, week):
    # Fetch data from all endpoints
    rankings_data = fetch_rankings(year, week)
    sp_data = fetch_sp_ratings(year)
    elo_data = fetch_elo_ratings(year)
    fpi_data = fetch_fpi_ratings(year)
    count = 0

    # Fetch all teams from Teams table
    cursor.execute("SELECT id, school FROM Teams WHERE year = ?", (year,))
    teams = {str(row[0]): row[1] for row in cursor.fetchall()}
    print(f"Teams from database: {teams}")

    # Initialize rankings dictionaries
    coaches_poll = {}
    ap_poll = {}
    sp_ratings = {}
    elo_ratings = {}
    fpi_ratings = {}

    # Process rankings data (Coaches Poll and AP Top 25)
    if rankings_data and isinstance(rankings_data, list) and len(rankings_data) > 0:
        for poll in rankings_data[0].get("polls", []):
            if poll["poll"] in ["Coaches Poll", "AP Top 25"]:
                for rank in poll["ranks"]:
                    team_id = str(rank["teamId"])
                    rank_value = str(rank["rank"])
                    school = rank["school"]
                    if poll["poll"] == "Coaches Poll":
                        coaches_poll[team_id] = rank_value
                    elif poll["poll"] == "AP Top 25":
                        ap_poll[team_id] = rank_value
                    print(f"Processed {poll['poll']} for teamId {team_id} ({school}): rank {rank_value}")

    # Process SP+ ratings data (match by team name)
    if sp_data and isinstance(sp_data, list):
        for team in sp_data:
            if team["year"] == year:
                team_name = team["team"]
                sp_ratings[team_name] = {
                    "SP_Ranking": team.get("ranking"),
                    "SP_Rating": team.get("rating"),
                    "SP_Off_Ranking": team.get("offense", {}).get("ranking"),
                    "SP_Off_Rating": team.get("offense", {}).get("rating"),
                    "SP_Def_Ranking": team.get("defense", {}).get("ranking"),
                    "SP_Def_Rating": team.get("defense", {}).get("rating")
                }
                print(f"Processed SP+ for team {team_name}: {sp_ratings[team_name]}")

    # Process Elo ratings data (match by team name)
    if elo_data and isinstance(elo_data, list):
        for team in elo_data:
            if team["year"] == year:
                team_name = team["team"]
                elo_ratings[team_name] = team.get("elo")
                print(f"Processed Elo for team {team_name}: {elo_ratings[team_name]}")

    # Process FPI ratings data (match by team name)
    if fpi_data and isinstance(fpi_data, list):
        for team in fpi_data:
            if team["year"] == year:
                team_name = team["team"]
                fpi_ratings[team_name] = {
                    "SOR": team.get("resumeRanks", {}).get("strengthOfRecord"),
                    "FPI_Ranking": team.get("resumeRanks", {}).get("fpi"),
                    "SOS": team.get("resumeRanks", {}).get("strengthOfSchedule")
                }
                print(f"Processed FPI for team {team_name}: {fpi_ratings[team_name]}")

    # Insert or update rankings for each team
    for team_id, school in teams.items():
        coaches_rank = coaches_poll.get(team_id, "NR")
        ap_rank = ap_poll.get(team_id, "NR")
        sp_data_team = sp_ratings.get(school, {})
        sp_ranking = sp_data_team.get("SP_Ranking", None)
        sp_rating = sp_data_team.get("SP_Rating", None)
        sp_off_ranking = sp_data_team.get("SP_Off_Ranking", None)
        sp_off_rating = sp_data_team.get("SP_Off_Rating", None)
        sp_def_ranking = sp_data_team.get("SP_Def_Ranking", None)
        sp_def_rating = sp_data_team.get("SP_Def_Rating", None)
        elo_rating = elo_ratings.get(school, None)
        fpi_data_team = fpi_ratings.get(school, {})
        sor = fpi_data_team.get("SOR", None)
        fpi_ranking = fpi_data_team.get("FPI_Ranking", None)
        sos = fpi_data_team.get("SOS", None)

        cursor.execute(
            """
            INSERT OR REPLACE INTO Teams_Rankings (
                teamId, year, week, school, coaches_poll_rank, ap_poll_rank,
                SP_Ranking, SP_Rating, SP_Off_Ranking, SP_Off_Rating, SP_Def_Ranking, SP_Def_Rating,
                ELO_Rating, SOR, FPI_Ranking, SOS
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                team_id, year, week, school, coaches_rank, ap_rank,
                sp_ranking, sp_rating, sp_off_ranking, sp_off_rating, sp_def_ranking, sp_def_rating,
                elo_rating, sor, fpi_ranking, sos
            )
        )
        count += cursor.rowcount
        print(f"Saved teamId {team_id} ({school}): Coaches={coaches_rank}, AP={ap_rank}, SP={sp_ranking}, ELO={elo_rating}, FPI={fpi_ranking}")

    print(f"Saved {count} team rankings for year {year}, week {week}")
    return count

def main():
    try:
        year = 2025
        week = 4
        save_rankings(year, week)
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()
        session.close()

if __name__ == "__main__":
    main()