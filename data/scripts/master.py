import os
import subprocess
from pathlib import Path
import json
import sqlite3

# Database connection
DB_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/server/data/db/cfb_database.db")
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Define constants
CONFIG_FILE = Path("/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/config/config.json")
with open(CONFIG_FILE, 'r') as f:
    config = json.load(f)
teams = config.get("teams", ["Kentucky"])
year = config.get("years", [2025])[0]

script_order = [

    #

    # Runbook #
    # Terminal Command Runs - Daily#
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_games.py", #1.1 (Run twice -- one for last week to populate scores and one for next week)
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_games_stats.py", #2.1 (DO NOT RUN HERE, Open Terminal and run with args for year, seasonType, week)
    
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_records.py", #3.1 (Run once after stats populated)
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_next_matchup.py", #3.2 (Run once after stats populated)
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_stats.py", #3.3 (Run once after stats populated)

    # Batch update of all PFF Data # 4.X
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_concept_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_depth_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_pressure_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_time_in_pocket_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_concept_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_depth_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_pressure_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_time_in_pocket_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/season/populate_rushing_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/weekly/populate_rushing_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_concept_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_depth_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_scheme_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_concept_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_depth_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_scheme_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_blocking_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_pass_blocking_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_run_blocking_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_blocking_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_pass_blocking_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_run_blocking_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_coverage_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_coverage_scheme_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_defense_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_pass_rush_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_run_defense_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_slot_coverage_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_coverage_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_coverage_scheme_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_defense_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_pass_rush_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_run_defense_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_slot_coverage_weekly.py",

    # Batch update of all PFF Percentiles
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_full_percentiles_qb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/season/populate_full_percentiles_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_te.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_wr.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_c.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_g.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_t.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_te.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_full_percentiles_cb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_full_percentiles_db.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_full_percentiles_dl.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_full_percentiles_lbe.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_full_percentiles_s.py",

    # Batch update of all grades
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/players/populate_players_basic_grades.py", #no need for all teams
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_season_grades.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teamsGrades/populate_teams_ratings.py", #no need for all teams

    # Homepage Updates
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/weeklyReports/players_epa_qb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/weeklyReports/players_epa_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/weeklyReports/players_epa_te.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/weeklyReports/players_epa_wr.py",

    # Homepage Updates  
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/weeklyReports/teams_rankings.py", # Do this in terminal bc update week in script at bottom 

    # Go and update 
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/home/TopTeams.js
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/teams/TeamRankings.js
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/games/GamesLanding.js
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/games/scoutingReportsComponents/TeamAReport.js
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/games/scoutingReportsComponents/TeamBReport.js
    # /Users/christianberry/Desktop/Perennial Data/perennial-data-app/src/components/home/WeeklyGames.js
    

    # # # Team Concepts Weekly - DEFUNCT
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_concept_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_depth_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_pressure_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_time_in_pocket_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/weekly/populate_team_rushing_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_concept_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_depth_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_scheme_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_blocking_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_pass_blocking_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_run_blocking_weekly.py",

    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_coverage_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_coverage_scheme_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_defense_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_pass_rush_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_run_defense_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_slot_coverage_weekly.py",

    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/players/populate_players_basic.py",

    #### END ####



    # run team games, then team stats, then team records (from weekly), then team next matchup then update the top teams and team rankings at the end



]

# Iterate over each team in the config
for team in teams:
    env = os.environ.copy()
    env.update({"TEAM": team, "YEAR": str(year)})
    for script in script_order:
        try:
            # Use python3 and ensure environment includes dotenv
            subprocess.run(["python3", script], check=True, env=env)
            print(f"Successfully ran {script} for team {team}")
        except subprocess.CalledProcessError as e:
            print(f"Error running {script} for team {team}: {e}")

conn.close()  # Ensure connection is closed even if an error occurs
print(f"Processing completed for all teams: {teams}")