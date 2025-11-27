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
    ("SOS", "INTEGER"),
    ("record", "TEXT"),
    ("home_record", "TEXT"),
    ("away_record", "TEXT"),
    ("neutral_record", "TEXT"),
    ("quad1_record", "TEXT"),
    ("quad2_record", "TEXT"),
    ("quad3_record", "TEXT"),
    ("quad4_record", "TEXT"),
    ("conference", "TEXT"),
    ("logo", "TEXT")
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
    conference TEXT,
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
    record TEXT,
    home_record TEXT,
    away_record TEXT,
    neutral_record TEXT,
    quad1_record TEXT,
    quad2_record TEXT,
    quad3_record TEXT,
    quad4_record TEXT,
    logo TEXT,
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
        time.sleep(1)
        data = response.json()
        print(f"Fetched rankings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching rankings data: {e}")
        return []

def fetch_sp_ratings(year, week):
    url = "https://api.collegefootballdata.com/ratings/sp"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year, "week": week}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)
        data = response.json()
        print(f"Fetched SP+ ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching SP+ ratings: {e}")
        return []

def fetch_elo_ratings(year, week):
    url = "https://api.collegefootballdata.com/ratings/elo"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year, "week": week}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)
        data = response.json()
        print(f"Fetched Elo ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching Elo ratings: {e}")
        return []

def fetch_fpi_ratings(year, week):
    url = "https://api.collegefootballdata.com/ratings/fpi"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year, "week": week}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)
        data = response.json()
        print(f"Fetched FPI ratings: {data}")
        return data
    except requests.RequestException as e:
        print(f"Error fetching FPI ratings: {e}")
        return []

def calculate_team_record(team_id, year, week, school):
    cursor.execute(
        'SELECT id, season, week, seasonType, team, homeId, homePoints, awayId, awayPoints, neutralSite FROM Teams_Games WHERE (homeId = ? OR awayId = ?) AND season = ? AND week <= ? AND seasonType = ? AND completed = 1 AND team = ?',
        [team_id, team_id, year, week, 'regular', school]
    )
    games = cursor.fetchall()
    overall_wins = 0
    overall_losses = 0
    home_wins = 0
    home_losses = 0
    away_wins = 0
    away_losses = 0
    neutral_wins = 0
    neutral_losses = 0
    quad1_wins = 0
    quad1_losses = 0
    quad2_wins = 0
    quad2_losses = 0
    quad3_wins = 0
    quad3_losses = 0
    quad4_wins = 0
    quad4_losses = 0
    for game in games:
        game_id = game[0]
        game_week = game[2]
        is_home = game[5] == int(team_id)
        team_points = game[6] if is_home else game[8]
        opponent_points = game[8] if is_home else game[6]
        opponent_id = game[7] if is_home else game[5]
        neutral_site = game[9]
        if team_points is not None and opponent_points is not None:
            is_win = team_points > opponent_points
            is_loss = team_points < opponent_points
            if is_win:
                overall_wins += 1
            elif is_loss:
                overall_losses += 1
            if neutral_site:
                if is_win:
                    neutral_wins += 1
                elif is_loss:
                    neutral_losses += 1
            elif is_home:
                if is_win:
                    home_wins += 1
                elif is_loss:
                    home_losses += 1
            else:
                if is_win:
                    away_wins += 1
                elif is_loss:
                    away_losses += 1
            cursor.execute(
                'SELECT FPI_Ranking FROM Teams_Rankings WHERE teamId = ? AND year = ? AND week = ?',
                [opponent_id, year, game_week]
            )
            opponent_fpi = cursor.fetchone()
            if opponent_fpi and opponent_fpi[0]:
                fpi_rank = opponent_fpi[0]
                if 1 <= fpi_rank <= 30:
                    if is_win:
                        quad1_wins += 1
                    elif is_loss:
                        quad1_losses += 1
                elif 31 <= fpi_rank <= 60:
                    if is_win:
                        quad2_wins += 1
                    elif is_loss:
                        quad2_losses += 1
                elif 61 <= fpi_rank <= 90:
                    if is_win:
                        quad3_wins += 1
                    elif is_loss:
                        quad3_losses += 1
                elif fpi_rank >= 91:
                    if is_win:
                        quad4_wins += 1
                    elif is_loss:
                        quad4_losses += 1
            else:
                if is_win:
                    quad4_wins += 1
                elif is_loss:
                    quad4_losses += 1
    return {
        'overall': f"{overall_wins}-{overall_losses}",
        'home': f"{home_wins}-{home_losses}",
        'away': f"{away_wins}-{away_losses}",
        'neutral': f"{neutral_wins}-{neutral_losses}",
        'quad1': f"{quad1_wins}-{quad1_losses}",
        'quad2': f"{quad2_wins}-{quad2_losses}",
        'quad3': f"{quad3_wins}-{quad3_losses}",
        'quad4': f"{quad4_wins}-{quad4_losses}"
    }

