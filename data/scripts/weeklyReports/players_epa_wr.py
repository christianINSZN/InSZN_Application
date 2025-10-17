import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import time

# Minimum rushing snaps threshold
MIN_RECEPTIONS = 10

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Alter Players_PPA_RB table to add teamID column if it doesn't exist
cursor.execute("PRAGMA table_info(Players_PPA_WR)")
columns = [col[1] for col in cursor.fetchall()]
if "teamID" not in columns:
    cursor.execute("ALTER TABLE Players_PPA_WR ADD COLUMN teamID TEXT")

# Create Players_PPA_RB table if it doesn't exist
cursor.execute("""
CREATE TABLE IF NOT EXISTS Players_PPA_WR (
    playerId TEXT NOT NULL,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    team TEXT NOT NULL,
    teamID TEXT,
    conference TEXT,
    averagePPA_all REAL,
    averagePPA_pass REAL,
    averagePPA_rush REAL,
    averagePPA_firstDown REAL,
    averagePPA_secondDown REAL,
    averagePPA_thirdDown REAL,
    averagePPA_standardDowns REAL,
    averagePPA_passingDowns REAL,
    totalPPA_all REAL,
    totalPPA_pass REAL,
    totalPPA_rush REAL,
    totalPPA_firstDown REAL,
    totalPPA_secondDown REAL,
    totalPPA_thirdDown REAL,
    totalPPA_standardDowns REAL,
    totalPPA_passingDowns REAL,
    min_passing_threshold_hit BOOLEAN,
    PRIMARY KEY (playerId, year)
)
""")

# Set up requests session with retries
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

def fetch_ppa_data(year, position):
    url = "https://api.collegefootballdata.com/ppa/players/season"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year, "position": position}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching PPA data: {e}")
        return []

def save_ppa_data(year, position):
    data = fetch_ppa_data(year, position)
    count = 0
    for player in data:
        # Fetch attempts and teamID from Players_RushingGrades_Season and Players_Basic
        cursor.execute(
            """
            SELECT prgs.receptions, pb.teamID
            FROM Players_ReceivingGrades_Season prgs
            LEFT JOIN Players_Basic pb ON prgs.playerId = pb.playerId AND prgs.year = pb.year
            WHERE prgs.playerId = ? AND prgs.year = ?
            """,
            (player["id"], year)
        )
        result = cursor.fetchone()
        attempts = result[0] if result and result[0] is not None else 0
        team_id = result[1] if result and result[1] is not None else None
        min_rushing_threshold_hit = attempts >= MIN_RECEPTIONS

        cursor.execute(
            """
            INSERT OR REPLACE INTO Players_PPA_WR (
                playerId, year, name, position, team, teamID, conference,
                averagePPA_all, averagePPA_pass, averagePPA_rush,
                averagePPA_firstDown, averagePPA_secondDown, averagePPA_thirdDown,
                averagePPA_standardDowns, averagePPA_passingDowns,
                totalPPA_all, totalPPA_pass, totalPPA_rush,
                totalPPA_firstDown, totalPPA_secondDown, totalPPA_thirdDown,
                totalPPA_standardDowns, totalPPA_passingDowns,
                min_passing_threshold_hit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                player["id"], player["season"], player["name"], player["position"],
                player["team"], team_id, player["conference"],
                player["averagePPA"]["all"], player["averagePPA"]["pass"], player["averagePPA"]["rush"],
                player["averagePPA"]["firstDown"], player["averagePPA"]["secondDown"], player["averagePPA"]["thirdDown"],
                player["averagePPA"]["standardDowns"], player["averagePPA"]["passingDowns"],
                player["totalPPA"]["all"], player["totalPPA"]["pass"], player["totalPPA"]["rush"],
                player["totalPPA"]["firstDown"], player["totalPPA"]["secondDown"], player["totalPPA"]["thirdDown"],
                player["totalPPA"]["standardDowns"], player["totalPPA"]["passingDowns"],
                min_rushing_threshold_hit
            )
        )
        count += cursor.rowcount
    print(f"Saved {count} PPA records for {position}, year {year}")
    return count

def main():
    try:
        year = 2025
        position = "WR"
        save_ppa_data(year, position)
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()
        session.close()

if __name__ == "__main__":
    main()