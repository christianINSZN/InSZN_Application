const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;
const dbPath = process.env.SQLITE_DB_PATH || './data/db/cfb_database.db';
const repoDbPath = path.join(__dirname, 'data/db/cfb_database.db');

const getDefaultYear = () => 2025; // Align with App.js default, update to 2025 when needed


// Ensure database directory exists and copy database from repo to disk
console.log(`Copying database from ${repoDbPath} to ${dbPath}`);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.copyFileSync(repoDbPath, dbPath);

const stats = fs.statSync(dbPath);
console.log(`Database file at: ${dbPath}, size: ${stats.size} bytes`);
if (stats.size === 0) {
    console.error('Database file is empty');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
        db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
            if (err) {
                console.error('Error querying tables:', err.message);
            } else {
                console.log('Available tables:', rows.map(row => row.name));
            }
        });
    }
});

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.json({ message: 'API server is running' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

/* Players */
/* Players Dashboard */
app.get('/api/playerdashboard/:year', (req, res) => {
  const { year } = req.params;

  db.all('SELECT * FROM Players_Basic_Grades WHERE year = ?', [year], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No players found for the given year');
    } else {
      res.json(rows); // Return all rows as an array
    }
  });
});

/* Players Landing Page */
app.get('/api/player_headline/:year/:playerId', (req, res) => {
  const { playerId, year } = req.params;
  db.get('SELECT * FROM Players_Basic_Grades WHERE playerId = ? AND year = ?', [playerId, year], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

app.get('/api/player_metadata/:year/:playerId', (req, res) => {
  const { playerId, year } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND year = ?', [playerId, year], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

app.get('/api/player_games/:year/:playerId', (req, res) => {
  const { playerId, year } = req.params;
  db.get('SELECT team FROM Players_Basic WHERE playerId = ? AND year = ?', [playerId, year], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      const team = row.team.toLowerCase();
      db.all('SELECT * FROM Teams_Games WHERE LOWER(team) = ? AND season = ?', [team, year], (err, rows) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          res.json(rows);
        }
      });
    }
  });
});

/* Players Dashboard QB Data */
/* QB Specific */
app.get('/api/player_qb_list', (req, res) => {
  db.all('SELECT * FROM Players_Basic WHERE position = "QB"', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No QBs found');
    } else {
      res.json(rows); // <-- no extra []
    }
  });
});

app.get('/api/player_metadata_qb/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "QB"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
}); 

app.get('/api/player_passing_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;

  db.all(
    `SELECT pgw.*, pcw.*, ppw.*, pdw.*, ptipw.*
     
    FROM Players_PassingGrades_Weekly pgw
     
    LEFT JOIN Players_PassingDepth_Weekly pdw
    ON pgw.playerId = pdw.playerId
    AND pgw.year = pdw.year
    AND pgw.week = pdw.week
    AND pgw.seasonType = pdw.seasonType
    
    LEFT JOIN Players_PassingConcept_Weekly pcw
    ON pgw.playerId = pcw.playerId
    AND pgw.year = pcw.year
    AND pgw.week = pcw.week
    AND pgw.seasonType = pcw.seasonType

    LEFT JOIN Players_PassingTimeInPocket_Weekly ptipw
    ON pgw.playerId = ptipw.playerId
    AND pgw.year = ptipw.year
    AND pgw.week = ptipw.week
    AND pgw.seasonType = ptipw.seasonType


    LEFT JOIN Players_PassingPressure_Weekly ppw
    ON pgw.playerId = ppw.playerId
    AND pgw.year = ppw.year
    AND pgw.week = ppw.week
    AND pgw.seasonType = ppw.seasonType
     
    WHERE pgw.playerId = ? AND pgw.year = ? AND pgw.week = ? AND pgw.seasonType = ?`,
    [playerId, year, week, seasonType],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        res.status(404).send('Player weekly data not found');
      } else {
        // Flatten the joined rows to avoid nested objects if needed
        const flattenedRows = rows.map(row => {
          const flattened = { ...row };
          // Handle potential column name conflicts (e.g., if tables have overlapping columns)
          // Example: Alias conflicting columns if needed (adjust based on actual schema)
          // if ('grade' in row && 'pressure_grade' in row) {
          //   flattened.grades_grade = row.grade;
          //   flattened.pressure_grade = row.pressure_grade;
          //   delete flattened.grade; // Remove duplicate if aliased
          // }
          return flattened;
        });
        res.json(flattenedRows);
      }
    }
  );
});

app.get('/api/player_percentiles_QB/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_QB WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for player');
      } else {
        res.json(row);
      }
    }
  );
});

