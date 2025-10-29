#!/usr/bin/env python3
"""
Single script:
1. Create Players_TransferPortal table
2. Fetch & insert 2025 portal data
3. Enrich with Players_Basic (optional)
4. Add originLogo & destinationLogo from Teams (school name → logo_main)
   → BOTH origin & destination use same logic
"""

import sqlite3
import os
import requests
import re
from pathlib import Path
from dotenv import load_dotenv
from fuzzywuzzy import fuzz

# Load environment
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
YEAR = int(os.getenv("YEAR", 2025))
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")

# -----------------------------------------------------------------------
# Helper: Normalize string
# -----------------------------------------------------------------------
def normalize(s):
    return re.sub(r'[^a-z0-9]', '', str(s).lower().strip()) if s else ""

def clean_name(s):
    return re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', s, flags=re.I).strip()

# Connect
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# -----------------------------------------------------------------------
# 1. Create table
# -----------------------------------------------------------------------
print("Creating Players_TransferPortal table...")
create_table_sql = """
CREATE TABLE IF NOT EXISTS Players_TransferPortal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    origin TEXT,
    destination TEXT,
    transferDate TEXT,
    rating REAL,
    stars INTEGER,
    eligibility TEXT,
    playerId INTEGER,
    team TEXT,
    school TEXT,
    teamID INTEGER,
    height INTEGER,
    weight INTEGER,
    homeCity TEXT,
    homeState TEXT,
    homeCountry TEXT,
    homeProvince TEXT,
    homeLatitude REAL,
    homeLongitude REAL,
    jersey TEXT,
    redshirt TEXT,
    player_id_PFF TEXT,
    headshotURL TEXT,
    originLogo TEXT,
    destinationLogo TEXT,
    UNIQUE(season, name, origin)
);
"""
cursor.execute(create_table_sql)
conn.commit()

# -----------------------------------------------------------------------
# 2. Fetch portal data
# -----------------------------------------------------------------------
print(f"Fetching transfer portal data for {YEAR}...")
url = "https://api.collegefootballdata.com/player/portal"
headers = {"Authorization": f"Bearer {API_KEY}"}
params = {"year": YEAR}

try:
    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    portal_data = response.json()
    print(f"Received {len(portal_data)} transfer records.")
except requests.RequestException as e:
    print(f"Error fetching portal data: {e}")
    conn.close()
    exit(1)

if not portal_data:
    print("No transfer data returned.")
    conn.close()
    exit(0)

# -----------------------------------------------------------------------
# 3. Insert portal data
# -----------------------------------------------------------------------
insert_portal_sql = """
INSERT OR IGNORE INTO Players_TransferPortal 
(season, name, position, origin, destination, transferDate, rating, stars, eligibility)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

portal_values = []
for p in portal_data:
    first = p.get("firstName", "").strip()
    last = p.get("lastName", "").strip()
    name = f"{first} {last}".strip()
    if not name:
        continue
    portal_values.append((
        p.get("season"),
        name,
        p.get("position"),
        p.get("origin"),
        p.get("destination"),
        p.get("transferDate"),
        p.get("rating"),
        p.get("stars"),
        p.get("eligibility")
    ))

if portal_values:
    print(f"Inserting {len(portal_values)} portal records...")
    cursor.executemany(insert_portal_sql, portal_values)
    conn.commit()
    print(f"Inserted {cursor.rowcount} new portal records.")
else:
    print("No valid portal records to insert.")

# -----------------------------------------------------------------------
# 4. Load Teams for logos (school → logo_main)
# -----------------------------------------------------------------------
print("Loading Teams for logo lookup...")
cursor.execute("SELECT school, logo_main FROM Teams WHERE year = ?", (YEAR,))
teams_rows = cursor.fetchall()

team_logo_by_school = {}
for school, logo in teams_rows:
    if school:
        key = normalize(school)
        team_logo_by_school[key] = logo
        print(f"Logo mapped: {school} → {key} → {logo}")  # DEBUG

# -----------------------------------------------------------------------
# 5. Load Players_Basic for metadata (optional)
# -----------------------------------------------------------------------
print("Loading Players_Basic for metadata enrichment...")
cursor.execute("""
SELECT playerId, year, name, team, school, teamID, position, height, weight,
       homeCity, homeState, homeCountry, homeProvince,
       homeLatitude, homeLongitude, jersey, redshirt,
       player_id_PFF, headshotURL
