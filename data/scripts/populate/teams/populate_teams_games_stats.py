import sqlite3
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import sys
import time

# Load environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")

# Check command line arguments
if len(sys.argv) != 2:
    print("Usage: python populate_teams_games_stats.py <year>")
    print("Example: python populate_teams_games_stats.py 2021")
    sys.exit(1)

year = int(sys.argv[1])
seasonType = 'regular'  # Hard-coded to regular season

print("=" * 80)
print(f"TEAMS GAMES STATS POPULATION - YEAR {year}, WEEKS 1-15")
print("=" * 80)

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define all columns, including new advanced stats from both endpoints
columns = [
    'game_id INTEGER NOT NULL',
    'season INTEGER NOT NULL',
    'week INTEGER NOT NULL',
    'seasonType TEXT',
    'team_id INTEGER NOT NULL',
    'team TEXT',
    'conference TEXT',
    'homeAway TEXT',
    'points INTEGER',
    'firstDowns INTEGER',
    'thirdDownEff TEXT',
    'fourthDownEff TEXT',
    'totalYards INTEGER',
    'netPassingYards INTEGER',
    'completionAttempts TEXT',
    'yardsPerPass REAL',
    'rushingYards INTEGER',
    'rushingAttempts INTEGER',
    'yardsPerRushAttempt REAL',
    'totalPenaltiesYards TEXT',
    'turnovers INTEGER',
    'fumblesLost INTEGER',
    'interceptions INTEGER',
    'possessionTime TEXT',
    'passesDeflected INTEGER',
    'qbHurries INTEGER',
    'sacks INTEGER',
    'tackles INTEGER',
    'defensiveTDs INTEGER',
    'tacklesForLoss INTEGER',
    'totalFumbles INTEGER',
    'fumblesRecovered INTEGER',
    'passesIntercepted INTEGER',
    'interceptionTDs INTEGER',
    'interceptionYards INTEGER',
    'kickingPoints INTEGER',
    'kickReturns INTEGER',
    'kickReturnTDs INTEGER',
    'kickReturnYards INTEGER',
    'passingTDs INTEGER',
    'puntReturns INTEGER',
    'puntReturnTDs INTEGER',
    'puntReturnYards INTEGER',
    'rushingTDs INTEGER',
    'ppa_overall_total REAL',
    'ppa_overall_quarter1 REAL',
    'ppa_overall_quarter2 REAL',
    'ppa_overall_quarter3 REAL',
    'ppa_overall_quarter4 REAL',
    'ppa_passing_total REAL',
    'ppa_passing_quarter1 REAL',
    'ppa_passing_quarter2 REAL',
    'ppa_passing_quarter3 REAL',
    'ppa_passing_quarter4 REAL',
    'ppa_rushing_total REAL',
    'ppa_rushing_quarter1 REAL',
    'ppa_rushing_quarter2 REAL',
    'ppa_rushing_quarter3 REAL',
    'ppa_rushing_quarter4 REAL',
    'cumulative_ppa_overall_total REAL',
    'cumulative_ppa_overall_quarter1 REAL',
    'cumulative_ppa_overall_quarter2 REAL',
    'cumulative_ppa_overall_quarter3 REAL',
    'cumulative_ppa_overall_quarter4 REAL',
    'cumulative_ppa_passing_total REAL',
    'cumulative_ppa_passing_quarter1 REAL',
    'cumulative_ppa_passing_quarter2 REAL',
    'cumulative_ppa_passing_quarter3 REAL',
    'cumulative_ppa_passing_quarter4 REAL',
    'cumulative_ppa_rushing_total REAL',
    'cumulative_ppa_rushing_quarter1 REAL',
    'cumulative_ppa_rushing_quarter2 REAL',
    'cumulative_ppa_rushing_quarter3 REAL',
    'cumulative_ppa_rushing_quarter4 REAL',
    'success_rate_overall_total REAL',
    'success_rate_overall_quarter1 REAL',
    'success_rate_overall_quarter2 REAL',
    'success_rate_overall_quarter3 REAL',
    'success_rate_overall_quarter4 REAL',
    'success_rate_standard_downs_total REAL',
    'success_rate_standard_downs_quarter1 REAL',
    'success_rate_standard_downs_quarter2 REAL',
    'success_rate_standard_downs_quarter3 REAL',
    'success_rate_standard_downs_quarter4 REAL',
    'success_rate_passing_downs_total REAL',
    'success_rate_passing_downs_quarter1 REAL',
    'success_rate_passing_downs_quarter2 REAL',
    'success_rate_passing_downs_quarter3 REAL',
    'success_rate_passing_downs_quarter4 REAL',
    'explosiveness_overall_total REAL',
    'explosiveness_overall_quarter1 REAL',
    'explosiveness_overall_quarter2 REAL',
    'explosiveness_overall_quarter3 REAL',
    'explosiveness_overall_quarter4 REAL',
    'rushing_power_success REAL',
    'rushing_stuff_rate REAL',
    'rushing_line_yards INTEGER',
    'rushing_line_yards_average REAL',
    'rushing_second_level_yards INTEGER',
    'rushing_second_level_yards_average REAL',
    'rushing_open_field_yards INTEGER',
    'rushing_open_field_yards_average REAL',
    'havoc_total REAL',
    'havoc_front_seven REAL',
    'havoc_db REAL',
    'scoring_opportunities_opportunities INTEGER',
    'scoring_opportunities_points INTEGER',
    'scoring_opportunities_points_per_opportunity REAL',
    'field_position_average_start REAL',
    'field_position_average_predicted_points REAL',
    'offense_plays INTEGER',
    'offense_drives INTEGER',
    'offense_ppa REAL',
    'offense_total_ppa REAL',
    'offense_success_rate REAL',
    'offense_explosiveness REAL',
    'offense_standard_downs_ppa REAL',
    'offense_standard_downs_success_rate REAL',
    'offense_standard_downs_explosiveness REAL',
    'offense_passing_downs_ppa REAL',
    'offense_passing_downs_success_rate REAL',
    'offense_passing_downs_explosiveness REAL',
    'offense_rushing_plays_ppa REAL',
    'offense_rushing_plays_total_ppa REAL',
    'offense_rushing_plays_success_rate REAL',
    'offense_rushing_plays_explosiveness REAL',
    'offense_passing_plays_ppa REAL',
    'offense_passing_plays_total_ppa REAL',
    'offense_passing_plays_success_rate REAL',
    'offense_passing_plays_explosiveness REAL',
    'defense_plays INTEGER',
    'defense_drives INTEGER',
    'defense_ppa REAL',
    'defense_total_ppa REAL',
    'defense_success_rate REAL',
    'defense_explosiveness REAL',
    'defense_standard_downs_ppa REAL',
    'defense_standard_downs_success_rate REAL',
    'defense_standard_downs_explosiveness REAL',
    'defense_passing_downs_ppa REAL',
    'defense_passing_downs_success_rate REAL',
    'defense_passing_downs_explosiveness REAL',
    'defense_rushing_plays_ppa REAL',
    'defense_rushing_plays_total_ppa REAL',
    'defense_rushing_plays_success_rate REAL',
    'defense_rushing_plays_explosiveness REAL',
    'defense_passing_plays_ppa REAL',
    'defense_passing_plays_total_ppa REAL',
    'defense_passing_plays_success_rate REAL',
    'defense_passing_plays_explosiveness REAL'
]

