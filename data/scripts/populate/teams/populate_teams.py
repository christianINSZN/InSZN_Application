import sqlite3
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Check if year is provided as command line argument
if len(sys.argv) != 2:
    print("Usage: python populate_teams.py <year>")
    sys.exit(1)
year = int(sys.argv[1])

# Check if table needs schema update (current PK is id, we need id, year)
cursor.execute("PRAGMA table_info(Teams)")
columns = cursor.fetchall()
current_pk = [col[1] for col in columns if col[5] == 1]
if current_pk == ['id']:  # If PK is only id, update schema
    # Step 1: Rename existing table
    cursor.execute("ALTER TABLE Teams RENAME TO Teams_old")
    # Step 2: Create new Teams table with composite PK and logo_main
    cursor.execute("""
        CREATE TABLE Teams (
            id INTEGER NOT NULL,
            school TEXT NOT NULL,
            abbreviation TEXT,
            mascot TEXT,
            alternateNames TEXT,
            conference TEXT,
            division TEXT,
            classification TEXT,
            color TEXT,
            alternateColor TEXT,
            logos TEXT,
            logo_main TEXT,  -- New column for first logo URL
            twitter TEXT,
            location TEXT,
            city TEXT,
            state TEXT,
            year INTEGER NOT NULL,
            PRIMARY KEY (id, year)
        )
    """)
    # Step 3: Migrate data from old table to new table
    cursor.execute("""
        INSERT OR IGNORE INTO Teams (
            id, school, abbreviation, mascot, alternateNames, conference, division,
            classification, color, alternateColor, logos, twitter, location, city, state, year
        )
        SELECT id, school, abbreviation, mascot, alternateNames, conference, division,
               classification, color, alternateColor, logos, twitter, location, city, state, year
        FROM Teams_old
    """)
    # Step 4: Drop old table
    cursor.execute("DROP TABLE Teams_old")

# Ensure table exists with correct schema, including logo_main
cursor.execute("""
CREATE TABLE IF NOT EXISTS Teams (
    id INTEGER NOT NULL,
    school TEXT NOT NULL,
    abbreviation TEXT,
    mascot TEXT,
    alternateNames TEXT,
    conference TEXT,
    division TEXT,
    classification TEXT,
    color TEXT,
    alternateColor TEXT,
    logos TEXT,
    logo_main TEXT,  -- New column for first logo URL
    twitter TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    year INTEGER NOT NULL,
    PRIMARY KEY (id, year)
)
""")

# Add logo_main column if not exists
cursor.execute("PRAGMA table_info(Teams)")
existing_columns = [col[1] for col in cursor.fetchall()]
if 'logo_main' not in existing_columns:
    cursor.execute("ALTER TABLE Teams ADD COLUMN logo_main TEXT")

# Update existing rows to populate logo_main from logos
cursor.execute("SELECT id, year, logos FROM Teams WHERE logos IS NOT NULL")
for row in cursor.fetchall():
    id, year, logos = row
    try:
        logos_array = json.loads(logos.replace("'", '"')) if logos else []
        logo_main = logos_array[0] if logos_array and len(logos_array) > 0 else None
        cursor.execute("UPDATE Teams SET logo_main = ? WHERE id = ? AND year = ?", (logo_main, id, year))
    except json.JSONDecodeError:
        print(f"Warning: Could not parse logos for team {id}, year {year}")
        cursor.execute("UPDATE Teams SET logo_main = NULL WHERE id = ? AND year = ?", (id, year))

# Fetch team data from API
url = "https://api.collegefootballdata.com/teams"
headers = {"Authorization": f"Bearer {API_KEY}"}
params = {"year": year}
try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    teams_data = response.json()
except requests.RequestException as e:
    print(f"Error fetching team data: {e}")
    conn.close()
    sys.exit(1)

# Populate Teams table with all teams
for team in teams_data:
    logos_array = team.get("logos", [])
    logo_main = logos_array[0] if logos_array and len(logos_array) > 0 else None
    cursor.execute("""
        INSERT OR IGNORE INTO Teams (
            id, school, abbreviation, mascot, alternateNames, conference, division,
            classification, color, alternateColor, logos, logo_main, twitter, location, city, state, year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        team.get("id", 0),
        team.get("school", "Unknown"),
        team.get("abbreviation", None),
        team.get("mascot", None),
        json.dumps(team.get("alternateNames", [])),
        team.get("conference", None),
        team.get("division", None),
        team.get("classification", None),
        team.get("color", None),
        team.get("alternateColor", None),
        json.dumps(logos_array),
        logo_main,
        team.get("twitter", None),
        json.dumps(team.get("location", {})),
        team.get("location", {}).get("city", None),
        team.get("location", {}).get("state", None),
        year
    ))

conn.commit()
conn.close()
print(f"Populated Teams table for year {year}")