app.get('/api/all_player_percentiles_QB/:year', (req, res) => {
  const { year } = req.params;
  db.all(
    'SELECT * FROM Players_Full_Percentiles_QB WHERE year = ?',
    [year],
    (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!rows || rows.length === 0) {
        res.status(404).send('No percentile data found for the specified year');
      } else {
        const result = rows.reduce((acc, row) => ({
          ...acc,
          [row.playerId]: {
            name: row.name,
            yards: row.yards,
            ypa: row.ypa,
            completion: row.completion_percent,
            targetDepth: row.avg_depth_of_target,
            passingTouchdowns: row.touchdowns,
            passingSnaps: row.passing_snaps,
            accuracy: row.accuracy_percent,
            twp_rate: row.twp_rate,
            btt_rate: row.btt_rate,
            qb_rating: row.qb_rating,
            def_gen_pressures: row.def_gen_pressures,
            pressure_to_sack_rate: row.pressure_to_sack_rate,
            sack_percent: row.sack_percent,
            hit_as_threw: row.hit_as_threw,
            avg_time_to_throw: row.avg_time_to_throw,

          },
        }), {});
        res.json(result);
      }
    }
  );
});

app.get('/api/player_passing_season_depth/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_PassingDepth_Season WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('Player not found for the given year');
      } else {
        res.json(row);
      }
    }
  );
});

/* Players Dashboard RB Data */
/* RB Specific */
app.get('/api/player_percentiles_RB/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.all(
    `
      SELECT
        pgw.playerId, pgw.year,
        pgw.percentile_grades_pass_block AS percentile_grades_pass_block_rushing, pdw.percentile_grades_pass_block AS percentile_grades_pass_block_receiving,
        pgw.percentile_grades_pass_route AS percentile_grades_pass_route_rushing, pdw.percentile_grades_pass_route AS percentile_grades_pass_route_receiving,
        pgw.percentile_longest AS percentile_longest_rushing, pdw.percentile_longest AS percentile_longest_receiving,
        pgw.percentile_touchdowns AS percentile_touchdowns_rushing, pdw.percentile_touchdowns AS percentile_touchdowns_receiving,
        pgw.percentile_yards AS percentile_yards_rushing, pdw.percentile_yards AS percentile_yards_receiving,
        pgw.touchdowns AS touchdowns_rushing, pdw.touchdowns AS touchdowns_receiving,
        pgw.yards AS yards_rushing, pdw.yards AS yards_receiving,
        pgw.*, pdw.*, pfb.*
      FROM Players_Full_Percentiles_RB_Rushing pgw
      LEFT JOIN Players_Full_Percentiles_RB_Receiving pdw
      ON pgw.playerId = pdw.playerId AND pgw.year = pdw.year
      LEFT JOIN Players_Full_Percentiles_RB_Blocking pfb
      ON pgw.playerId = pfb.playerId AND pgw.year = pfb.year
      WHERE pgw.playerId = ? AND pgw.year = ?
    `,
    [playerId, year],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        res.status(404).send('Player percentile data not found');
      } else {
        // Take only the first row and send as an object
        const row = rows[0];
        res.json(row);
      }
    }
  );
});

app.get('/api/player_rushing_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;
  db.all(
    'SELECT * FROM Players_RushingGrades_Weekly WHERE playerId = ? AND year = ? AND week = ? AND seasonType = ?',
    [playerId, year, week, seasonType],
    (err, rows) => {
      if (err) {
        console.error(`Database error: ${err.message}`);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        console.log(`No data found for ${playerId}, ${year}, week ${week}, ${seasonType}`);
        res.status(404).send('Player passing depth data not found');
      } else {
        console.log(`Found passing depth data for ${playerId}:`, rows);
        res.json(rows);
      }
    }
  );
});

/* Receiving */
/* WR Specific */
app.get('/api/player_percentiles_WR/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_WR WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for player');
      } else {
        res.json(row);
      }
    }
  );
});

/* TE Specific */
app.get('/api/player_percentiles_TE/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.all(
    `
      SELECT pTEr.*, pTEb.*
      FROM Players_Full_Percentiles_TE_Receiving pTEr
      LEFT JOIN Players_Full_Percentiles_TE_Blocking pTEb
      ON pTEr.playerId = pTEb.playerId AND pTEr.year = pTEb.year
      WHERE pTEr.playerId = ? AND pTEr.year = ?
    `,
    [playerId, year],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        res.status(404).send('Player percentile data not found');
      } else {
        // Take only the first row and send as an object
        const row = rows[0];
        res.json(row);
      }
    }
  );
});

