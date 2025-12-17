import sqlite3
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import time

load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
YEAR = 2025  # Hard-coded year

DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("=" * 80)
print(f"TEAMS GAMES POPULATION - YEAR {YEAR}, WEEKS 1-15")
print("=" * 80)

# Check what columns exist in Teams_Games
print(f"\n[SCHEMA] Checking Teams_Games columns...")
cursor.execute("PRAGMA table_info(Teams_Games)")
existing_columns = [row[1] for row in cursor.fetchall()]
print(f"  ✓ Table has {len(existing_columns)} columns")
print(f"  Columns: {', '.join(existing_columns[:10])}...")

# ── Load real abbreviations and logos from Teams table ──
print(f"\n[SETUP] Loading team data for {YEAR}...")
cursor.execute("SELECT id, abbreviation, logos FROM Teams WHERE year = ?", (YEAR,))
team_lookup = {}
for tid, abbrev, logos_json in cursor.fetchall():
    logo = None
    if logos_json:
        try:
            logo = json.loads(logos_json)[0]
        except:
            pass
    team_lookup[tid] = {
        "abbrev": abbrev or "",
        "logo": logo
    }
print(f"  ✓ Loaded {len(team_lookup)} teams")

# Use INSERT OR REPLACE to handle both new and existing records
# This includes ALL columns from the API
insert_query = """
INSERT OR REPLACE INTO Teams_Games (
    id, season, week, seasonType, startDate, startTimeTBD, completed, neutralSite,
    conferenceGame, attendance, venueId, venue, homeId, homeTeam, homeClassification,
    homeConference, homePoints, homeLineScores, homePostgameWinProbability,
    homePregameElo, homePostgameElo, awayId, awayTeam, awayClassification,
    awayConference, awayPoints, awayLineScores, awayPostgameWinProbability,
    awayPregameElo, awayPostgameElo, excitementIndex, highlights, notes, team,
    homeTeamAbrev, awayTeamAbrev, draftKingsSpread, draftKingsFormattedSpread,
    draftKingsSpreadOpen, draftKingsOverUnder, draftKingsOverUnderOpen,
    draftKingsHomeMoneyline, draftKingsAwayMoneyline, homeTeamLogo, awayTeamLogo
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

headers = {"Authorization": f"Bearer {API_KEY}"}

# Process weeks 1-15
total_rows_processed = 0
weeks_summary = []

for WEEK in range(1, 2):
    print(f"\n{'='*80}")
    print(f"PROCESSING WEEK {WEEK}")
    print(f"{'='*80}")
    
    # Fetch games
    print(f"[API] Fetching games for week {WEEK}...")
    try:
        games_response = requests.get(
            "https://api.collegefootballdata.com/games",
            headers=headers,
            params={"year": YEAR, "week": WEEK, "seasonType": "postseason"},
            timeout=20
        )
        games_response.raise_for_status()
        games_data = games_response.json()
        
        if not games_data:
            print(f"  ⚠ No games found for week {WEEK}")
            weeks_summary.append((WEEK, 0))
            continue
            
        print(f"  ✓ Fetched {len(games_data)} games")
        
    except requests.RequestException as e:
        print(f"  ✗ Error fetching games: {e}")
        weeks_summary.append((WEEK, 0))
        continue
    
    # Fetch betting lines
    print(f"[API] Fetching betting lines for week {WEEK}...")
    try:
        lines_response = requests.get(
            f"https://api.collegefootballdata.com/lines",
            headers=headers,
            params={"year": YEAR, "week": WEEK, "seasonType": "postseason"},
            timeout=30
        )
        lines_response.raise_for_status()
        lines_data = lines_response.json()
        print(f"  ✓ Fetched betting lines for {len(lines_data)} games")
    except requests.RequestException as e:
        print(f"  ⚠ Could not fetch betting lines: {e}")
        lines_data = []
    
    # Build betting dict
    game_lines = {}
    for game in lines_data:
        gid = game.get("id")
        if not gid:
            continue
        for provider in ("DraftKings", "Bovada", "ESPN Bet"):
            line = next((l for l in game.get("lines", []) if l.get("provider") == provider), None)
            if line:
                game_lines[gid] = {
                    "draftKingsSpread": line.get("spread"),
                    "draftKingsFormattedSpread": line.get("formattedSpread"),
                    "draftKingsSpreadOpen": line.get("spreadOpen"),
                    "draftKingsOverUnder": line.get("overUnder"),
                    "draftKingsOverUnderOpen": line.get("overUnderOpen"),
                    "draftKingsHomeMoneyline": line.get("homeMoneyline"),
                    "draftKingsAwayMoneyline": line.get("awayMoneyline")
                }
                break
    
    print(f"\n[PROCESSING] Processing {len(games_data)} games...")
    
    values = []
    
    for game in games_data:
        gid = game.get("id")
        if not gid:
            continue
        
        season = game.get("season")
        week_num = game.get("week")
        seasonType = game.get("seasonType", "regular")
        notes = game.get("notes") or ""
        
        # Playoff override (shouldn't apply for regular season)
        if seasonType == "postseason":
            if "First Round" in notes:
                week_num = 1
            elif "Quarterfinal" in notes:
                week_num = 2
            elif "Semifinal" in notes:
                week_num = 3
            elif "Championship" in notes:
                week_num = 4
            else:
                week_num = 2
        
        home_info = team_lookup.get(game.get("homeId"), {"abbrev": "", "logo": None})
        away_info = team_lookup.get(game.get("awayId"), {"abbrev": "", "logo": None})
        
        betting = game_lines.get(gid, {})
        
        # Create row for home team
        home_row = (
            gid,                                                    # id
            season,                                                 # season
            week_num,                                               # week
            seasonType,                                             # seasonType
            game.get("startDate"),                                  # startDate
            game.get("startTimeTBD"),                              # startTimeTBD
            bool(game.get("completed")),                           # completed
            bool(game.get("neutralSite")),                         # neutralSite
            bool(game.get("conferenceGame")),                      # conferenceGame
            game.get("attendance"),                                 # attendance
            game.get("venueId"),                                   # venueId
            game.get("venue"),                                     # venue
            game.get("homeId"),                                    # homeId
            game.get("homeTeam"),                                  # homeTeam
            game.get("homeClassification"),                        # homeClassification
            game.get("homeConference"),                            # homeConference
            game.get("homePoints"),                                # homePoints
            str(game.get("homeLineScores")) if game.get("homeLineScores") else None,  # homeLineScores
            game.get("homePostgameWinProbability"),               # homePostgameWinProbability
            game.get("homePregameElo"),                           # homePregameElo
            game.get("homePostgameElo"),                          # homePostgameElo
            game.get("awayId"),                                    # awayId
            game.get("awayTeam"),                                  # awayTeam
            game.get("awayClassification"),                        # awayClassification
            game.get("awayConference"),                            # awayConference
            game.get("awayPoints"),                                # awayPoints
            str(game.get("awayLineScores")) if game.get("awayLineScores") else None,  # awayLineScores
            game.get("awayPostgameWinProbability"),               # awayPostgameWinProbability
            game.get("awayPregameElo"),                           # awayPregameElo
            game.get("awayPostgameElo"),                          # awayPostgameElo
            game.get("excitementIndex"),                           # excitementIndex
            game.get("highlights"),                                # highlights
            notes,                                                 # notes
            game.get("homeTeam"),                                  # team (for home)
            home_info["abbrev"],                                   # homeTeamAbrev
            away_info["abbrev"],                                   # awayTeamAbrev
            betting.get("draftKingsSpread"),                       # draftKingsSpread
            betting.get("draftKingsFormattedSpread"),             # draftKingsFormattedSpread
            betting.get("draftKingsSpreadOpen"),                   # draftKingsSpreadOpen
            betting.get("draftKingsOverUnder"),                    # draftKingsOverUnder
            betting.get("draftKingsOverUnderOpen"),               # draftKingsOverUnderOpen
            betting.get("draftKingsHomeMoneyline"),               # draftKingsHomeMoneyline
            betting.get("draftKingsAwayMoneyline"),               # draftKingsAwayMoneyline
            home_info["logo"],                                     # homeTeamLogo
            away_info["logo"]                                      # awayTeamLogo
        )
        
        # Create row for away team (same data, different team column)
        away_row = home_row[:33] + (game.get("awayTeam"),) + home_row[34:]
        
        values.append(home_row)
        values.append(away_row)
    
    if values:
        try:
            cursor.executemany(insert_query, values)
            conn.commit()
            print(f"  ✓ INSERTED/UPDATED {len(values)} rows")
            total_rows_processed += len(values)
            weeks_summary.append((WEEK, len(values)))
        except sqlite3.Error as e:
            print(f"  ✗ Database error: {e}")
            # Show first value for debugging
            if values:
                print(f"  Debug - First row length: {len(values[0])}")
                print(f"  Debug - Expected: 45 values")
            weeks_summary.append((WEEK, 0))
            continue
    else:
        print(f"  ℹ No games to process")
        weeks_summary.append((WEEK, 0))
    
    # Rate limiting
    if WEEK < 15:
        time.sleep(1)

conn.close()

print(f"\n{'='*80}")
print(f"✓ POPULATION COMPLETE")
print(f"{'='*80}")
print(f"Total rows processed: {total_rows_processed}")
print(f"\nWeek Summary:")
for week, count in weeks_summary:
    status = "✓" if count > 0 else "○"
    print(f"  {status} Week {week:2d}: {count:4d} rows")
print(f"{'='*80}")
