import sqlite3
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("TEAMS POPULATION SCRIPT - YEARS 2021-2025")
print("=" * 80)

# ============================================================================
# STEP 1: Update Teams table schema
# ============================================================================
print("\n[STEP 1] Updating Teams table schema...")

# Drop existing table to recreate with new columns
cursor.execute("DROP TABLE IF EXISTS Teams_backup")
cursor.execute("CREATE TABLE Teams_backup AS SELECT * FROM Teams")
print("  ✓ Backed up existing Teams table")

cursor.execute("DROP TABLE IF EXISTS Teams")

create_sql = """
CREATE TABLE Teams (
    id INTEGER PRIMARY KEY,
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
    logo_main TEXT,
    twitter TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    year INTEGER,
    
    -- New location/venue fields
    venue_id INTEGER,
    venue_name TEXT,
    venue_city TEXT,
    venue_state TEXT,
    venue_zip TEXT,
    venue_country_code TEXT,
    venue_timezone TEXT,
    latitude REAL,
    longitude REAL,
    elevation TEXT,
    venue_capacity INTEGER,
    venue_construction_year INTEGER,
    venue_grass INTEGER,
    venue_dome INTEGER
)
"""

cursor.execute(create_sql)
print("  ✓ Created updated Teams table with location fields")

# ============================================================================
# STEP 2: Fetch and populate data
# ============================================================================

# Process years 2021-2025
years_to_process = [2021, 2022, 2023, 2024, 2025]
total_inserted = 0

for year in years_to_process:
    print(f"\n{'='*80}")
    print(f"PROCESSING YEAR {year}")
    print(f"{'='*80}")
    
    # Fetch team data from API
    print(f"\n[API] Fetching team data for {year}...")
    url = "https://api.collegefootballdata.com/teams"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"year": year}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        teams_data = response.json()
        print(f"  ✓ Fetched {len(teams_data)} teams")
    except requests.RequestException as e:
        print(f"  ✗ Error fetching team data: {e}")
        continue
    
    # Populate Teams table with all teams
    print(f"\n[DATABASE] Inserting teams for {year}...")
    inserted_count = 0
    
    for team in teams_data:
        logos_array = team.get("logos", [])
        logo_main = logos_array[0] if logos_array and len(logos_array) > 0 else None
        
        # Extract location data
        location = team.get("location", {})
        
        cursor.execute("""
            INSERT OR IGNORE INTO Teams (
                id, school, abbreviation, mascot, alternateNames, conference, division,
                classification, color, alternateColor, logos, logo_main, twitter, 
                location, city, state, year,
                venue_id, venue_name, venue_city, venue_state, venue_zip, 
                venue_country_code, venue_timezone, latitude, longitude, elevation,
                venue_capacity, venue_construction_year, venue_grass, venue_dome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            json.dumps(location),
            location.get("city", None),
            location.get("state", None),
            year,
            # New location/venue fields
            location.get("id", None),
            location.get("name", None),
            location.get("city", None),
            location.get("state", None),
            location.get("zip", None),
            location.get("countryCode", None),
            location.get("timezone", None),
            location.get("latitude", None),
            location.get("longitude", None),
            location.get("elevation", None),
            location.get("capacity", None),
            location.get("constructionYear", None),
            location.get("grass", None),
            location.get("dome", None)
        ))
        inserted_count += cursor.rowcount
    
    print(f"  ✓ Inserted {inserted_count} new teams for {year}")
    total_inserted += inserted_count
    
    # Commit after each year
    conn.commit()
    
    # Rate limiting - be nice to the API
    if year != years_to_process[-1]:  # Don't sleep after last year
        print(f"  Waiting 2 seconds before next API call...")
        time.sleep(2)

# ============================================================================
# STEP 3: Verification
# ============================================================================
print(f"\n{'='*80}")
print("VERIFICATION")
print(f"{'='*80}")

# Overall stats
cursor.execute("""
    SELECT 
        COUNT(*) as total_teams,
        COUNT(DISTINCT school) as unique_schools,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as teams_with_coords,
        COUNT(CASE WHEN venue_dome = 1 THEN 1 END) as teams_with_dome,
        COUNT(CASE WHEN venue_grass = 1 THEN 1 END) as teams_with_grass
    FROM Teams
""")

stats = cursor.fetchone()
print(f"\nOverall Statistics:")
print(f"  Total team-year records: {stats[0]:,}")
print(f"  Unique schools: {stats[1]:,}")
print(f"  Teams with coordinates: {stats[2]:,}")
print(f"  Teams with domed stadiums: {stats[3]:,}")
print(f"  Teams with grass fields: {stats[4]:,}")

# Teams by year
cursor.execute("""
    SELECT year, COUNT(*) as team_count,
           COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coords
    FROM Teams
    GROUP BY year
    ORDER BY year
""")

print(f"\nTeams by year:")
print("  Year | Teams | With Coords")
print("  " + "-" * 35)
for year, count, coords in cursor.fetchall():
    print(f"  {year} | {count:5d} | {coords:11d}")

# Sample teams with full location data
cursor.execute("""
    SELECT school, venue_name, venue_city, venue_state, latitude, longitude, 
           venue_capacity, venue_dome
    FROM Teams
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY venue_capacity DESC
    LIMIT 10
""")

print(f"\nSample teams with location data (largest stadiums):")
for school, venue, city, state, lat, lon, cap, dome in cursor.fetchall():
    dome_str = " (Dome)" if dome else ""
    location = f"{city}, {state}" if city and state else "Unknown"
    print(f"  {school}: {venue} ({location}){dome_str}")
    print(f"    Capacity: {cap:,} | Coords: ({lat:.4f}, {lon:.4f})")

# Check for teams missing coordinates
cursor.execute("""
    SELECT school, year, venue_name
    FROM Teams
    WHERE latitude IS NULL OR longitude IS NULL
    GROUP BY school
    LIMIT 10
""")

missing = cursor.fetchall()
if missing:
    print(f"\nTeams missing coordinates (sample):")
    for school, year, venue in missing:
        venue_str = f" - {venue}" if venue else ""
        print(f"  {school} ({year}){venue_str}")

# Final commit and close
conn.commit()
conn.close()

print(f"\n{'='*80}")
print(f"✓ POPULATION COMPLETE")
print(f"{'='*80}")
print(f"Total teams inserted: {total_inserted}")
print(f"Years processed: {', '.join(map(str, years_to_process))}")
print(f"{'='*80}")