app.get('/api/player_receiving_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;

  db.all(
    `SELECT rgw.*, rcw.*, rsw.*, rdw.*
     
    FROM Players_ReceivingGrades_Weekly rgw
     
    LEFT JOIN Players_ReceivingDepth_Weekly rdw
    ON rgw.playerId = rdw.playerId
    AND rgw.year = rdw.year
    AND rgw.week = rdw.week
    AND rgw.seasonType = rdw.seasonType
    
    LEFT JOIN Players_ReceivingConcept_Weekly rcw
    ON rgw.playerId = rcw.playerId
    AND rgw.year = rcw.year
    AND rgw.week = rcw.week
    AND rgw.seasonType = rcw.seasonType

    LEFT JOIN Players_ReceivingScheme_Weekly rsw
    ON rgw.playerId = rsw.playerId
    AND rgw.year = rsw.year
    AND rgw.week = rsw.week
    AND rgw.seasonType = rsw.seasonType
     
    WHERE rgw.playerId = ? AND rgw.year = ? AND rgw.week = ? AND rgw.seasonType = ?`,
    [playerId, year, week, seasonType],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        res.status(404).send('Player weekly data not found');
      } else {
        // Flatten the joined rows to avoid nested objects if needed
        const flattenedRows = rows.map(row => {
          const flattened = { ...row };
          // Handle potential column name conflicts (e.g., if tables have overlapping columns)
          // Example: Alias conflicting columns if needed (adjust based on actual schema)
          // if ('grade' in row && 'pressure_grade' in row) {
          //   flattened.grades_grade = row.grade;
          //   flattened.pressure_grade = row.pressure_grade;
          //   delete flattened.grade; // Remove duplicate if aliased
          // }
          return flattened;
        });
        res.json(flattenedRows);
      }
    }
  );
});

app.get('/api/player_receiving_season_depth/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_ReceivingDepth_Season WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('Player not found for the given year');
      } else {
        res.json(row);
      }
    }
  );
});

/* Blocking */
/* Guard Specific */
app.get('/api/player_percentiles_G/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_G WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for player');
      } else {
        res.json(row);
      }
    }
  );
});

/* Tackle Specific */
app.get('/api/player_percentiles_T/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_T WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for player');
      } else {
        res.json(row);
      }
    }
  );
});

/* Center Specific */
app.get('/api/player_percentiles_C/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_C_Blocking WHERE playerId = ? AND year = ?',
    [playerId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for player');
      } else {
        res.json(row);
      }
    }
  );
});

app.get('/api/player_blocking_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;

  db.all(
    `SELECT rbg.*, rbp.*, rbr.*
     
    FROM Players_BlockingGrades_Weekly rbg
     
    LEFT JOIN Players_BlockingPass_Weekly rbp
    ON rbg.playerId = rbp.playerId
    AND rbg.year = rbp.year
    AND rbg.week = rbp.week
    AND rbg.seasonType = rbp.seasonType
    
    LEFT JOIN Players_BlockingRun_Weekly rbr
    ON rbg.playerId = rbr.playerId
    AND rbg.year = rbr.year
    AND rbg.week = rbr.week
    AND rbg.seasonType = rbr.seasonType
     
    WHERE rbg.playerId = ? AND rbg.year = ? AND rbg.week = ? AND rbg.seasonType = ?`,
    [playerId, year, week, seasonType],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        res.status(500).send(err.message);
      } else if (!rows.length) {
        res.status(404).send('Player weekly data not found');
      } else {
        // Flatten the joined rows to avoid nested objects if needed
        const flattenedRows = rows.map(row => {
          const flattened = { ...row };
          // Handle potential column name conflicts (e.g., if tables have overlapping columns)
          // Example: Alias conflicting columns if needed (adjust based on actual schema)
          // if ('grade' in row && 'pressure_grade' in row) {
          //   flattened.grades_grade = row.grade;
          //   flattened.pressure_grade = row.pressure_grade;
          //   delete flattened.grade; // Remove duplicate if aliased
          // }
          return flattened;
        });
        res.json(flattenedRows);
      }
    }
  );
});

