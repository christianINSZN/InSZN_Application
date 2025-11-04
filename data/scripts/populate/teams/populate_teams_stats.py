import sqlite3
import os
import requests
import json
from pathlib import Path
import sys

# Configuration file path
CONFIG_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/config/config.json")

# Load configuration
try:
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)
    API_KEY = config.get("api_key", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
    YEARS = config.get("years", [2024])  # Default to [2024] if not specified
except FileNotFoundError:
    print(f"Error: Config file not found at {CONFIG_FILE}")
    sys.exit(1)
except json.JSONDecodeError:
    print(f"Error: Invalid JSON in config file at {CONFIG_FILE}")
    sys.exit(1)

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create Teams_Stats_Season table
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Stats_Season (
    season INTEGER NOT NULL,
    teamId INTEGER NOT NULL,
    school TEXT NOT NULL,
    conference TEXT,
    statName TEXT NOT NULL,
    statValue REAL,
    PRIMARY KEY (season, teamId, statName),
    FOREIGN KEY (teamId) REFERENCES Teams(id)
)
""")

# FBS conferences
FBS_CONFERENCES = [
    'ACC', 'American Athletic', 'Big 12', 'Big Ten', 'Conference USA',
    'FBS Independents', 'Mid-American', 'Mountain West', 'Pac-12', 'SEC', 'Sun Belt'
]

# Fetch teams from Teams table where conference is in FBS_CONFERENCES
cursor.execute("SELECT id, school, conference FROM Teams WHERE conference IN ({})".format(
    ','.join('?' for _ in FBS_CONFERENCES)), FBS_CONFERENCES)
teams = cursor.fetchall()

# Fetch and populate data for each year and team
BASE_URL = "https://api.collegefootballdata.com/stats/season"
headers = {"Authorization": f"Bearer {API_KEY}"}
for year in YEARS:
    for team_id, school, conference in teams:
        params = {"year": year, "team": school}
        try:
            response = requests.get(BASE_URL, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            stats_data = response.json()
            for stat in stats_data:
                cursor.execute("""
                    INSERT OR REPLACE INTO Teams_Stats_Season (season, teamId, school, conference, statName, statValue)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    stat["season"],
                    team_id,
                    stat["team"],
                    stat["conference"],
                    stat["statName"],
                    stat["statValue"]
                ))
            print(f"Populated stats for {school} in {year}")
        except requests.RequestException as e:
            print(f"Error fetching stats for {school} in {year}: {e}")
            continue

# Commit and close
conn.commit()
conn.close()
print(f"Populated Teams_Stats_Season table for years {', '.join(map(str, YEARS))}")