# Create table if it doesn't exist
print("\n[SETUP] Creating/updating table schema...")
create_table_query = f"""
CREATE TABLE IF NOT EXISTS Teams_Games_Stats (
    {', '.join(columns)},
    PRIMARY KEY (game_id, season, week, seasonType, team_id),
    FOREIGN KEY (game_id, season, week, team) REFERENCES Teams_Games(id, season, week, team)
)
"""
cursor.execute(create_table_query)

# Add any missing columns to existing table
existing_columns = [row[1] for row in cursor.execute("PRAGMA table_info(Teams_Games_Stats)").fetchall()]
for column in columns:
    column_name = column.split()[0]
    if column_name not in existing_columns:
        cursor.execute(f"ALTER TABLE Teams_Games_Stats ADD COLUMN {column};")
        print(f"  Added column: {column_name}")

print("  ✓ Table ready")

headers = {"Authorization": f"Bearer {API_KEY}"}
total_games_processed = 0
total_api_calls = 0

# Process weeks 1-15
for week in range(15, 16):
    print(f"\n{'='*80}")
    print(f"PROCESSING WEEK {week}")
    print(f"{'='*80}")
    
    # Fetch distinct completed games from Teams_Games for this week
    cursor.execute("""
        SELECT DISTINCT id, season, week, seasonType, team, homeId, awayId, homeTeam, awayTeam
        FROM Teams_Games
        WHERE season = ? AND seasonType = ? AND week = ? AND completed = 1
    """, (year, seasonType, week))
    
    games = cursor.fetchall()
    
    if not games:
        print(f"  ℹ No completed games found for week {week}")
        continue
    
    # Group games by id
    game_team_map = {}
    for game in games:
        game_id, season, wk, st, team, homeId, awayId, homeTeam, awayTeam = game
        team_id = homeId if team == homeTeam else awayId
        if game_id not in game_team_map:
            game_team_map[game_id] = {'season': season, 'week': wk, 'seasonType': st, 'teams': []}
        game_team_map[game_id]['teams'].append({'team': team, 'team_id': team_id})
    
    print(f"  Found {len(game_team_map)} games with {len(games)} team records")
    
    games_processed = 0
    
    # Fetch stats for each game by id
    for game_id, game_info in game_team_map.items():
        season = game_info['season']
        wk = game_info['week']
        st = game_info['seasonType']
        teams = [t['team'] for t in game_info['teams']]
        
        print(f"\n  [Game {game_id}] Teams: {', '.join(teams)}")
        
        # Fetch basic stats
        basic_url = f"https://api.collegefootballdata.com/games/teams?id={game_id}"
        print(f"    Fetching basic stats...")
        try:
            response = requests.get(basic_url, headers=headers, timeout=20)
            response.raise_for_status()
            basic_games_data = response.json()
            total_api_calls += 1
        except requests.RequestException as e:
            print(f"    ✗ Error fetching basic stats: {e}")
            continue

        # Fetch advanced box stats
        advanced_box_url = f"https://api.collegefootballdata.com/game/box/advanced?id={game_id}"
        print(f"    Fetching advanced box stats...")
        try:
            response = requests.get(advanced_box_url, headers=headers, timeout=20)
            response.raise_for_status()
            advanced_box_data = response.json()
            total_api_calls += 1
        except requests.RequestException as e:
            print(f"    ✗ Error fetching advanced box stats: {e}")
            continue

        # Fetch advanced game stats for each team
        advanced_game_stats = {}
        for team_info in game_info['teams']:
            team_name = team_info['team']
            advanced_game_url = f"https://api.collegefootballdata.com/stats/game/advanced?year={season}&week={wk}&team={team_name.replace(' ', '%20')}"
            print(f"    Fetching advanced game stats for {team_name}...")
            try:
                response = requests.get(advanced_game_url, headers=headers, timeout=20)
                response.raise_for_status()
                game_stats_data = response.json()
                total_api_calls += 1
                for game_data in game_stats_data:
                    if game_data.get("gameId") == game_id and game_data.get("team") == team_name:
                        advanced_game_stats[team_name] = game_data
            except requests.RequestException as e:
                print(f"    ✗ Error fetching advanced game stats for {team_name}: {e}")
                advanced_game_stats[team_name] = {}

        # Process basic stats
        basic_team_stats = {}
        for game_data in basic_games_data:
            if game_data.get("id") != game_id:
                continue
            for team_stat in game_data.get("teams", []):
                team_name = team_stat.get("team")
                basic_team_stats[team_name] = {
                    'team_id': team_stat.get("teamId"),
                    'conference': team_stat.get("conference"),
                    'homeAway': team_stat.get("homeAway"),
                    'points': team_stat.get("points"),
                    'stats': {stat["category"]: stat["stat"] for stat in team_stat.get("stats", [])}
                }

        # Process advanced box stats
        advanced_box_team_stats = {}
        for category in advanced_box_data.get("teams", {}):
            for team_data in advanced_box_data["teams"].get(category, []):
                team_name = team_data.get("team")
                advanced_box_team_stats[team_name] = advanced_box_team_stats.get(team_name, {})
                advanced_box_team_stats[team_name][category] = team_data

        # Insert stats for each team
        for team_stat in game_info['teams']:
            team_name = team_stat['team']
            team_id = team_stat['team_id']
            
            basic = basic_team_stats.get(team_name, {})
            stats = basic.get('stats', {})
            advanced_box = advanced_box_team_stats.get(team_name, {})
            advanced_game = advanced_game_stats.get(team_name, {})

            # Extract advanced box stats
            ppa = advanced_box.get('ppa', {})
            ppa_overall = ppa.get('overall', {})
            ppa_passing = ppa.get('passing', {})
            ppa_rushing = ppa.get('rushing', {})
            
            cumulative_ppa = advanced_box.get('cumulativePpa', {})
            cumulative_ppa_overall = cumulative_ppa.get('overall', {})
            cumulative_ppa_passing = cumulative_ppa.get('passing', {})
            cumulative_ppa_rushing = cumulative_ppa.get('rushing', {})
            
            success_rates = advanced_box.get('successRates', {})
            success_rate_overall = success_rates.get('overall', {})
            success_rate_standard_downs = success_rates.get('standardDowns', {})
            success_rate_passing_downs = success_rates.get('passingDowns', {})
            
            explosiveness = advanced_box.get('explosiveness', {})
            explosiveness_overall = explosiveness.get('overall', {})
            
            rushing = advanced_box.get('rushing', {})
            havoc = advanced_box.get('havoc', {})
            scoring_opportunities = advanced_box.get('scoringOpportunities', {})
            field_position = advanced_box.get('fieldPosition', {})

            # Extract advanced game stats
            offense = advanced_game.get('offense', {})
            offense_standard_downs = offense.get('standardDowns', {})
            offense_passing_downs = offense.get('passingDowns', {})
            offense_rushing_plays = offense.get('rushingPlays', {})
            offense_passing_plays = offense.get('passingPlays', {})
            
            defense = advanced_game.get('defense', {})
            defense_standard_downs = defense.get('standardDowns', {})
            defense_passing_downs = defense.get('passingDowns', {})
            defense_rushing_plays = defense.get('rushingPlays', {})
            defense_passing_plays = defense.get('passingPlays', {})

            # Prepare values
            values = (
                game_id, season, wk, st, team_id, team_name,
                basic.get("conference"), basic.get("homeAway"), basic.get("points"),
                stats.get("firstDowns"), stats.get("thirdDownEff"), stats.get("fourthDownEff"),
                stats.get("totalYards"), stats.get("netPassingYards"), stats.get("completionAttempts"),
                stats.get("yardsPerPass"), stats.get("rushingYards"), stats.get("rushingAttempts"),
                stats.get("yardsPerRushAttempt"), stats.get("totalPenaltiesYards"), stats.get("turnovers"),
                stats.get("fumblesLost"), stats.get("interceptions"), stats.get("possessionTime"),
                stats.get("passesDeflected"), stats.get("qbHurries"), stats.get("sacks"),
                stats.get("tackles"), stats.get("defensiveTDs"), stats.get("tacklesForLoss"),
                stats.get("totalFumbles"), stats.get("fumblesRecovered"), stats.get("passesIntercepted"),
                stats.get("interceptionTDs"), stats.get("interceptionYards"), stats.get("kickingPoints"),
                stats.get("kickReturns"), stats.get("kickReturnTDs"), stats.get("kickReturnYards"),
                stats.get("passingTDs"), stats.get("puntReturns"), stats.get("puntReturnTDs"),
                stats.get("puntReturnYards"), stats.get("rushingTDs"),
                ppa_overall.get('total'), ppa_overall.get('quarter1'), ppa_overall.get('quarter2'),
                ppa_overall.get('quarter3'), ppa_overall.get('quarter4'),
                ppa_passing.get('total'), ppa_passing.get('quarter1'), ppa_passing.get('quarter2'),
                ppa_passing.get('quarter3'), ppa_passing.get('quarter4'),
                ppa_rushing.get('total'), ppa_rushing.get('quarter1'), ppa_rushing.get('quarter2'),
                ppa_rushing.get('quarter3'), ppa_rushing.get('quarter4'),
                cumulative_ppa_overall.get('total'), cumulative_ppa_overall.get('quarter1'),
                cumulative_ppa_overall.get('quarter2'), cumulative_ppa_overall.get('quarter3'),
                cumulative_ppa_overall.get('quarter4'),
                cumulative_ppa_passing.get('total'), cumulative_ppa_passing.get('quarter1'),
                cumulative_ppa_passing.get('quarter2'), cumulative_ppa_passing.get('quarter3'),
                cumulative_ppa_passing.get('quarter4'),
                cumulative_ppa_rushing.get('total'), cumulative_ppa_rushing.get('quarter1'),
                cumulative_ppa_rushing.get('quarter2'), cumulative_ppa_rushing.get('quarter3'),
                cumulative_ppa_rushing.get('quarter4'),
                success_rate_overall.get('total'), success_rate_overall.get('quarter1'),
                success_rate_overall.get('quarter2'), success_rate_overall.get('quarter3'),
                success_rate_overall.get('quarter4'),
                success_rate_standard_downs.get('total'), success_rate_standard_downs.get('quarter1'),
                success_rate_standard_downs.get('quarter2'), success_rate_standard_downs.get('quarter3'),
                success_rate_standard_downs.get('quarter4'),
                success_rate_passing_downs.get('total'), success_rate_passing_downs.get('quarter1'),
                success_rate_passing_downs.get('quarter2'), success_rate_passing_downs.get('quarter3'),
                success_rate_passing_downs.get('quarter4'),
                explosiveness_overall.get('total'), explosiveness_overall.get('quarter1'),
                explosiveness_overall.get('quarter2'), explosiveness_overall.get('quarter3'),
                explosiveness_overall.get('quarter4'),
                rushing.get('powerSuccess'), rushing.get('stuffRate'), rushing.get('lineYards'),
                rushing.get('lineYardsAverage'), rushing.get('secondLevelYards'),
                rushing.get('secondLevelYardsAverage'), rushing.get('openFieldYards'),
                rushing.get('openFieldYardsAverage'),
                havoc.get('total'), havoc.get('frontSeven'), havoc.get('db'),
                scoring_opportunities.get('opportunities'), scoring_opportunities.get('points'),
                scoring_opportunities.get('pointsPerOpportunity'),
                field_position.get('averageStart'), field_position.get('averageStartingPredictedPoints'),
                offense.get('plays'), offense.get('drives'), offense.get('ppa'), offense.get('totalPPA'),
                offense.get('successRate'), offense.get('explosiveness'),
                offense_standard_downs.get('ppa'), offense_standard_downs.get('successRate'),
                offense_standard_downs.get('explosiveness'),
                offense_passing_downs.get('ppa'), offense_passing_downs.get('successRate'),
                offense_passing_downs.get('explosiveness'),
                offense_rushing_plays.get('ppa'), offense_rushing_plays.get('totalPPA'),
                offense_rushing_plays.get('successRate'), offense_rushing_plays.get('explosiveness'),
                offense_passing_plays.get('ppa'), offense_passing_plays.get('totalPPA'),
                offense_passing_plays.get('successRate'), offense_passing_plays.get('explosiveness'),
                defense.get('plays'), defense.get('drives'), defense.get('ppa'), defense.get('totalPPA'),
                defense.get('successRate'), defense.get('explosiveness'),
                defense_standard_downs.get('ppa'), defense_standard_downs.get('successRate'),
                defense_standard_downs.get('explosiveness'),
                defense_passing_downs.get('ppa'), defense_passing_downs.get('successRate'),
                defense_passing_downs.get('explosiveness'),
                defense_rushing_plays.get('ppa'), defense_rushing_plays.get('totalPPA'),
                defense_rushing_plays.get('successRate'), defense_rushing_plays.get('explosiveness'),
                defense_passing_plays.get('ppa'), defense_passing_plays.get('totalPPA'),
                defense_passing_plays.get('successRate'), defense_passing_plays.get('explosiveness')
            )

            cursor.execute("""
                INSERT OR REPLACE INTO Teams_Games_Stats (
                    game_id, season, week, seasonType, team_id, team, conference, homeAway, points,
                    firstDowns, thirdDownEff, fourthDownEff, totalYards, netPassingYards,
                    completionAttempts, yardsPerPass, rushingYards, rushingAttempts,
                    yardsPerRushAttempt, totalPenaltiesYards, turnovers, fumblesLost,
                    interceptions, possessionTime, passesDeflected, qbHurries, sacks,
                    tackles, defensiveTDs, tacklesForLoss, totalFumbles, fumblesRecovered,
                    passesIntercepted, interceptionTDs, interceptionYards, kickingPoints,
                    kickReturns, kickReturnTDs, kickReturnYards, passingTDs, puntReturns,
                    puntReturnTDs, puntReturnYards, rushingTDs,
                    ppa_overall_total, ppa_overall_quarter1, ppa_overall_quarter2,
                    ppa_overall_quarter3, ppa_overall_quarter4, ppa_passing_total,
                    ppa_passing_quarter1, ppa_passing_quarter2, ppa_passing_quarter3,
                    ppa_passing_quarter4, ppa_rushing_total, ppa_rushing_quarter1,
                    ppa_rushing_quarter2, ppa_rushing_quarter3, ppa_rushing_quarter4,
                    cumulative_ppa_overall_total, cumulative_ppa_overall_quarter1,
                    cumulative_ppa_overall_quarter2, cumulative_ppa_overall_quarter3,
                    cumulative_ppa_overall_quarter4, cumulative_ppa_passing_total,
                    cumulative_ppa_passing_quarter1, cumulative_ppa_passing_quarter2,
                    cumulative_ppa_passing_quarter3, cumulative_ppa_passing_quarter4,
                    cumulative_ppa_rushing_total, cumulative_ppa_rushing_quarter1,
                    cumulative_ppa_rushing_quarter2, cumulative_ppa_rushing_quarter3,
                    cumulative_ppa_rushing_quarter4, success_rate_overall_total,
                    success_rate_overall_quarter1, success_rate_overall_quarter2,
                    success_rate_overall_quarter3, success_rate_overall_quarter4,
                    success_rate_standard_downs_total, success_rate_standard_downs_quarter1,
                    success_rate_standard_downs_quarter2, success_rate_standard_downs_quarter3,
                    success_rate_standard_downs_quarter4, success_rate_passing_downs_total,
                    success_rate_passing_downs_quarter1, success_rate_passing_downs_quarter2,
                    success_rate_passing_downs_quarter3, success_rate_passing_downs_quarter4,
                    explosiveness_overall_total, explosiveness_overall_quarter1,
                    explosiveness_overall_quarter2, explosiveness_overall_quarter3,
                    explosiveness_overall_quarter4, rushing_power_success, rushing_stuff_rate,
                    rushing_line_yards, rushing_line_yards_average, rushing_second_level_yards,
                    rushing_second_level_yards_average, rushing_open_field_yards,
                    rushing_open_field_yards_average, havoc_total, havoc_front_seven, havoc_db,
                    scoring_opportunities_opportunities, scoring_opportunities_points,
                    scoring_opportunities_points_per_opportunity, field_position_average_start,
                    field_position_average_predicted_points,
                    offense_plays, offense_drives, offense_ppa, offense_total_ppa,
                    offense_success_rate, offense_explosiveness,
                    offense_standard_downs_ppa, offense_standard_downs_success_rate,
                    offense_standard_downs_explosiveness, offense_passing_downs_ppa,
                    offense_passing_downs_success_rate, offense_passing_downs_explosiveness,
                    offense_rushing_plays_ppa, offense_rushing_plays_total_ppa,
                    offense_rushing_plays_success_rate, offense_rushing_plays_explosiveness,
                    offense_passing_plays_ppa, offense_passing_plays_total_ppa,
                    offense_passing_plays_success_rate, offense_passing_plays_explosiveness,
                    defense_plays, defense_drives, defense_ppa, defense_total_ppa,
                    defense_success_rate, defense_explosiveness,
                    defense_standard_downs_ppa, defense_standard_downs_success_rate,
                    defense_standard_downs_explosiveness, defense_passing_downs_ppa,
                    defense_passing_downs_success_rate, defense_passing_downs_explosiveness,
                    defense_rushing_plays_ppa, defense_rushing_plays_total_ppa,
                    defense_rushing_plays_success_rate, defense_rushing_plays_explosiveness,
                    defense_passing_plays_ppa, defense_passing_plays_total_ppa,
                    defense_passing_plays_success_rate, defense_passing_plays_explosiveness
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, values)

        games_processed += 1
        
        # Rate limiting between games
        time.sleep(1)
    
    print(f"\n  ✓ Week {week}: Processed {games_processed} games")
    total_games_processed += games_processed
    
    # Commit after each week
    conn.commit()

conn.close()

print(f"\n{'='*80}")
print(f"✓ POPULATION COMPLETE")
print(f"{'='*80}")
print(f"Year: {year}")
print(f"Season Type: {seasonType}")
print(f"Weeks: 1-15")
print(f"Total games processed: {total_games_processed}")
print(f"Total API calls: {total_api_calls}")
print(f"{'='*80}")

# import sqlite3
# import os
# import requests
# from pathlib import Path
# from dotenv import load_dotenv
# import sys
# import time

# # Load environment variables
# load_dotenv()
# API_KEY = os.getenv("API_KEY", "xPVVHT3+7AMkH/gk2Rbnpin03CxVlm6HyGgL2yNiPL1riWLPRUQGS5nE1AXEBMmV")
# DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
# conn = sqlite3.connect(DB_FILE)
# cursor = conn.cursor()

# # Check command line arguments
# if len(sys.argv) not in [3, 4]:
#     print("Usage: python populate_teams_games_stats.py <year> <seasonType> [<week>]")
#     print("Example: python populate_teams_games_stats.py 2025 regular 4")
#     sys.exit(1)

# year = int(sys.argv[1])
# seasonType = sys.argv[2]
# week = int(sys.argv[3]) if len(sys.argv) == 4 else None

# # Validate seasonType
# valid_season_types = ['regular', 'postseason']
# if seasonType not in valid_season_types:
#     print(f"Invalid seasonType: {seasonType}. Must be one of {valid_season_types}")
#     sys.exit(1)

# # Define all columns, including new advanced stats from both endpoints
# columns = [
#     'game_id INTEGER NOT NULL',
#     'season INTEGER NOT NULL',
#     'week INTEGER NOT NULL',
#     'seasonType TEXT',
#     'team_id INTEGER NOT NULL',
#     'team TEXT',
#     'conference TEXT',
#     'homeAway TEXT',
#     'points INTEGER',
#     'firstDowns INTEGER',
#     'thirdDownEff TEXT',
#     'fourthDownEff TEXT',
#     'totalYards INTEGER',
#     'netPassingYards INTEGER',
#     'completionAttempts TEXT',
#     'yardsPerPass REAL',
#     'rushingYards INTEGER',
#     'rushingAttempts INTEGER',
#     'yardsPerRushAttempt REAL',
#     'totalPenaltiesYards TEXT',
#     'turnovers INTEGER',
#     'fumblesLost INTEGER',
#     'interceptions INTEGER',
#     'possessionTime TEXT',
#     'passesDeflected INTEGER',
#     'qbHurries INTEGER',
#     'sacks INTEGER',
#     'tackles INTEGER',
#     'defensiveTDs INTEGER',
#     'tacklesForLoss INTEGER',
#     'totalFumbles INTEGER',
#     'fumblesRecovered INTEGER',
#     'passesIntercepted INTEGER',
#     'interceptionTDs INTEGER',
#     'interceptionYards INTEGER',
#     'kickingPoints INTEGER',
#     'kickReturns INTEGER',
#     'kickReturnTDs INTEGER',
#     'kickReturnYards INTEGER',
#     'passingTDs INTEGER',
#     'puntReturns INTEGER',
#     'puntReturnTDs INTEGER',
#     'puntReturnYards INTEGER',
#     'rushingTDs INTEGER',
#     'ppa_overall_total REAL',
#     'ppa_overall_quarter1 REAL',
#     'ppa_overall_quarter2 REAL',
#     'ppa_overall_quarter3 REAL',
#     'ppa_overall_quarter4 REAL',
#     'ppa_passing_total REAL',
#     'ppa_passing_quarter1 REAL',
#     'ppa_passing_quarter2 REAL',
#     'ppa_passing_quarter3 REAL',
#     'ppa_passing_quarter4 REAL',
#     'ppa_rushing_total REAL',
#     'ppa_rushing_quarter1 REAL',
#     'ppa_rushing_quarter2 REAL',
#     'ppa_rushing_quarter3 REAL',
#     'ppa_rushing_quarter4 REAL',
#     'cumulative_ppa_overall_total REAL',
#     'cumulative_ppa_overall_quarter1 REAL',
#     'cumulative_ppa_overall_quarter2 REAL',
#     'cumulative_ppa_overall_quarter3 REAL',
#     'cumulative_ppa_overall_quarter4 REAL',
#     'cumulative_ppa_passing_total REAL',
#     'cumulative_ppa_passing_quarter1 REAL',
#     'cumulative_ppa_passing_quarter2 REAL',
#     'cumulative_ppa_passing_quarter3 REAL',
#     'cumulative_ppa_passing_quarter4 REAL',
#     'cumulative_ppa_rushing_total REAL',
#     'cumulative_ppa_rushing_quarter1 REAL',
#     'cumulative_ppa_rushing_quarter2 REAL',
#     'cumulative_ppa_rushing_quarter3 REAL',
#     'cumulative_ppa_rushing_quarter4 REAL',
#     'success_rate_overall_total REAL',
#     'success_rate_overall_quarter1 REAL',
#     'success_rate_overall_quarter2 REAL',
#     'success_rate_overall_quarter3 REAL',
#     'success_rate_overall_quarter4 REAL',
#     'success_rate_standard_downs_total REAL',
#     'success_rate_standard_downs_quarter1 REAL',
#     'success_rate_standard_downs_quarter2 REAL',
#     'success_rate_standard_downs_quarter3 REAL',
#     'success_rate_standard_downs_quarter4 REAL',
#     'success_rate_passing_downs_total REAL',
#     'success_rate_passing_downs_quarter1 REAL',
#     'success_rate_passing_downs_quarter2 REAL',
#     'success_rate_passing_downs_quarter3 REAL',
#     'success_rate_passing_downs_quarter4 REAL',
#     'explosiveness_overall_total REAL',
#     'explosiveness_overall_quarter1 REAL',
#     'explosiveness_overall_quarter2 REAL',
#     'explosiveness_overall_quarter3 REAL',
#     'explosiveness_overall_quarter4 REAL',
#     'rushing_power_success REAL',
#     'rushing_stuff_rate REAL',
#     'rushing_line_yards INTEGER',
#     'rushing_line_yards_average REAL',
#     'rushing_second_level_yards INTEGER',
#     'rushing_second_level_yards_average REAL',
#     'rushing_open_field_yards INTEGER',
#     'rushing_open_field_yards_average REAL',
#     'havoc_total REAL',
#     'havoc_front_seven REAL',
#     'havoc_db REAL',
#     'scoring_opportunities_opportunities INTEGER',
#     'scoring_opportunities_points INTEGER',
#     'scoring_opportunities_points_per_opportunity REAL',
#     'field_position_average_start REAL',
#     'field_position_average_predicted_points REAL',
#     'offense_plays INTEGER',
#     'offense_drives INTEGER',
#     'offense_ppa REAL',
#     'offense_total_ppa REAL',
#     'offense_success_rate REAL',
#     'offense_explosiveness REAL',
#     'offense_standard_downs_ppa REAL',
#     'offense_standard_downs_success_rate REAL',
#     'offense_standard_downs_explosiveness REAL',
#     'offense_passing_downs_ppa REAL',
#     'offense_passing_downs_success_rate REAL',
#     'offense_passing_downs_explosiveness REAL',
#     'offense_rushing_plays_ppa REAL',
#     'offense_rushing_plays_total_ppa REAL',
#     'offense_rushing_plays_success_rate REAL',
#     'offense_rushing_plays_explosiveness REAL',
#     'offense_passing_plays_ppa REAL',
#     'offense_passing_plays_total_ppa REAL',
#     'offense_passing_plays_success_rate REAL',
#     'offense_passing_plays_explosiveness REAL',
#     'defense_plays INTEGER',
#     'defense_drives INTEGER',
#     'defense_ppa REAL',
#     'defense_total_ppa REAL',
#     'defense_success_rate REAL',
#     'defense_explosiveness REAL',
#     'defense_standard_downs_ppa REAL',
#     'defense_standard_downs_success_rate REAL',
#     'defense_standard_downs_explosiveness REAL',
#     'defense_passing_downs_ppa REAL',
#     'defense_passing_downs_success_rate REAL',
#     'defense_passing_downs_explosiveness REAL',
#     'defense_rushing_plays_ppa REAL',
#     'defense_rushing_plays_total_ppa REAL',
#     'defense_rushing_plays_success_rate REAL',
#     'defense_rushing_plays_explosiveness REAL',
#     'defense_passing_plays_ppa REAL',
#     'defense_passing_plays_total_ppa REAL',
#     'defense_passing_plays_success_rate REAL',
#     'defense_passing_plays_explosiveness REAL'
# ]

# # Create table if it doesn't exist
# create_table_query = f"""
# CREATE TABLE IF NOT EXISTS Teams_Games_Stats (
#     {', '.join(columns)},
#     PRIMARY KEY (game_id, season, week, seasonType, team_id),
#     FOREIGN KEY (game_id, season, week, team) REFERENCES Teams_Games(id, season, week, team)
# )
# """
# cursor.execute(create_table_query)

# # Add any missing columns to existing table
# existing_columns = [row[1] for row in cursor.execute("PRAGMA table_info(Teams_Games_Stats)").fetchall()]
# for column in columns:
#     column_name = column.split()[0]
#     if column_name not in existing_columns:
#         cursor.execute(f"ALTER TABLE Teams_Games_Stats ADD COLUMN {column};")

# # Fetch distinct completed games from Teams_Games
# query = """
# SELECT DISTINCT id, season, week, seasonType, team, homeId, awayId, homeTeam, awayTeam
# FROM Teams_Games
# WHERE season = ? AND seasonType = ? AND completed = 1
# """
# params = [year, seasonType]
# if week is not None:
#     query += " AND week = ?"
#     params.append(week)

# cursor.execute(query, params)
# games = cursor.fetchall()

# if not games:
#     print(f"No completed games found for year {year}, seasonType {seasonType}" + (f", week {week}" if week is not None else ""))
#     conn.close()
#     sys.exit(0)

# # Group games by id
# game_team_map = {}
# for game in games:
#     game_id, season, week, seasonType, team, homeId, awayId, homeTeam, awayTeam = game
#     team_id = homeId if team == homeTeam else awayId
#     if game_id not in game_team_map:
#         game_team_map[game_id] = {'season': season, 'week': week, 'seasonType': seasonType, 'teams': []}
#     game_team_map[game_id]['teams'].append({'team': team, 'team_id': team_id})

# # Fetch stats for each game by id
# headers = {"Authorization": f"Bearer {API_KEY}"}
# for game_id, game_info in game_team_map.items():
#     season = game_info['season']
#     week = game_info['week']
#     seasonType = game_info['seasonType']
#     teams = [t['team'] for t in game_info['teams']]
    
#     # Fetch basic stats
#     basic_url = f"https://api.collegefootballdata.com/games/teams?id={game_id}"
#     print(f"Fetching basic stats for game {game_id}, teams {teams}, year {season}, week {week}, seasonType {seasonType}")
#     try:
#         response = requests.get(basic_url, headers=headers, timeout=20)
#         response.raise_for_status()
#         basic_games_data = response.json()
#     except requests.RequestException as e:
#         print(f"Error fetching basic stats for game {game_id}: {e}")
#         continue

#     # Fetch advanced box stats
#     advanced_box_url = f"https://api.collegefootballdata.com/game/box/advanced?id={game_id}"
#     print(f"Fetching advanced box stats for game {game_id}, teams {teams}, year {season}, week {week}, seasonType {seasonType}")
#     try:
#         response = requests.get(advanced_box_url, headers=headers, timeout=20)
#         response.raise_for_status()
#         advanced_box_data = response.json()
#     except requests.RequestException as e:
#         print(f"Error fetching advanced box stats for game {game_id}: {e}")
#         continue

#     # Fetch advanced game stats for each team
#     advanced_game_stats = {}
#     for team_info in game_info['teams']:
#         team_name = team_info['team']
#         advanced_game_url = f"https://api.collegefootballdata.com/stats/game/advanced?year={season}&week={week}&team={team_name.replace(' ', '%20')}"
#         print(f"Fetching advanced game stats for team {team_name}, game {game_id}, year {season}, week {week}")
#         try:
#             response = requests.get(advanced_game_url, headers=headers, timeout=20)
#             response.raise_for_status()
#             game_stats_data = response.json()
#             for game_data in game_stats_data:
#                 if game_data.get("gameId") == game_id and game_data.get("team") == team_name:
#                     advanced_game_stats[team_name] = game_data
#         except requests.RequestException as e:
#             print(f"Error fetching advanced game stats for team {team_name}, game {game_id}: {e}")
#             advanced_game_stats[team_name] = {}

#     # Process basic stats
#     basic_team_stats = {}
#     for game_data in basic_games_data:
#         if game_data.get("id") != game_id:
#             continue
#         for team_stat in game_data.get("teams", []):
#             team_name = team_stat.get("team")
#             basic_team_stats[team_name] = {
#                 'team_id': team_stat.get("teamId"),
#                 'conference': team_stat.get("conference"),
#                 'homeAway': team_stat.get("homeAway"),
#                 'points': team_stat.get("points"),
#                 'stats': {stat["category"]: stat["stat"] for stat in team_stat.get("stats", [])}
#             }

#     # Process advanced box stats
#     advanced_box_team_stats = {}
#     for category in advanced_box_data.get("teams", {}):
#         for team_data in advanced_box_data["teams"].get(category, []):
#             team_name = team_data.get("team")
#             advanced_box_team_stats[team_name] = advanced_box_team_stats.get(team_name, {})
#             advanced_box_team_stats[team_name][category] = team_data

#     # Insert stats for each team
#     for team_stat in game_info['teams']:
#         team_name = team_stat['team']
#         team_id = team_stat['team_id']
        
#         basic = basic_team_stats.get(team_name, {})
#         stats = basic.get('stats', {})
#         advanced_box = advanced_box_team_stats.get(team_name, {})
#         advanced_game = advanced_game_stats.get(team_name, {})

#         # Extract advanced box stats
#         ppa = advanced_box.get('ppa', {})
#         ppa_overall = ppa.get('overall', {})
#         ppa_passing = ppa.get('passing', {})
#         ppa_rushing = ppa.get('rushing', {})
        
#         cumulative_ppa = advanced_box.get('cumulativePpa', {})
#         cumulative_ppa_overall = cumulative_ppa.get('overall', {})
#         cumulative_ppa_passing = cumulative_ppa.get('passing', {})
#         cumulative_ppa_rushing = cumulative_ppa.get('rushing', {})
        
#         success_rates = advanced_box.get('successRates', {})
#         success_rate_overall = success_rates.get('overall', {})
#         success_rate_standard_downs = success_rates.get('standardDowns', {})
#         success_rate_passing_downs = success_rates.get('passingDowns', {})
        
#         explosiveness = advanced_box.get('explosiveness', {})
#         explosiveness_overall = explosiveness.get('overall', {})
        
#         rushing = advanced_box.get('rushing', {})
#         havoc = advanced_box.get('havoc', {})
#         scoring_opportunities = advanced_box.get('scoringOpportunities', {})
#         field_position = advanced_box.get('fieldPosition', {})

#         # Extract advanced game stats
#         offense = advanced_game.get('offense', {})
#         offense_standard_downs = offense.get('standardDowns', {})
#         offense_passing_downs = offense.get('passingDowns', {})
#         offense_rushing_plays = offense.get('rushingPlays', {})
#         offense_passing_plays = offense.get('passingPlays', {})
        
#         defense = advanced_game.get('defense', {})
#         defense_standard_downs = defense.get('standardDowns', {})
#         defense_passing_downs = defense.get('passingDowns', {})
#         defense_rushing_plays = defense.get('rushingPlays', {})
#         defense_passing_plays = defense.get('passingPlays', {})

#         # Prepare values, defaulting to NULL for missing stats
#         values = (
#             game_id,
#             season,
#             week,
#             seasonType,
#             team_id,
#             team_name,
#             basic.get("conference"),
#             basic.get("homeAway"),
#             basic.get("points"),
#             stats.get("firstDowns"),
#             stats.get("thirdDownEff"),
#             stats.get("fourthDownEff"),
#             stats.get("totalYards"),
#             stats.get("netPassingYards"),
#             stats.get("completionAttempts"),
#             stats.get("yardsPerPass"),
#             stats.get("rushingYards"),
#             stats.get("rushingAttempts"),
#             stats.get("yardsPerRushAttempt"),
#             stats.get("totalPenaltiesYards"),
#             stats.get("turnovers"),
#             stats.get("fumblesLost"),
#             stats.get("interceptions"),
#             stats.get("possessionTime"),
#             stats.get("passesDeflected"),
#             stats.get("qbHurries"),
#             stats.get("sacks"),
#             stats.get("tackles"),
#             stats.get("defensiveTDs"),
#             stats.get("tacklesForLoss"),
#             stats.get("totalFumbles"),
#             stats.get("fumblesRecovered"),
#             stats.get("passesIntercepted"),
#             stats.get("interceptionTDs"),
#             stats.get("interceptionYards"),
#             stats.get("kickingPoints"),
#             stats.get("kickReturns"),
#             stats.get("kickReturnTDs"),
#             stats.get("kickReturnYards"),
#             stats.get("passingTDs"),
#             stats.get("puntReturns"),
#             stats.get("puntReturnTDs"),
#             stats.get("puntReturnYards"),
#             stats.get("rushingTDs"),
#             ppa_overall.get('total'),
#             ppa_overall.get('quarter1'),
#             ppa_overall.get('quarter2'),
#             ppa_overall.get('quarter3'),
#             ppa_overall.get('quarter4'),
#             ppa_passing.get('total'),
#             ppa_passing.get('quarter1'),
#             ppa_passing.get('quarter2'),
#             ppa_passing.get('quarter3'),
#             ppa_passing.get('quarter4'),
#             ppa_rushing.get('total'),
#             ppa_rushing.get('quarter1'),
#             ppa_rushing.get('quarter2'),
#             ppa_rushing.get('quarter3'),
#             ppa_rushing.get('quarter4'),
#             cumulative_ppa_overall.get('total'),
#             cumulative_ppa_overall.get('quarter1'),
#             cumulative_ppa_overall.get('quarter2'),
#             cumulative_ppa_overall.get('quarter3'),
#             cumulative_ppa_overall.get('quarter4'),
#             cumulative_ppa_passing.get('total'), 
#             cumulative_ppa_passing.get('quarter1'),
#             cumulative_ppa_passing.get('quarter2'),
#             cumulative_ppa_passing.get('quarter3'),
#             cumulative_ppa_passing.get('quarter4'),
#             cumulative_ppa_rushing.get('total'),
#             cumulative_ppa_rushing.get('quarter1'),
#             cumulative_ppa_rushing.get('quarter2'),
#             cumulative_ppa_rushing.get('quarter3'),
#             cumulative_ppa_rushing.get('quarter4'),
#             success_rate_overall.get('total'),
#             success_rate_overall.get('quarter1'),
#             success_rate_overall.get('quarter2'),
#             success_rate_overall.get('quarter3'),
#             success_rate_overall.get('quarter4'),
#             success_rate_standard_downs.get('total'),
#             success_rate_standard_downs.get('quarter1'),
#             success_rate_standard_downs.get('quarter2'),
#             success_rate_standard_downs.get('quarter3'),
#             success_rate_standard_downs.get('quarter4'),
#             success_rate_passing_downs.get('total'),
#             success_rate_passing_downs.get('quarter1'),
#             success_rate_passing_downs.get('quarter2'),
#             success_rate_passing_downs.get('quarter3'),
#             success_rate_passing_downs.get('quarter4'),
#             explosiveness_overall.get('total'),
#             explosiveness_overall.get('quarter1'),
#             explosiveness_overall.get('quarter2'),
#             explosiveness_overall.get('quarter3'),
#             explosiveness_overall.get('quarter4'),
#             rushing.get('powerSuccess'),
#             rushing.get('stuffRate'),
#             rushing.get('lineYards'),
#             rushing.get('lineYardsAverage'),
#             rushing.get('secondLevelYards'),
#             rushing.get('secondLevelYardsAverage'),
#             rushing.get('openFieldYards'),
#             rushing.get('openFieldYardsAverage'),
#             havoc.get('total'),
#             havoc.get('frontSeven'),
#             havoc.get('db'),
#             scoring_opportunities.get('opportunities'),
#             scoring_opportunities.get('points'),
#             scoring_opportunities.get('pointsPerOpportunity'),
#             field_position.get('averageStart'),
#             field_position.get('averageStartingPredictedPoints'),
#             offense.get('plays'),
#             offense.get('drives'),
#             offense.get('ppa'),
#             offense.get('totalPPA'),
#             offense.get('successRate'),
#             offense.get('explosiveness'),
#             offense_standard_downs.get('ppa'),
#             offense_standard_downs.get('successRate'),
#             offense_standard_downs.get('explosiveness'),
#             offense_passing_downs.get('ppa'),
#             offense_passing_downs.get('successRate'),
#             offense_passing_downs.get('explosiveness'),
#             offense_rushing_plays.get('ppa'),
#             offense_rushing_plays.get('totalPPA'),
#             offense_rushing_plays.get('successRate'),
#             offense_rushing_plays.get('explosiveness'),
#             offense_passing_plays.get('ppa'),
#             offense_passing_plays.get('totalPPA'),
#             offense_passing_plays.get('successRate'),
#             offense_passing_plays.get('explosiveness'),
#             defense.get('plays'),
#             defense.get('drives'),
#             defense.get('ppa'),
#             defense.get('totalPPA'),
#             defense.get('successRate'),
#             defense.get('explosiveness'),
#             defense_standard_downs.get('ppa'),
#             defense_standard_downs.get('successRate'),
#             defense_standard_downs.get('explosiveness'),
#             defense_passing_downs.get('ppa'),
#             defense_passing_downs.get('successRate'),
#             defense_passing_downs.get('explosiveness'),
#             defense_rushing_plays.get('ppa'),
#             defense_rushing_plays.get('totalPPA'),
#             defense_rushing_plays.get('successRate'),
#             defense_rushing_plays.get('explosiveness'),
#             defense_passing_plays.get('ppa'),
#             defense_passing_plays.get('totalPPA'),
#             defense_passing_plays.get('successRate'),
#             defense_passing_plays.get('explosiveness')
#         )

#         cursor.execute("""
#             INSERT OR REPLACE INTO Teams_Games_Stats (
#                 game_id, season, week, seasonType, team_id, team, conference, homeAway, points,
#                 firstDowns, thirdDownEff, fourthDownEff, totalYards, netPassingYards,
#                 completionAttempts, yardsPerPass, rushingYards, rushingAttempts,
#                 yardsPerRushAttempt, totalPenaltiesYards, turnovers, fumblesLost,
#                 interceptions, possessionTime, passesDeflected, qbHurries, sacks,
#                 tackles, defensiveTDs, tacklesForLoss, totalFumbles, fumblesRecovered,
#                 passesIntercepted, interceptionTDs, interceptionYards, kickingPoints,
#                 kickReturns, kickReturnTDs, kickReturnYards, passingTDs, puntReturns,
#                 puntReturnTDs, puntReturnYards, rushingTDs,
#                 ppa_overall_total, ppa_overall_quarter1, ppa_overall_quarter2,
#                 ppa_overall_quarter3, ppa_overall_quarter4, ppa_passing_total,
#                 ppa_passing_quarter1, ppa_passing_quarter2, ppa_passing_quarter3,
#                 ppa_passing_quarter4, ppa_rushing_total, ppa_rushing_quarter1,
#                 ppa_rushing_quarter2, ppa_rushing_quarter3, ppa_rushing_quarter4,
#                 cumulative_ppa_overall_total, cumulative_ppa_overall_quarter1,
#                 cumulative_ppa_overall_quarter2, cumulative_ppa_overall_quarter3,
#                 cumulative_ppa_overall_quarter4, cumulative_ppa_passing_total,
#                 cumulative_ppa_passing_quarter1, cumulative_ppa_passing_quarter2,
#                 cumulative_ppa_passing_quarter3, cumulative_ppa_passing_quarter4,
#                 cumulative_ppa_rushing_total, cumulative_ppa_rushing_quarter1,
#                 cumulative_ppa_rushing_quarter2, cumulative_ppa_rushing_quarter3,
#                 cumulative_ppa_rushing_quarter4, success_rate_overall_total,
#                 success_rate_overall_quarter1, success_rate_overall_quarter2,
#                 success_rate_overall_quarter3, success_rate_overall_quarter4,
#                 success_rate_standard_downs_total, success_rate_standard_downs_quarter1,
#                 success_rate_standard_downs_quarter2, success_rate_standard_downs_quarter3,
#                 success_rate_standard_downs_quarter4, success_rate_passing_downs_total,
#                 success_rate_passing_downs_quarter1, success_rate_passing_downs_quarter2,
#                 success_rate_passing_downs_quarter3, success_rate_passing_downs_quarter4,
#                 explosiveness_overall_total, explosiveness_overall_quarter1,
#                 explosiveness_overall_quarter2, explosiveness_overall_quarter3,
#                 explosiveness_overall_quarter4, rushing_power_success, rushing_stuff_rate,
#                 rushing_line_yards, rushing_line_yards_average, rushing_second_level_yards,
#                 rushing_second_level_yards_average, rushing_open_field_yards,
#                 rushing_open_field_yards_average, havoc_total, havoc_front_seven, havoc_db,
#                 scoring_opportunities_opportunities, scoring_opportunities_points,
#                 scoring_opportunities_points_per_opportunity, field_position_average_start,
#                 field_position_average_predicted_points,
#                 offense_plays, offense_drives, offense_ppa, offense_total_ppa,
#                 offense_success_rate, offense_explosiveness,
#                 offense_standard_downs_ppa, offense_standard_downs_success_rate,
#                 offense_standard_downs_explosiveness, offense_passing_downs_ppa,
#                 offense_passing_downs_success_rate, offense_passing_downs_explosiveness,
#                 offense_rushing_plays_ppa, offense_rushing_plays_total_ppa,
#                 offense_rushing_plays_success_rate, offense_rushing_plays_explosiveness,
#                 offense_passing_plays_ppa, offense_passing_plays_total_ppa,
#                 offense_passing_plays_success_rate, offense_passing_plays_explosiveness,
#                 defense_plays, defense_drives, defense_ppa, defense_total_ppa,
#                 defense_success_rate, defense_explosiveness,
#                 defense_standard_downs_ppa, defense_standard_downs_success_rate,
#                 defense_standard_downs_explosiveness, defense_passing_downs_ppa,
#                 defense_passing_downs_success_rate, defense_passing_downs_explosiveness,
#                 defense_rushing_plays_ppa, defense_rushing_plays_total_ppa,
#                 defense_rushing_plays_success_rate, defense_rushing_plays_explosiveness,
#                 defense_passing_plays_ppa, defense_passing_plays_total_ppa,
#                 defense_passing_plays_success_rate, defense_passing_plays_explosiveness
#             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
#         """, values)

#     # Avoid API rate limits
#     time.sleep(1)

# conn.commit()
# conn.close()
# print(f"Populated Teams_Games_Stats for year {year}, seasonType {seasonType}" + (f", week {week}" if week is not None else ""))