/* Teams */
app.get('/api/teams', (req, res) => {
  const { year = getDefaultYear(), id } = req.query; // Add id as a query parameter
  console.log(`Fetching teams data for year: ${year}, id: ${id}`);
  let query = 'SELECT * FROM Teams WHERE year = ?';
  const params = [year];
  if (id) {
    query += ' AND id = ?';
    params.push(id);
  }
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(`Database error: ${err.message}`);
      res.status(500).send(err.message);
    } else {
      console.log(`Found ${rows.length} rows for year: ${year}, id: ${id}`);
      if (rows.length === 0) {
        res.status(404).json({ message: 'No teams data found for the specified year and/or id' });
      } else {
        res.json(rows);
      }
    }
  });
});

// Grades endpoint
app.get('/api/teamsGrades/:id/:year/grades', (req, res) => {
    const { id, year } = req.params;
    const idNum = parseInt(id);
    const yearNum = parseInt(year);
    if (isNaN(idNum) || isNaN(yearNum)) {
        console.log(`Invalid parameters: id=${id}, year=${year}`);
        return res.status(400).json({ error: 'Invalid id or year parameter' });
    }
    console.log(`Fetching grades for team: id=${idNum}, year=${yearNum}`);
    db.all('SELECT * FROM Teams_Game_Grades WHERE team_id = ? AND season = ?', [idNum, yearNum], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!rows.length) {
            console.log(`No grades found for team id=${idNum}, year=${yearNum}`);
            return res.status(404).json({ error: 'No grades found for this team and year' });
        }
        res.json(rows);
    });
});

app.get('/api/teams_stats/:id/:year/stats', (req, res) => {
    const { id, year } = req.params;
    const idNum = parseInt(id);
    const yearNum = parseInt(year);
    if (isNaN(idNum) || isNaN(yearNum)) {
        console.log(`Invalid parameters: id=${id}, year=${year}`);
        return res.status(400).json({ error: 'Invalid id or year parameter' });
    }
    console.log(`Fetching stats for team: id=${idNum}, year=${yearNum}`);
    db.all('SELECT * FROM Teams_Games_Stats WHERE team_id = ? AND season = ?', [idNum, yearNum], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!rows.length) {
            console.log(`No stats found for team id=${idNum}, year=${yearNum}`);
            return res.status(404).json({ error: 'No stats found for this team and year' });
        }
        res.json(rows);
    });
});

app.get('/api/teams/records/:year', (req, res) => {
  const { year } = req.params;
  if (isNaN(year)) {
    console.log(`Invalid year parameter: ${year}`);
    return res.status(400).json({ error: 'Invalid year parameter' });
  }
  console.log(`Received request for /api/teams/records/${year}`); // Debug log
  db.all('SELECT * FROM Teams_Records WHERE year = ?', [year], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!rows.length) {
      console.log(`No records found for year: ${year}`); // Debug log
      return res.status(404).json({ error: 'No records found for this year' });
    }
    res.json(rows);
  });
});

app.get('/api/teams/:id/:year', (req, res) => {
    const { id, year } = req.params;
    if (isNaN(id) || isNaN(year)) {
        console.log(`Invalid parameters: id=${id}, year=${year}`);
        return res.status(400).json({ error: 'Invalid id or year parameter' });
    }
    console.log(`Fetching team: id=${id}, year=${year}`);
    db.get('SELECT * FROM Teams WHERE id = ? AND year = ?', [id, year], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!row) {
            console.log(`No team found for id=${id}, year=${year}`);
            return res.status(404).json({ error: 'Team not found' });
        }
        // Parse JSON fields if needed
        if (row.logos && typeof row.logos === 'string') {
            try {
                row.logos = JSON.parse(row.logos.replace(/'/g, '"'));
            } catch (e) {
                console.error('Error parsing logos:', e.message);
                row.logos = [];
            }
        }
        res.json(row);
    });
});

app.get('/api/teams/:id/:year/games', (req, res) => {
  const { id, year } = req.params;
  console.log(`Fetching games for teamId: ${id}, year: ${year}`); // Debug log
  db.all(
    'SELECT * FROM Teams_Games WHERE season = ? AND (homeId = ? OR awayId = ?)',
    [year, id, id],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) {
        console.log(`No games found for teamId: ${id}, year: ${year}`);
        return res.status(404).json({ error: 'No games found for this team and year' });
      }
      res.json(rows);
    }
  );
});


app.get('/api/teams/:id/:year/stats', (req, res) => {
  const { id, year } = req.params;
  console.log(`Received request for /api/teams/${id}/${year}/stats`); // Debug log
  db.all('SELECT * FROM Teams_Stats_Season WHERE teamId = ? AND season = ?', [id, year], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!rows.length) {
      console.log(`No stats found for teamId: ${id}, year: ${year}`);
      return res.status(404).json({ error: 'No stats found for this team and year' });
    }
    res.json(rows);
  });
});