def save_rankings(year, week):
    rankings_data = fetch_rankings(year, week)
    sp_data = fetch_sp_ratings(year, week)
    elo_data = fetch_elo_ratings(year, week)
    fpi_data = fetch_fpi_ratings(year, week)
    count = 0

    # DEBUG: Check if logo_main exists in Teams table
    cursor.execute("PRAGMA table_info(Teams)")
    teams_cols = [row[1] for row in cursor.fetchall()]
    print(f"DEBUG: Teams table columns: {teams_cols}")

    # Fetch logo map
    cursor.execute("SELECT id, logo_main FROM Teams WHERE year = ?", (year,))
    raw_logos = cursor.fetchall()
    logo_map = {str(row[0]): row[1] for row in raw_logos if row[1]}
    print(f"DEBUG: logo_map has {len(logo_map)} entries. Sample: {dict(list(logo_map.items())[:5])}")

    # Fetch teams
    cursor.execute("SELECT id, school, conference FROM Teams WHERE year = ?", (year,))
    teams = {str(row[0]): {'school': row[1], 'conference': row[2]} for row in cursor.fetchall()}

    coaches_poll = {}
    ap_poll = {}
    sp_ratings = {}
    elo_ratings = {}
    fpi_ratings = {}

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

    if elo_data and isinstance(elo_data, list):
        for team in elo_data:
            if team["year"] == year:
                team_name = team["team"]
                elo_ratings[team_name] = team.get("elo")

    if fpi_data and isinstance(fpi_data, list):
        for team in fpi_data:
            if team["year"] == year:
                team_name = team["team"]
                fpi_ratings[team_name] = {
                    "SOR": team.get("resumeRanks", {}).get("strengthOfRecord"),
                    "FPI_Ranking": team.get("resumeRanks", {}).get("fpi"),
                    "SOS": team.get("resumeRanks", {}).get("strengthOfSchedule")
                }

    for team_id, team_info in teams.items():
        school = team_info['school']
        conference = team_info['conference']
        logo_url = logo_map.get(team_id)
        print(f"DEBUG: team_id={team_id}, school={school}, logo_url={logo_url}")  # DEBUG per team

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
        records = calculate_team_record(team_id, year, week, school)

        cursor.execute(
            """
            INSERT OR REPLACE INTO Teams_Rankings (
                teamId, year, week, school, conference, coaches_poll_rank, ap_poll_rank,
                SP_Ranking, SP_Rating, SP_Off_Ranking, SP_Off_Rating, SP_Def_Ranking, SP_Def_Rating,
                ELO_Rating, SOR, FPI_Ranking, SOS, record, home_record, away_record, neutral_record,
                quad1_record, quad2_record, quad3_record, quad4_record, logo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                team_id, year, week, school, conference, coaches_rank, ap_rank,
                sp_ranking, sp_rating, sp_off_ranking, sp_off_rating, sp_def_ranking, sp_def_rating,
                elo_rating, sor, fpi_ranking, sos, records['overall'], records['home'], records['away'],
                records['neutral'], records['quad1'], records['quad2'], records['quad3'], records['quad4'], logo_url
            )
        )
        count += cursor.rowcount

    print(f"Saved {count} team rankings for year {year}, week {week}")
    return count

def main():
    try:
        year = 2025
        week = 14
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