FROM Players_Basic
WHERE year IN (?, ?)
""", (YEAR, YEAR - 1))

basic_rows = cursor.fetchall()
print(f"Loaded {len(basic_rows)} Players_Basic rows.")

# -----------------------------------------------------------------------
# 6. Fuzzy match Players_Basic
# -----------------------------------------------------------------------
basic_by_school = {YEAR: {}, YEAR - 1: {}}
for row in basic_rows:
    (
        playerId, y, name, team, school, teamID, pos, height, weight,
        homeCity, homeState, homeCountry, homeProvince,
        homeLat, homeLng, jersey, redshirt, pff_id, headshot
    ) = row

    if not name or not school:
        continue

    n_school = normalize(school)
    clean_n = clean_name(name)
    n_name = normalize(clean_n)

    year_dict = basic_by_school[y]
    school_list = year_dict.setdefault(n_school, [])
    school_list.append((
        n_name,
        {
            "playerId": playerId,
            "team": team,
            "school": school,
            "teamID": teamID,
            "position": pos,
            "height": height,
            "weight": weight,
            "homeCity": homeCity,
            "homeState": homeState,
            "homeCountry": homeCountry,
            "homeProvince": homeProvince,
            "homeLatitude": homeLat,
            "homeLongitude": homeLng,
            "jersey": jersey,
            "redshirt": redshirt,
            "player_id_PFF": pff_id,
            "headshotURL": headshot
        }
    ))

# -----------------------------------------------------------------------
# 7. Enrich: Players_Basic + Logos (both from school name)
# -----------------------------------------------------------------------
print("Starting enrichment with Players_Basic + Team Logos...")
cursor.execute("""
SELECT id, name, origin, destination, season
FROM Players_TransferPortal 
WHERE season = ?
""", (YEAR,))

to_enrich = cursor.fetchall()
print(f"Found {len(to_enrich)} portal entries to enrich.")

update_sql = """
UPDATE Players_TransferPortal
SET
    playerId = ?, team = ?, school = ?, teamID = ?, position = ?, height = ?, weight = ?,
    homeCity = ?, homeState = ?, homeCountry = ?, homeProvince = ?,
    homeLatitude = ?, homeLongitude = ?, jersey = ?, redshirt = ?,
    player_id_PFF = ?, headshotURL = ?,
    originLogo = ?, destinationLogo = ?
WHERE id = ?
"""

updates = []
match_count = 0
miss_count = 0

for pid, p_name, origin, dest, season in to_enrich:
    clean_p = clean_name(p_name)
    n_p_name = normalize(clean_p)
    match = None
    match_score = 0

    # CASE 1: destination → current year
    if dest:
        n_dest = normalize(dest)
        candidates = basic_by_school.get(season, {}).get(n_dest, [])
        for n_name, data in candidates:
            score = fuzz.ratio(n_p_name, n_name)
            if score >= 90 and score > match_score:
                match = data
                match_score = score
            elif score >= 80 and score > match_score and not match:
                match = data
                match_score = score

    # CASE 2: no destination → origin + prev year
    if not match and origin:
        prev_year = season - 1
        n_origin = normalize(origin)
        candidates = basic_by_school.get(prev_year, {}).get(n_origin, [])
        for n_name, data in candidates:
            score = fuzz.ratio(n_p_name, n_name)
            if score >= 90 and score > match_score:
                match = data
                match_score = score
            elif score >= 80 and score > match_score and not match:
                match = data
                match_score = score

    # Resolve logos — SAME LOGIC FOR BOTH
    origin_key = normalize(origin)
    dest_key = normalize(dest)

    origin_logo = team_logo_by_school.get(origin_key)
    destination_logo = team_logo_by_school.get(dest_key)

    print(f"LOGO LOOKUP: origin='{origin}' → '{origin_key}' → {origin_logo}")
    print(f"LOGO LOOKUP: dest='{dest}' → '{dest_key}' → {destination_logo}")

    if match:
        updates.append((
            match["playerId"],
            match["team"],
            match["school"],
            match["teamID"],
            match["position"],
            match["height"],
            match["weight"],
            match["homeCity"],
            match["homeState"],
            match["homeCountry"],
            match["homeProvince"],
            match["homeLatitude"],
            match["homeLongitude"],
            match["jersey"],
            match["redshirt"],
            match["player_id_PFF"],
            match["headshotURL"],
            origin_logo,
            destination_logo,
            pid
        ))
        match_count += 1
    else:
        updates.append((
            None, None, None, None, None, None, None,
            None, None, None, None, None, None, None, None,
            None, None,
            origin_logo, destination_logo,
            pid
        ))
        miss_count += 1

# -----------------------------------------------------------------------
# 8. Apply updates
# -----------------------------------------------------------------------
if updates:
    print(f"Updating {len(updates)} records with metadata + logos...")
    cursor.executemany(update_sql, updates)
    conn.commit()
    print(f"Updated {cursor.rowcount} rows.")
else:
    print("No updates needed.")

# -----------------------------------------------------------------------
# 9. Final Summary
# -----------------------------------------------------------------------
print("\n" + "="*60)
print("TRANSFER PORTAL + LOGOS COMPLETE")
print("="*60)
print(f"Year: {YEAR}")
print(f"Portal Records: {len(portal_data)}")
print(f"Inserted: {len(portal_values) if 'portal_values' in locals() else 0}")
print(f"Matched (player): {match_count}")
print(f"Logos Added: {len([u for u in updates if u[-3] or u[-2]])}")
print("="*60)

conn.close()
print("Done. Table ready: Players_TransferPortal (with originLogo + destinationLogo)")