app.get('/api/teams/:id/:year/top-performers', (req, res) => {
  const { id, year } = req.params;
  console.log(`Received request for /api/teams/${id}/${year}/top-performers`); // Debug log
  db.all(
    'SELECT playerId, year, name, team, position, yards FROM Players_Basic_Grades WHERE teamID = ? AND year = ?',
    [id, year],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!rows.length) {
        console.log(`No performers found for teamId: ${id}, year: ${year}`);
        return res.status(404).json({ error: 'No performers found for this team and year' });
      }
      // Find top performers
      const topPasser = rows
        .filter(p => p.position === 'QB')
        .reduce((max, curr) => (max.yards > curr.yards ? max : curr), { yards: -Infinity });
      const topRusher = rows
        .filter(p => p.position === 'RB')
        .reduce((max, curr) => (max.yards > curr.yards ? max : curr), { yards: -Infinity });
      const topReceiver = rows
        .filter(p => p.position === 'WR')
        .reduce((max, curr) => (max.yards > curr.yards ? max : curr), { yards: -Infinity });
      res.json({
        topPasser: topPasser.yards !== -Infinity ? { playerId: topPasser.playerId, name: topPasser.name, yards: topPasser.yards } : null,
        topRusher: topRusher.yards !== -Infinity ? { playerId: topRusher.playerId, name: topRusher.name, yards: topRusher.yards } : null,
        topReceiver: topReceiver.yards !== -Infinity ? { playerId: topReceiver.playerId, name: topReceiver.name, yards: topReceiver.yards } : null,
      });
    }
  );
});

app.get('/api/teams/:id/:year/matchups', (req, res) => {
  const { id, year } = req.params;
  console.log(`Fetching matchups for teamId: ${id}, year: ${year}`); // Debug log

  db.all(
    'SELECT id, startDate, startTimeTBD, tv, neutralSite, conferenceGame, status, venueName, venueCity, venueState, homeTeamId, homeTeamName, homeTeamLogo, awayTeamId, awayTeamName, awayTeamLogo, spread, overUnder, homeMoneyline, awayMoneyline FROM Teams_Matchup WHERE year = ? AND (homeTeamId = ? OR awayTeamId = ?)',
    [year, id, id],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) {
        console.log(`No matchups found for teamId: ${id}, year: ${year}`);
        return res.status(404).json({ error: 'No matchups found for this team and year' });
      }
      res.json(rows);
    }
  );
});

/* Home Page Endpoints */
app.get('/api/players/ppa/:year/top-qbs', (req, res) => {
  const { year } = req.params;
  console.log(`Fetching top QBs for year: ${year}`);
  db.all(
    `
    SELECT playerId, year, name, position, team, conference, averagePPA_pass, teamID
    FROM Players_PPA_QB
    WHERE year = ? AND position = 'QB' AND min_passing_threshold_hit = 1
    ORDER BY averagePPA_pass DESC
    LIMIT 25
    `,
    [year],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) {
        console.log(`No QBs found for year: ${year}`);
        return res.status(404).json({ error: 'No QBs found for this year with minimum passing threshold' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/players/ppa/:year/top-rbs', (req, res) => {
  const { year } = req.params;
  console.log(`Fetching top RBs for year: ${year}`);
  db.all(
    `
    SELECT playerId, year, name, position, team, conference, averagePPA_rush, teamID
    FROM Players_PPA_RB
    WHERE year = ? AND position = 'RB' AND min_passing_threshold_hit = 1
    ORDER BY averagePPA_rush DESC
    LIMIT 25
    `,
    [year],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) {
        console.log(`No RBs found for year: ${year}`);
        return res.status(404).json({ error: 'No RBs found for this year with minimum passing threshold' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/teams/rankings/:year/:week', (req, res) => {
  const { year, week } = req.params;
  console.log(`Fetching team rankings for year: ${year}, week: ${week}`);
  db.all(
    `
    SELECT teamId, year, week, school, coaches_poll_rank, ap_poll_rank, SP_Ranking, ELO_Rating, FPI_Ranking, SP_Rating, SP_Off_Rating, SP_Def_Rating, SP_Off_Ranking, SP_Def_Ranking, SOS, SOR
    FROM Teams_Rankings
    WHERE year = ? AND week = ?
    ORDER BY ap_poll_rank ASC
    LIMIT 25
    `,
    [year, week],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) {
        console.log(`No team rankings found for year: ${year}, week: ${week}`);
        return res.status(404).json({ error: 'No team rankings found for this year and week' });
      }
      res.json(rows);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});