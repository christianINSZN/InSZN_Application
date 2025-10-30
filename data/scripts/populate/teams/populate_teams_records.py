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
    YEARS = config.get("years", [2025])  # Default to [2024] if not specified
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

# Create Teams_Records table if it doesn't exist (avoid DROP to preserve data)
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Records (
    year INTEGER NOT NULL,
    teamId INTEGER NOT NULL,
    team TEXT NOT NULL,
    classification TEXT,
    conference TEXT,
    division TEXT,
    expectedWins REAL,
    total_games INTEGER,
    total_wins INTEGER,
    total_losses INTEGER,
    total_ties INTEGER,
    conferenceGames_games INTEGER,
    conferenceGames_wins INTEGER,
    conferenceGames_losses INTEGER,
    conferenceGames_ties INTEGER,
    homeGames_games INTEGER,
    homeGames_wins INTEGER,
    homeGames_losses INTEGER,
    homeGames_ties INTEGER,
    awayGames_games INTEGER,
    awayGames_wins INTEGER,
    awayGames_losses INTEGER,
    awayGames_ties INTEGER,
    neutralSiteGames_games INTEGER,
    neutralSiteGames_wins INTEGER,
    neutralSiteGames_losses INTEGER,
    neutralSiteGames_ties INTEGER,
    regularSeason_games INTEGER,
    regularSeason_wins INTEGER,
    regularSeason_losses INTEGER,
    regularSeason_ties INTEGER,
    postseason_games INTEGER,
    postseason_wins INTEGER,
    postseason_losses INTEGER,
    postseason_ties INTEGER,
    PRIMARY KEY (year, teamId)
)
""")

# Fetch and populate data for each year
BASE_URL = "https://api.collegefootballdata.com/records"
headers = {"Authorization": f"Bearer {API_KEY}"}

for year in YEARS:
    params = {"year": year}
    try:
        response = requests.get(BASE_URL, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        records_data = response.json()
    except requests.RequestException as e:
        print(f"Error fetching team records data for year {year}: {e}")
        continue  # Skip to next year on error

    # Populate Teams_Records table for all teams
    for record in records_data:
        total = record.get("total", {})
        conferenceGames = record.get("conferenceGames", {})
        homeGames = record.get("homeGames", {})
        awayGames = record.get("awayGames", {})
        neutralSiteGames = record.get("neutralSiteGames", {})
        regularSeason = record.get("regularSeason", {})
        postseason = record.get("postseason", {})

        cursor.execute("""
            INSERT OR REPLACE INTO Teams_Records (
                year, teamId, team, classification, conference, division, expectedWins,
                total_games, total_wins, total_losses, total_ties,
                conferenceGames_games, conferenceGames_wins, conferenceGames_losses, conferenceGames_ties,
                homeGames_games, homeGames_wins, homeGames_losses, homeGames_ties,
                awayGames_games, awayGames_wins, awayGames_losses, awayGames_ties,
                neutralSiteGames_games, neutralSiteGames_wins, neutralSiteGames_losses, neutralSiteGames_ties,
                regularSeason_games, regularSeason_wins, regularSeason_losses, regularSeason_ties,
                postseason_games, postseason_wins, postseason_losses, postseason_ties
            ) VALUES (?, ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?,
                      ?, ?, ?, ?)
        """, (
            year,
            record.get("teamId", 0),
            record.get("team", "Unknown"),
            record.get("classification", None),
            record.get("conference", None),
            record.get("division", None),
            record.get("expectedWins", 0.0),
            total.get("games", 0),
            total.get("wins", 0),
            total.get("losses", 0),
            total.get("ties", 0),
            conferenceGames.get("games", 0),
            conferenceGames.get("wins", 0),
            conferenceGames.get("losses", 0),
            conferenceGames.get("ties", 0),
            homeGames.get("games", 0),
            homeGames.get("wins", 0),
            homeGames.get("losses", 0),
            homeGames.get("ties", 0),
            awayGames.get("games", 0),
            awayGames.get("wins", 0),
            awayGames.get("losses", 0),
            awayGames.get("ties", 0),
            neutralSiteGames.get("games", 0),
            neutralSiteGames.get("wins", 0),
            neutralSiteGames.get("losses", 0),
            neutralSiteGames.get("ties", 0),
            regularSeason.get("games", 0),
            regularSeason.get("wins", 0),
            regularSeason.get("losses", 0),
            regularSeason.get("ties", 0),
            postseason.get("games", 0),
            postseason.get("wins", 0),
            postseason.get("losses", 0),
            postseason.get("ties", 0)
        ))

# Commit and close
conn.commit()
conn.close()

print(f"Populated Teams_Records table for years {', '.join(map(str, YEARS))}")