import sqlite3
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load API key
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print("TEAMS_VENUES - POPULATION SCRIPT")
print("=" * 80)

# ============================================================================
# STEP 1: Create Teams_Venues table
# ============================================================================
print("\n[STEP 1] Creating Teams_Venues table...")

cursor.execute("DROP TABLE IF EXISTS Teams_Venues")

create_sql = """
CREATE TABLE Teams_Venues (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER,
    grass INTEGER,
    dome INTEGER,
    city TEXT,
    state TEXT,
    zip TEXT,
    country_code TEXT,
    timezone TEXT,
    latitude REAL,
    longitude REAL,
    elevation REAL,
    construction_year INTEGER
)
"""

cursor.execute(create_sql)
print("  ✓ Table created")

# ============================================================================
# STEP 2: Fetch and populate data
# ============================================================================
print("\n[STEP 2] Fetching venue data from API...")

BASE_URL = "https://api.collegefootballdata.com/venues"

try:
    # Make API request with authentication
    headers = {
        'Authorization': f'Bearer {API_KEY}'
    }
    
    print("  Making API request...")
    response = requests.get(BASE_URL, headers=headers)
    
    if response.status_code == 200:
        venues = response.json()
        print(f"  ✓ Retrieved {len(venues):,} venues")
        
        # Insert each venue
        inserted = 0
        errors = []
        
        for venue in venues:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO Teams_Venues (
                        id, name, capacity, grass, dome, city, state, zip,
                        country_code, timezone, latitude, longitude, elevation,
                        construction_year
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    venue.get('id'),
                    venue.get('name'),
                    venue.get('capacity'),
                    venue.get('grass'),
                    venue.get('dome'),
                    venue.get('city'),
                    venue.get('state'),
                    venue.get('zip'),
                    venue.get('countryCode'),
                    venue.get('timezone'),
                    venue.get('latitude'),
                    venue.get('longitude'),
                    venue.get('elevation'),
                    venue.get('constructionYear')
                ))
                inserted += 1
            except sqlite3.Error as e:
                errors.append(f"Error inserting venue {venue.get('id')} ({venue.get('name')}): {e}")
        
        conn.commit()
        print(f"  ✓ Inserted {inserted:,} venues")
        
        if errors:
            print(f"\n  ⚠ Errors: {len(errors)}")
            for error in errors[:5]:
                print(f"    - {error}")
    else:
        print(f"  ✗ API request failed with status {response.status_code}")
        print(f"    Response: {response.text}")

except requests.exceptions.RequestException as e:
    print(f"  ✗ Request error: {e}")
except Exception as e:
    print(f"  ✗ Unexpected error: {e}")

# ============================================================================
# STEP 3: Verification
# ============================================================================
print("\n" + "=" * 80)
print("VERIFICATION")
print("=" * 80)

# Overall stats
cursor.execute("""
    SELECT 
        COUNT(*) as total_venues,
        COUNT(CASE WHEN dome = 1 THEN 1 END) as domed_venues,
        COUNT(CASE WHEN grass = 1 THEN 1 END) as grass_venues,
        COUNT(CASE WHEN capacity IS NOT NULL THEN 1 END) as venues_with_capacity,
        AVG(capacity) as avg_capacity,
        MAX(capacity) as max_capacity
    FROM Teams_Venues
""")

stats = cursor.fetchone()
print(f"\nOverall Statistics:")
print(f"  Total venues: {stats[0]:,}")
print(f"  Domed venues: {stats[1]:,}")
print(f"  Grass venues: {stats[2]:,}")
print(f"  Venues with capacity data: {stats[3]:,}")
if stats[4]:
    print(f"  Average capacity: {stats[4]:,.0f}")
    print(f"  Largest capacity: {stats[5]:,}")

# Venues by state
cursor.execute("""
    SELECT state, COUNT(*) as venue_count
    FROM Teams_Venues
    WHERE state IS NOT NULL
    GROUP BY state
    ORDER BY venue_count DESC
    LIMIT 10
""")

print(f"\nTop 10 states by venue count:")
print("  State | Venues")
print("  " + "-" * 20)
for state, count in cursor.fetchall():
    print(f"  {state:5s} | {count:6d}")

# Largest stadiums
cursor.execute("""
    SELECT name, city, state, capacity, dome
    FROM Teams_Venues
    WHERE capacity IS NOT NULL
    ORDER BY capacity DESC
    LIMIT 10
""")

print(f"\nLargest stadiums:")
for name, city, state, capacity, dome in cursor.fetchall():
    dome_str = " (Dome)" if dome else ""
    location = f"{city}, {state}" if city and state else city or state or "Unknown"
    print(f"  {capacity:,} - {name} ({location}){dome_str}")

# Domed stadiums
cursor.execute("""
    SELECT name, city, state, capacity
    FROM Teams_Venues
    WHERE dome = 1
    ORDER BY capacity DESC
    LIMIT 5
""")

print(f"\nLargest domed stadiums:")
for name, city, state, capacity in cursor.fetchall():
    location = f"{city}, {state}" if city and state else city or state or "Unknown"
    cap_str = f"{capacity:,}" if capacity else "Unknown"
    print(f"  {cap_str} - {name} ({location})")

# Oldest stadiums (if data available)
cursor.execute("""
    SELECT name, city, state, construction_year, capacity
    FROM Teams_Venues
    WHERE construction_year IS NOT NULL
    ORDER BY construction_year ASC
    LIMIT 5
""")

oldest = cursor.fetchall()
if oldest:
    print(f"\nOldest stadiums:")
    for name, city, state, year, capacity in oldest:
        location = f"{city}, {state}" if city and state else city or state or "Unknown"
        cap_str = f"{capacity:,}" if capacity else "Unknown"
        print(f"  {year} - {name} ({location}) - Capacity: {cap_str}")

# Elevation extremes (if data available)
cursor.execute("""
    SELECT name, city, state, elevation, capacity
    FROM Teams_Venues
    WHERE elevation IS NOT NULL
    ORDER BY elevation DESC
    LIMIT 5
""")

highest = cursor.fetchall()
if highest:
    print(f"\nHighest elevation stadiums:")
    for name, city, state, elev, capacity in highest:
        location = f"{city}, {state}" if city and state else city or state or "Unknown"
        cap_str = f"{capacity:,}" if capacity else "Unknown"
        print(f"  {elev:,.0f} ft - {name} ({location}) - Capacity: {cap_str}")

conn.commit()
conn.close()

print("\n" + "=" * 80)
print("✓ POPULATION COMPLETE")
print("=" * 80)
print(f"Total venues inserted: {inserted:,}")
print(f"Table: Teams_Venues")
print("=" * 80)