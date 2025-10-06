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
    ### Need to check this properly updates ###
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/teams/populate_teams_games.py", Run first; change week 

    ## Populate Players Basic Info and Grades ###
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/players/populate_players_basic.py",
      "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/players/populate_players_basic_grades.py", #no need for all teams
    
    ## PASSING SEASON DATA ####
    #Passing Concepts Season
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_concept_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_depth_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_pressure_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_passing_time_in_pocket_season.py",
    
    # # Passing Concepts Weekly
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_concept_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_depth_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_pressure_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_passing_time_in_pocket_weekly.py",

    # # # Team Passing Concepts Weekly
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_concept_weekly.py",
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_depth_weekly.py",
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_grades_weekly.py",
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_pressure_weekly.py",
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/weekly/populate_team_passing_time_in_pocket_weekly.py",
   
    # # ### RUSHING SEASON DATA ####
    # # # Rushing Concepts Season
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/season/populate_rushing_grades_season.py",
    
    # # # Rushing Concepts Weekly
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/weekly/populate_rushing_grades_weekly.py",

    # # # Team Rushing Concepts Weekly
    #  "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/weekly/populate_team_rushing_grades_weekly.py",
    
    # # #### RECEIVING SEASON DATA ####
    # # # Receiving Concepts Season
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_concept_season.py",
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_depth_season.py",
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_grades_season.py",
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_receiving_scheme_season.py",
    
    # # # Receiving Concepts Weekly
     "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_concept_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_depth_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_receiving_scheme_weekly.py",

    # # # Team Receiving Concepts Weekly
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_concept_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_depth_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/weekly/populate_team_receiving_scheme_weekly.py",
    
    # # #### BLOCKING SEASON DATA ####
    # # Blocking Concepts Season
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_blocking_grades_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_pass_blocking_season.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_run_blocking_season.py",
    
    # # Blocking Concepts Weekly
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_blocking_grades_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_pass_blocking_weekly.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_run_blocking_weekly.py",

    # # Team Blocking Concepts Weekly
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_blocking_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_pass_blocking_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/weekly/populate_team_run_blocking_weekly.py",
    
    # #### DEFENSE SEASON DATA ####
    # # Defense Concepts Season
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_coverage_grades_season.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_coverage_scheme_season.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_defense_grades_season.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_pass_rush_season.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_run_defense_season.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/season/populate_slot_coverage_season.py",

    # # Defense Concepts Weekly
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_coverage_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_coverage_scheme_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_defense_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_pass_rush_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_run_defense_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_slot_coverage_weekly.py",

    # # Team Defense Concepts Weekly
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_coverage_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_coverage_scheme_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_defense_grades_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_pass_rush_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_run_defense_weekly.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/defense/weekly/populate_team_slot_coverage_weekly.py",

    # ## PERCENTILES ####
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/passing/season/populate_full_percentiles_qb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/rushing/season/populate_full_percentiles_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_rb.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_te.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/receiving/season/populate_full_percentiles_wr.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_c.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_g.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_rb.py",
    # "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_t.py",
    "/Users/christianberry/Desktop/Perennial Data/perennial-data-app/data/scripts/populate/blocking/season/populate_full_percentiles_te.py",
    #### END ####



    # run team games, then team stats, then team records, then team next matchup then update the top teams and team rankings at the end



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