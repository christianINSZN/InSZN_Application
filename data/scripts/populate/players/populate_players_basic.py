import sqlite3
import os
import json
from pathlib import Path
from dotenv import load_dotenv
import requests
from fuzzywuzzy import fuzz
import csv
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Check and add headshotURL column if it doesn't exist
cursor.execute("PRAGMA table_info(Players_Basic)")
columns = [column[1] for column in cursor.fetchall()]
if 'headshotURL' not in columns:
    cursor.execute("ALTER TABLE Players_Basic ADD COLUMN headshotURL TEXT")

# Create Players_Basic table with original columns (will be skipped if table exists)
cursor.execute("""
CREATE TABLE IF NOT EXISTS Players_Basic (
    playerId TEXT NOT NULL,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    school TEXT,
    teamID INTEGER,
    position TEXT,
    height INTEGER,
    weight INTEGER,
    homeCity TEXT,
    homeState TEXT,
    homeCountry TEXT,
    homeProvince TEXT,
    homeLatitude REAL,
    homeLongitude REAL,
    jersey TEXT,
    redshirt BOOLEAN,
    player_id_PFF TEXT,
    PRIMARY KEY (playerId, year),
    FOREIGN KEY (teamID) REFERENCES Teams(id)
)
""")

# Set up requests session with retries
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))

def fetch_team_roster(team, year):
    url = "https://api.collegefootballdata.com/roster"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    params = {"team": team, "year": year}
    try:
        response = session.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        time.sleep(1)  # Rate limit delay
        return response.json()
    except (requests.RequestException, ValueError):
        print(f"No roster data for {team}, year {year}")
        return []

def fetch_team_id(team_name, year):
    """Fetch team ID from Teams table based on school (lowercase match)."""
    cursor.execute("SELECT id FROM Teams WHERE LOWER(school) = ? AND year = ?", (team_name.lower(), year))
    result = cursor.fetchone()
    return result[0] if result else None

def fetch_headshot_url(player_id):
    """Fetch headshot URL for a given playerId."""
    headshot_url = f"https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/{player_id}.png&w=350&h=254"
    try:
        response = session.head(headshot_url, timeout=5)
        response.raise_for_status()
        return headshot_url
    except requests.RequestException:
        return None

