import sqlite3
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create Teams_Ratings_SP table with teamID
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams_Ratings_SP (
    year INTEGER,
    team TEXT,
    conference TEXT,
    rating REAL,
    ranking INTEGER,
    secondOrderWins REAL,
    sos REAL,
    offense_ranking INTEGER,
    offense_rating REAL,
    defense_ranking INTEGER,
    defense_rating REAL,
    specialTeams_rating REAL,
    teamID INTEGER,  -- New column for team ID from Teams table
    PRIMARY KEY (year, team),
    FOREIGN KEY (teamID) REFERENCES Teams(id)
)
""")

# Fetch SP+ ratings from API with fallback to previous years and debug logging
years_to_try = [int(os.getenv("YEAR", 2024)), 2023, 2022]  # Try 2024, then 2023, then 2022
sp_data = None

for year in years_to_try:
    url = "https://api.collegefootballdata.com/ratings/sp"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year}
    try:
        # Log the full request URL for debugging
        request_url = requests.Request('GET', url, headers=headers, params=params).prepare().url
        print(f"Attempting to fetch SP+ data from: {request_url}")
        response = requests.get(url, headers=headers, params=params, timeout=20)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        sp_data = response.json()
        print(f"Successfully fetched SP+ data for year {year}")
        break
    except requests.exceptions.HTTPError as e:
        error_response = e.response.text if e.response is not None else str(e)
        print(f"HTTP Error fetching SP+ data for year {year}: {e} - Response: {error_response}")
        if year == years_to_try[0]:  # If 2024 failed, try next year
            continue
        else:  # If all years fail
            print("Failed to fetch SP+ data for all attempted years. Check API key or endpoint availability.")
            conn.close()
            exit(1)
    except requests.exceptions.RequestException as e:
        print(f"Request Error fetching SP+ data for year {year}: {e}")
        if year == years_to_try[0]:
            continue
        else:
            print("Failed to fetch SP+ data for all attempted years. Check network or API status.")
            conn.close()
            exit(1)

# Populate Teams_Ratings_SP table with initial data
if sp_data:
    for team_data in sp_data:
        cursor.execute("""
            INSERT OR REPLACE INTO Teams_Ratings_SP (year, team, conference, rating, ranking, secondOrderWins, sos,
                                                   offense_ranking, offense_rating, defense_ranking, defense_rating,
                                                   specialTeams_rating, teamID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)  -- teamID set to NULL initially
        """, (
            team_data.get("year"),
            team_data.get("team"),
            team_data.get("conference"),
            team_data.get("rating"),
            team_data.get("ranking"),
            team_data.get("secondOrderWins"),
            team_data.get("sos"),
            team_data.get("offense", {}).get("ranking"),
            team_data.get("offense", {}).get("rating"),
            team_data.get("defense", {}).get("ranking"),
            team_data.get("defense", {}).get("rating"),
            team_data.get("specialTeams", {}).get("rating")
        ))

    conn.commit()
    print("Teams_Ratings_SP table populated with initial data.")

    # Populate teamID by matching team to Teams table
    updated_count = 0
    cursor.execute("""
        UPDATE Teams_Ratings_SP
        SET teamID = (
            SELECT t.id
            FROM Teams t
            WHERE t.school = team
              AND t.year = year
            LIMIT 1
        )
        WHERE teamID IS NULL
    """)
    updated_count = cursor.rowcount
    print(f"Updated {updated_count} records with teamID from Teams table.")

    conn.commit()
    print("Teams_Ratings_SP table fully populated with teamID.")
else:
    print("No SP+ data to populate. Exiting.")
    conn.close()
    exit(1)

conn.close()