def attach_pff_ids(team, year):
    # Manual team mapping from API to PFF
    team_mapping = {
        "auburn": "AUBURN",
        "uab": "UAB",
        "south alabama": "S ALABAMA",
        "missouri state": "MO STATE",
        "delaware": "DELAWARE",
        "arkansas": "ARKANSAS",
        "arizona state": "ARIZONA ST",
        "arizona": "ARIZONA",
        "north carolina": "N CAROLINA",
        "jacksonville state": "JVILLE ST",
        "san josé state": "S JOSE ST",
        "stanford": "STANFORD",
        "california": "CAL",
        "ucla": "UCLA",
        "usc": "USC",
        "colorado state": "COLO STATE",
        "colorado": "COLORADO",
        "uconn": "UCONN",
        "florida state": "FLORIDA ST",
        "florida international": "FIU",
        "florida": "FLORIDA",
        "wake forest": "WAKE",
        "georgia tech": "GA TECH",
        "georgia": "GEORGIA",
        "hawai'i": "HAWAII",
        "iowa state": "IOWA STATE",
        "boise state": "BOISE ST",
        "northwestern": "NWESTERN",
        "indiana": "INDIANA",
        "notre dame": "NOTRE DAME",
        "kentucky": "KENTUCKY",
        "louisville": "LOUISVILLE",
        "western kentucky": "W KENTUCKY",
        "lsu": "LSU",
        "boston college": "BOSTON COL",
        "massachusetts": "UMASS",
        "maryland": "MARYLAND",
        "michigan state": "MICH STATE",
        "michigan": "MICHIGAN",
        "minnesota": "MINNESOTA",
        "missouri": "MISSOURI",
        "ole miss": "OLE MISS",
        "duke": "DUKE",
        "east carolina": "E CAROLINA",
        "nc state": "NC STATE",
        "pittsburgh": "PITTSBURGH",
        "nebraska": "NEBRASKA",
        "south carolina": "S CAROLINA",
        "new mexico state": "NEW MEX ST",
        "new mexico": "NEW MEXICO",
        "syracuse": "SYRACUSE",
        "bowling green": "BOWL GREEN",
        "miami (oh)": "MIAMI OH",
        "baylor": "BAYLOR",
        "ohio state": "OHIO STATE",
        "ohio": "OHIO",
        "oklahoma state": "OKLA STATE",
        "oklahoma": "OKLAHOMA",
        "tulsa": "TULSA",
        "oregon state": "OREGON ST",
        "penn state": "PENN STATE",
        "temple": "TEMPLE",
        "clemson": "CLEMSON",
        "memphis": "MEMPHIS",
        "vanderbilt": "VANDERBILT",
        "rice": "RICE",
        "texas a&m": "TEXAS A&M",
        "houston": "HOUSTON",
        "miami": "MIAMI FL",
        "north texas": "N TEXAS",
        "texas": "TEXAS",
        "byu": "BYU",
        "utah": "UTAH",
        "james madison": "JAMES MAD",
        "virginia": "VIRGINIA",
        "virginia tech": "VA TECH",
        "washington": "WASHINGTON",
        "washington state": "WASH STATE",
        "wisconsin": "WISCONSIN",
        "marshall": "MARSHALL",
        "west virginia": "W VIRGINIA",
        "fresno state": "FRESNO ST",
        "georgia southern": "GA SOUTHRN",
        "old dominion": "DOMINION",
        "louisiana": "LA LAFAYET",
        "coastal carolina": "COAST CAR",
        "texas state": "TEXAS ST",
        "utah state": "UTAH ST",
        "alabama": "ALABAMA",
        "kennesaw state": "KENNESAW",
        "mississippi state": "MISS STATE",
        "army": "ARMY",
        "illinois": "ILLINOIS",
        "air force": "AIR FORCE",
        "akron": "AKRON",
        "app state": "APP STATE",
        "arkansas state": "ARK STATE",
        "ball state": "BALL ST",
        "buffalo": "BUFFALO",
        "ucf": "UCF",
        "central michigan": "C MICHIGAN",
        "cincinnati": "CINCINNATI",
        "eastern michigan": "E MICHIGAN",
        "florida atlantic": "FAU",
        "fiu": "FIU",
        "georgia state": "GA STATE",
        "iowa": "IOWA",
        "kansas": "KANSAS",
        "kansas state": "KANSAS ST",
        "kent state": "KENT STATE",
        "liberty": "LIBERTY",
        "louisiana tech": "LA TECH",
        "middle tennessee": "MIDDLE TN",
        "navy": "NAVY",
        "charlotte": "CHARLOTTE",
        "ul monroe": "LA MONROE",
        "unlv": "UNLV",
        "nevada": "NEVADA",
        "northern illinois": "N ILLINOIS",
        "oregon": "OREGON",
        "purdue": "PURDUE",
        "sam houston": "SM HOUSTON",
        "smu": "SMU",
        "southern miss": "SO MISS",
        "tcu": "TCU",
        "tennessee": "TENNESSEE",
        "utsa": "UTSA",
        "utep": "UTEP",
        "texas tech": "TEXAS TECH",
        "toledo": "TOLEDO",
        "troy": "TROY",
        "tulane": "TULANE",
        "western michigan": "W MICHIGAN",
        "wyoming": "WYOMING",
        "rutgers": "RUTGERS", 
        "san diego state": "S DIEGO ST",
        "south florida": "USF"
    }

    csv_paths = [
        Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Rushing/SeasonReports/{year}_RushingGrades.csv"),
        Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Passing/SeasonReports/{year}_PassingGrades.csv"),
        Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Receiving/SeasonReports/{year}_ReceivingGrades.csv"),
        Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Blocking/SeasonReports/{year}_BlockingGrades.csv"),
        Path(f"/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/PFF_Data/Defense/SeasonReports/{year}_DefenseGrades.csv")
    ]
    position_aliases = {
        "hb": ["rb", "hb"],
        "rb": ["rb", "hb"],
        "ol": ["ol", "c", "g", "t", "og", "ot"],
        "c": ["c", "ol"], "g": ["g", "ol", "og"],
        "t": ["t", "ol", "ot"], "og": ["og", "g", "ol"],
        "ot": ["ot", "t", "ol"],
        "qb": ["qb"],
        "wr": ["wr"],
        "te": ["te"],
        "fb": ["fb"],
        "lb": ["lb", "ilb", "olb"],
        "ilb": ["ilb", "lb"],
        "olb": ["olb", "lb"],
        "s": ["s", "fs", "ss"],
        "fs": ["fs", "s"],
        "ss": ["ss", "s"],
        "cb": ["cb"],
        "db": ["db", "cb", "s"],
        "de": ["ed"],
        "dt": ["dt", "di"],
        "dl": ["dl", "de", "dt", "di"],
        "k": ["k"],
        "p": ["p"],
        "edge": ["ed"]
    }
    pff_data = {}
    used_pff_ids = set()
    for csv_path in csv_paths:
        if not csv_path.exists():
            print(f"CSV not found: {csv_path}")
            continue
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            if not {"player", "team_name", "player_id", "position"}.issubset(reader.fieldnames):
                print(f"Invalid CSV format in {csv_path}: missing required columns")
                continue
            for row in reader:
                player_name = tuple(row.get("player").lower().strip().replace(".", "").replace("'", "").replace("-", " ").replace("jr", "").replace("sr", "").replace("ii", "").replace("iii", "").replace("dj ", "d j ").replace("aj ", "a j ").replace("ollie ", "o ").split())
                player_id = row.get("player_id")
                team_name = row.get("team_name", "").lower().strip()
                position = row.get("position").lower().strip()
                if player_name and player_id and position and team_name:
                    # Map PFF team name to API team name
                    pff_team_mapped = next((api_team for api_team, pff_team in team_mapping.items() if pff_team.lower() == team_name.lower()), team_name)
                    pff_data[(player_name, pff_team_mapped.lower(), position)] = player_id

    cursor.execute("SELECT playerId, name, team, year, position, player_id_PFF FROM Players_Basic WHERE year = ? AND team = ?", (year, team.lower()))
    matched_count = 0
    for player_id, name, team_db, year, player_position, current_pff_id in cursor.fetchall():
        name_normalized = tuple(name.lower().strip().replace(".", "").replace("'", "").replace("-", " ").replace("jr", "").replace("sr", "").replace("ii", "").replace("iii", "").replace("dj ", "d j ").replace("aj ", "a j ").replace("ollie ", "o ").split())
        player_pos_normalized = player_position.lower().strip() if player_position else "unknown"
        best_score, matched_pff_id = 0, None
        potential_matches = []
        for (pff_name, pff_team, pff_position), pff_id in pff_data.items():
            if pff_team == team_db.lower() and pff_position in position_aliases.get(player_pos_normalized, [player_pos_normalized]):
                score = fuzz.ratio(" ".join(name_normalized), " ".join(pff_name))
                potential_matches.append((score, pff_id, pff_position))
        potential_matches.sort(reverse=True)
        for score, pff_id, pff_position in potential_matches:
            if score >= 90 and (pff_id not in used_pff_ids or pff_id != current_pff_id):
                best_score, matched_pff_id, matched_pff_position = score, pff_id, pff_position
                break
            elif score >= 80 and (pff_id not in used_pff_ids or pff_id != current_pff_id):
                best_score, matched_pff_id, matched_pff_position = score, pff_id, pff_position
        if matched_pff_id:
            used_pff_ids.add(matched_pff_id)
            # Override position if API position is "OL" and PFF position is "C", "G", or "T"
            new_position = player_position
            if player_position and player_position.lower() in ["ol", "ot"] and matched_pff_position in ["c", "g", "t"]:
                new_position = matched_pff_position.upper()
            cursor.execute(
                "UPDATE Players_Basic SET player_id_PFF = ?, position = ? WHERE playerId = ? AND team = ? AND year = ?",
                (matched_pff_id, new_position, player_id, team_db, year)
            )
            matched_count += cursor.rowcount
    print(f"Saved {matched_count} PFF IDs for {team}, year {year}")
    return matched_count

def main():
    try:
        team = os.getenv("TEAM", "Marshall")  # Use environment variable with TCU as fallback
        year = 2025 #int(os.getenv("YEAR", 2025))  # Use environment variable with 2025 as fallback
        roster = fetch_team_roster(team, year)
        if not roster:
            return
        player_count = 0
        for player in roster:
            player_id = player.get("playerId") or player.get("id")
            if not player_id:
                continue
            name = f"{player.get('firstName', player.get('first_name', ''))} {player.get('lastName', player.get('last_name', ''))}".strip()
            if not name:
                continue
            home_city = player.get("homeCity")
            home_state = player.get("homeState")
            home_country = player.get("homeCountry")
            home_latitude = float(player.get("homeLatitude", None)) if player.get("homeLatitude") else None
            home_longitude = float(player.get("homeLongitude", None)) if player.get("homeLongitude") else None
            position = player.get("position", None)
            height = int(player.get("height", None)) if player.get("height") else None
            weight = int(player.get("weight", None)) if player.get("weight") else None
            jersey = player.get("jersey")
            redshirt = player.get("redshirt", None) if isinstance(player.get("redshirt"), bool) else None
            # Map team to school and get teamID
            team_from_roster = team.lower()  # Use the team parameter as the roster team
            cursor.execute("SELECT school, id FROM Teams WHERE LOWER(school) = ? AND year = ?", (team_from_roster, year))
            team_data = cursor.fetchone()
            school = team_data[0] if team_data else team_from_roster
            team_id = team_data[1] if team_data else None
            # Fetch headshot URL
            headshot_url = fetch_headshot_url(player_id)
            cursor.execute(
                """
                INSERT OR REPLACE INTO Players_Basic (
                    playerId, year, name, team, school, teamID, position, height, weight, homeCity, homeState,
                    homeCountry, homeProvince, homeLatitude, homeLongitude, jersey, redshirt, player_id_PFF, headshotURL
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (player_id, year, name, team.lower(), school, team_id, position, height, weight, home_city, home_state,
                 home_country, None, home_latitude, home_longitude, jersey, redshirt, None, headshot_url)
            )
            player_count += cursor.rowcount
        attach_pff_ids(team, year)
        print(f"Saved {player_count} players for {team}, year {year}")
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()
        session.close()

if __name__ == "__main__":
    main()