require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const { Clerk } = require('@clerk/clerk-sdk-node');

const app = express();
const port = process.env.PORT || 3001;
const dbPath = process.env.SQLITE_DB_PATH || './data/db/cfb_database.db';
const repoDbPath = path.join(__dirname, 'data/db/cfb_database.db');
const getDefaultYear = () => 2025;

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('Missing CLERK_SECRET_KEY in environment variables');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });

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

// Handle raw body for Stripe webhooks
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('Webhook event received:', event.type, 'Customer ID:', event.data.object.customer, 'Event Data:', JSON.stringify(event.data.object, null, 2));

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      console.log('Customer fetched in webhook:', JSON.stringify(customer, null, 2));
      const clerkUserId = customer.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.warn('No clerkUserId found in customer metadata for customer:', customer.id);
        // Retry fetching customer after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryCustomer = await stripe.customers.retrieve(subscription.customer);
        console.log('Retry customer fetch:', JSON.stringify(retryCustomer, null, 2));
        const retryClerkUserId = retryCustomer.metadata?.clerkUserId;

        if (!retryClerkUserId) {
          console.error('Retry failed: No clerkUserId in customer metadata:', retryCustomer.id);
          return res.status(400).send('Webhook Error: Missing clerkUserId in customer metadata');
        }

        const plan = subscription.items.data[0]?.price.id === 'price_1SIGOHF6OYpAGuKxF2bIISDL' ? 'pro' : 'premium'; // Replace with your Price IDs
        const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
        await clerk.users.updateUserMetadata(retryClerkUserId, {
          publicMetadata: { subscriptionPlan: plan },
        });
        console.log(`Updated user ${retryClerkUserId} with subscriptionPlan: ${plan}`);
      } else {
        const plan = subscription.items.data[0]?.price.id === 'price_1SIGOHF6OYpAGuKxF2bIISDL' ? 'pro' : 'premium'; // Replace with your Price IDs
        const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: { subscriptionPlan: plan },
        });
        console.log(`Updated user ${clerkUserId} with subscriptionPlan: ${plan}`);
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Apply JSON parsing for other routes
app.use(express.json());

// Subscription Creation Endpoint
app.post('/api/subscriptions/create-subscription', async (req, res) => {
  const { priceId, clerkUserId, paymentMethodId, email } = req.body;
  try {
    if (!clerkUserId) {
      throw new Error('Missing clerkUserId in request body');
    }
    if (!priceId) {
      throw new Error('Missing priceId in request body');
    }
    console.log('Creating subscription for clerkUserId:', clerkUserId, 'with priceId:', priceId, 'paymentMethodId:', paymentMethodId, 'email:', email);

    const customer = await stripe.customers.create({
      metadata: { clerkUserId },
      email: email || null,
    });
    console.log('Customer created:', customer.id, 'Metadata:', customer.metadata);

    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      console.log('Payment method attached:', paymentMethodId);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      default_payment_method: paymentMethodId || null,
      expand: ['latest_invoice.payment_intent'],
    });
    console.log('Subscription created:', subscription);

    if (paymentMethodId && subscription.latest_invoice.status === 'open') {
      try {
        const paidInvoice = await stripe.invoices.pay(subscription.latest_invoice.id, {
          payment_method: paymentMethodId,
        });
        console.log('Invoice payment attempted:', paidInvoice);

        const updatedSubscription = await stripe.subscriptions.retrieve(subscription.id);
        console.log('Updated subscription:', updatedSubscription);

        // Fallback: Update Clerk metadata directly if webhook might fail
        const plan = subscription.items.data[0]?.price.id === 'price_1SIGOHF6OYpAGuKxF2bIISDL' ? 'pro' : 'premium'; // Replace with your Price IDs
        try {
          const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { subscriptionPlan: plan },
          });
          console.log(`Fallback: Updated user ${clerkUserId} with subscriptionPlan: ${plan}`);
        } catch (clerkError) {
          console.error('Fallback Clerk metadata update failed:', clerkError);
        }

        return res.json({
          clientSecret: paidInvoice.payment_intent?.client_secret || null,
          subscriptionId: subscription.id,
          status: updatedSubscription.status,
        });
      } catch (paymentError) {
        console.error('Invoice payment failed:', paymentError);
        return res.status(500).json({
          subscriptionId: subscription.id,
          status: subscription.status,
          clientSecret: null,
          message: 'Invoice payment failed: ' + paymentError.message,
        });
      }
    }

    console.warn('No payment_intent or invoice not open, subscription is incomplete:', subscription.id, 'Invoice status:', subscription.latest_invoice.status);
    return res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice.payment_intent?.client_secret || null,
      message: 'Subscription created but requires payment confirmation',
    });
  } catch (error) {
    console.error('Error creating subscription:', error, 'Response:', error.response?.data);
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/player_years/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.all(
    'SELECT DISTINCT year FROM Players_Basic WHERE playerId = ? ORDER BY year ASC',
    [playerId],
    (err, rows) => {
      if (err) {
        res.status(500).send(err.message);
      } else if (!rows || rows.length === 0) {
        res.status(404).send('No years found for this player');
      } else {
        // Return just an array of years like [2022, 2023]
        res.json(rows.map(r => r.year));
      }
    }
  );
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

app.get('/api/team_passing_weekly/:teamId/:year/:week/:seasonType', (req, res) => {
  const { teamId, year, week, seasonType } = req.params;

  db.all(`
    SELECT *
    FROM Players_PassingGrades_Weekly
    WHERE teamId = ? AND year = ? AND week = ? AND seasonType = ?
    ORDER BY yards DESC
  `, [teamId, year, week, seasonType], (err, rows) => {
    if (err) {
      console.error('DB Error (Passing):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'No passing data' });
    }
    console.log(`Passing: ${rows.length} QBs found`);
    res.json(rows); // ALL players
  });
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
            completion_percent: row.completion_percent,
            avg_depth_of_target: row.avg_depth_of_target,
            touchdowns: row.touchdowns,
            passing_snaps: row.passing_snaps,
            accuracy_percent: row.accuracy_percent,
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
        pgw.percentile_grades_offense AS percentile_grades_offense_rushing, pdw.percentile_grades_offense AS percentile_grades_offense_receiving,
        pgw.percentile_grades_hands_fumble AS percentile_grades_hands_fumble_rishing, pdw.percentile_grades_hands_fumble AS percentile_grades_hands_fumble_receiving,
        pgw.percentile_grades_offense_penalty AS percentile_grades_offense_penalty_rushing,
        pgw.longest AS longest_rushing, pdw.longest AS longest_receiving,
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

app.get('/api/team_rushing_weekly/:teamId/:year/:week/:seasonType', (req, res) => {
  const { teamId, year, week, seasonType } = req.params;

  db.all(`
    SELECT *
    FROM Players_RushingGrades_Weekly
    WHERE teamId = ? AND year = ? AND week = ? AND seasonType = ?
    ORDER BY yards DESC
  `, [teamId, year, week, seasonType], (err, rows) => {
    if (err) {
      console.error('DB Error (Rushing):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'No rushing data' });
    }
    console.log(`Rushing: ${rows.length} RBs found`);
    res.json(rows); // ALL players
  });
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

app.get('/api/player_metadata_rb/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "RB"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
}); 

app.get('/api/all_player_percentiles_RB/:year', (req, res) => {
  const { year } = req.params;
  db.all(
    'SELECT * FROM Players_Full_Percentiles_RB_Rushing WHERE year = ?',
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
            total_touches: row.total_touches,
            longest: row.longest,
            touchdowns: row.touchdowns,
            fumbles: row.fumbles,
            
            routes: row.routes,
            targets: row.targets,
            rec_yards: row.rec_yards,
            yprr: row.yprr,
            elu_recv_mtf: row.elu_recv_mtf,
            
            attempts: row.attempts,
            ypa: row.ypa,
            yco_attempt: row.yco_attempt,
            gap_attempts: row.gap_attempts,
            zone_attempts: row.zone_attempts,

            yards_after_contact: row.yards_after_contact,
            breakaway_percent: row.breakaway_percent,
            breakaway_yards: row.breakaway_yards,
            elu_rush_mtf: row.elu_rush_mtf,
            elusive_rating: row.elusive_rating,

          },
        }), {});
        res.json(result);
      }
    }
  );
});

app.get('/api/player_rb_list', (req, res) => {
  db.all('SELECT * FROM Players_Basic WHERE position = "RB"', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No RBs found');
    } else {
      res.json(rows); // <-- no extra []
    }
  });
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

app.get('/api/player_metadata_wr/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "WR"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
}); 

app.get('/api/player_wr_list', (req, res) => {
  db.all('SELECT * FROM Players_Basic WHERE position = "WR"', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No QBs found');
    } else {
      res.json(rows); // <-- no extra []
    }
  });
});

app.get('/api/all_player_percentiles_WR/:year', (req, res) => {
  const { year } = req.params;
  db.all(
    'SELECT * FROM Players_Full_Percentiles_WR WHERE year = ?',
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
            receptions: row.receptions,
            yards_per_reception: row.yards_per_reception,
            caught_percent: row.caught_percent,
            touchdowns: row.touchdowns,
            
            targets: row.targets,
            routes: row.routes,
            yprr: row.yprr,
            slot_rate: row.slot_rate,
            wide_rate: row.wide_rate,
            
            zone_yards: row.zone_yards,
            zone_receptions: row.zone_receptions,
            zone_yards_per_reception: row.zone_yards_per_reception,
            zone_avg_depth_of_target: row.zone_avg_depth_of_target,
            zone_caught_percent: row.zone_caught_percent,

            man_yards: row.man_yards,
            man_receptions: row.man_receptions,
            man_yards_per_reception: row.man_yards_per_reception,
            man_avg_depth_of_target: row.man_avg_depth_of_target,
            man_caught_percent: row.man_caught_percent,

          },
        }), {});
        res.json(result);
      }
    }
  );
});

app.get('/api/team_receiving_weekly/:teamId/:year/:week/:seasonType', (req, res) => {
  const { teamId, year, week, seasonType } = req.params;

  db.all(`
    SELECT *
    FROM Players_ReceivingGrades_Weekly
    WHERE teamId = ? AND year = ? AND week = ? AND seasonType = ?
    ORDER BY yards DESC
  `, [teamId, year, week, seasonType], (err, rows) => {
    if (err) {
      console.error('DB Error (Receiving):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'No receiving data' });
    }
    console.log(`Receiving: ${rows.length} receivers found`);
    res.json(rows); // ALL players
  });
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

app.get('/api/player_metadata_te/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "TE"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
}); 


app.get('/api/player_te_list', (req, res) => {
  db.all('SELECT * FROM Players_Basic WHERE position = "TE"', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No QBs found');
    } else {
      res.json(rows); // <-- no extra []
    }
  });
});

app.get('/api/all_player_percentiles_TE/:year', (req, res) => {
  const { year } = req.params;
  db.all(
    'SELECT * FROM Players_Full_Percentiles_TE_Receiving WHERE year = ?',
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
            receptions: row.receptions,
            yards_per_reception: row.yards_per_reception,
            caught_percent: row.caught_percent,
            touchdowns: row.touchdowns,
            
            targets: row.targets,
            routes: row.routes,
            yprr: row.yprr,
            slot_rate: row.slot_rate,
            wide_rate: row.wide_rate,
            
            zone_yards: row.zone_yards,
            zone_receptions: row.zone_receptions,
            zone_yards_per_reception: row.zone_yards_per_reception,
            zone_avg_depth_of_target: row.zone_avg_depth_of_target,
            zone_caught_percent: row.zone_caught_percent,

            man_yards: row.man_yards,
            man_receptions: row.man_receptions,
            man_yards_per_reception: row.man_yards_per_reception,
            man_avg_depth_of_target: row.man_avg_depth_of_target,
            man_caught_percent: row.man_caught_percent,

          },
        }), {});
        res.json(result);
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
    'SELECT * FROM Players_Full_Percentiles_G_Blocking WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_g/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "G"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

/* Tackle Specific */
app.get('/api/player_percentiles_T/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_T_Blocking WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_t/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "T"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
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

app.get('/api/player_metadata_c/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position = "C"', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
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

app.get('/api/team_blocking_weekly/:teamId/:year/:week/:seasonType', (req, res) => {
  const { teamId, year, week, seasonType } = req.params;

  db.all(`
    SELECT *
    FROM Players_BlockingGrades_Weekly
    WHERE teamId = ? AND year = ? AND week = ? AND seasonType = ?
  `, [teamId, year, week, seasonType], (err, rows) => {
    if (err) {
      console.error('DB Error (Rushing):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'No blocking data' });
    }
    res.json(rows); // ALL players
  });
});

/* Defense */
/* Defensive Line Specific */
app.get('/api/player_percentiles_DL/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_DL WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_dl/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position IN ("DL", "DT", "DE")', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

app.get('/api/player_defense_line_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;

  db.all(
    `SELECT dgw.*, prw.*, rdw.*
     
    FROM Players_DefenseGrades_Weekly dgw

    LEFT JOIN Players_DefensePassRush_Weekly prw
    ON dgw.playerId = prw.playerId
    AND dgw.year = prw.year
    AND dgw.week = prw.week
    AND dgw.seasonType = prw.seasonType

    LEFT JOIN Players_DefenseRunDefense_Weekly rdw
    ON dgw.playerId = rdw.playerId
    AND dgw.year = rdw.year
    AND dgw.week = rdw.week
    AND dgw.seasonType = rdw.seasonType
     
    WHERE dgw.playerId = ? AND dgw.year = ? AND dgw.week = ? AND dgw.seasonType = ?`,
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

/* Linebacker and Edge Specific */
app.get('/api/player_percentiles_LBE/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_LBE WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_lbe/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position IN ("LB", "EDGE")', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

/* Cornerbacks */
app.get('/api/player_percentiles_CB/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_CB WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_cb/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position IN ("CB")', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

/* Safties */
app.get('/api/player_percentiles_S/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_S WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_s/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position IN ("S")', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});

/* Defensive Backs */
app.get('/api/player_percentiles_DB/:playerId/:year', (req, res) => {
  const { playerId, year } = req.params;
  db.get(
    'SELECT * FROM Players_Full_Percentiles_DB WHERE playerId = ? AND year = ?',
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

app.get('/api/player_metadata_db/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.get('SELECT * FROM Players_Basic WHERE playerId = ? AND position IN ("DB")', [playerId], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!row) {
      res.status(404).send('Player not found');
    } else {
      res.json([row]);
    }
  });
});


app.get('/api/player_defense_coverage_weekly_all/:playerId/:year/:week/:seasonType', (req, res) => {
  const { playerId, year, week, seasonType } = req.params;

  db.all(
    `SELECT dgw.*, prw.*, rdw.*, dcw.*, dcg.*
     
    FROM Players_DefenseGrades_Weekly dgw

    LEFT JOIN Players_DefensePassRush_Weekly prw
    ON dgw.playerId = prw.playerId
    AND dgw.year = prw.year
    AND dgw.week = prw.week
    AND dgw.seasonType = prw.seasonType

    LEFT JOIN Players_DefenseRunDefense_Weekly rdw
    ON dgw.playerId = rdw.playerId
    AND dgw.year = rdw.year
    AND dgw.week = rdw.week
    AND dgw.seasonType = rdw.seasonType

    LEFT JOIN Players_DefenseCoverageScheme_Weekly dcw
    ON dgw.playerId = dcw.playerId
    AND dgw.year = dcw.year
    AND dgw.week = dcw.week
    AND dgw.seasonType = dcw.seasonType

    LEFT JOIN Players_DefenseCoverageGrades_Weekly dcg
    ON dgw.playerId = dcg.playerId
    AND dgw.year = dcg.year
    AND dgw.week = dcg.week
    AND dgw.seasonType = dcg.seasonType
     
    WHERE dgw.playerId = ? AND dgw.year = ? AND dgw.week = ? AND dgw.seasonType = ?`,
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

app.get('/api/team_defense_weekly/:teamId/:year/:week/:seasonType', (req, res) => {
  const { teamId, year, week, seasonType } = req.params;

  db.all(`
    SELECT *
    FROM Players_DefenseGrades_Weekly
    WHERE teamId = ? AND year = ? AND week = ? AND seasonType = ?
  `, [teamId, year, week, seasonType], (err, rows) => {
    if (err) {
      console.error('DB Error (Rushing):', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'No defense data' });
    }
    res.json(rows); // ALL players
  });
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

// Teams Ratings Full Endpoint
app.get('/api/team_full_ratings/:teamId/:year', (req, res) => {
  const { teamId, year } = req.params;

  db.get(
    'SELECT * FROM Teams_Full_Stats_Ratings WHERE teamID = ? AND year = ?',
    [teamId, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No team ratings and stats found for the specified team and year');
      } else {
        res.json(row);
      }
    }
  );
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
    WHERE year = ? AND position = 'RB' AND min_passing_threshold_hit = 1 AND conference IS NOT NULL AND conference != ''
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

app.get('/api/players/ppa/:year/top-wrs', (req, res) => {
  const { year } = req.params;
  console.log(`Fetching top WRs for year: ${year}`);
  db.all(
    `
    SELECT playerId, year, name, position, team, conference, averagePPA_pass, teamID
    FROM Players_PPA_WR
    WHERE year = ? AND position = 'WR' AND min_passing_threshold_hit = 1
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
        console.log(`No RBs found for year: ${year}`);
        return res.status(404).json({ error: 'No RBs found for this year with minimum passing threshold' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/players/ppa/:year/top-tes', (req, res) => {
  const { year } = req.params;
  console.log(`Fetching top TEs for year: ${year}`);
  db.all(
    `
    SELECT playerId, year, name, position, team, conference, averagePPA_pass, teamID
    FROM Players_PPA_TE
    WHERE year = ? AND position = 'TE' AND min_passing_threshold_hit = 1 AND conference IS NOT NULL AND conference != ''
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
        SELECT teamId, year, week, school, coaches_poll_rank, ap_poll_rank, 
               SP_Ranking, SP_Rating, SP_Off_Ranking, SP_Off_Rating, 
               SP_Def_Ranking, SP_Def_Rating, ELO_Rating, SOR, FPI_Ranking, 
               SOS, record, home_record, away_record, neutral_record, 
               quad1_record, quad2_record, quad3_record, quad4_record, conference, logo 
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

// Full rankings endpoint
app.get('/api/teams/rankings_full/:year/:week', (req, res) => {
    const { year, week } = req.params;
    console.log(`Fetching team rankings for year: ${year}, week: ${week}`);
    db.all(
        `
        SELECT teamId, year, week, school, coaches_poll_rank, ap_poll_rank,
               SP_Ranking, SP_Rating, SP_Off_Ranking, SP_Off_Rating,
               SP_Def_Ranking, SP_Def_Rating, ELO_Rating, SOR, FPI_Ranking,
               SOS, record, home_record, away_record, neutral_record,
               quad1_record, quad2_record, quad3_record, quad4_record, conference
        FROM Teams_Rankings
        WHERE year = ? AND week = ? AND FPI_Ranking IS NOT NULL
        ORDER BY FPI_Ranking ASC
        `,
        [year, week],
        (err, rows) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (!rows.length) {
                console.log(`No team rankings found for year: ${year}, week: ${week} with FPI_Ranking not null`);
                return res.status(404).json({ error: 'No team rankings found for this year and week with FPI_Ranking' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/teams/rankings_full_specific/:teamId/:year/:week', (req, res) => {
  const { teamId, year, week } = req.params;
  console.log(`Fetching team rankings for teamId: ${teamId}, year: ${year}, week: ${week}`);
  db.get(
    `
      SELECT teamId, year, week, school, coaches_poll_rank, ap_poll_rank,
             SP_Ranking, SP_Rating, SP_Off_Ranking, SP_Off_Rating,
             SP_Def_Ranking, SP_Def_Rating, ELO_Rating, SOR, FPI_Ranking,
             SOS, record, home_record, away_record, neutral_record,
             quad1_record, quad2_record, quad3_record, quad4_record, conference
      FROM Teams_Rankings
      WHERE teamId = ? AND year = ? AND week = ? AND FPI_Ranking IS NOT NULL
    `,
    [teamId, year, week],
    (err, row) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        console.log(`No team rankings found for teamId: ${teamId}, year: ${year}, week: ${week} with FPI_Ranking not null`);
        return res.status(404).json({ error: 'No team rankings found for this team, year, and week with FPI_Ranking' });
      }
      res.json(row);
    }
  );
});


// Roster endpoint
app.get('/api/teams_roster/:id/:year', (req, res) => {
    const { id, year } = req.params;
    const idNum = parseInt(id);
    const yearNum = parseInt(year);
    if (isNaN(idNum) || isNaN(yearNum)) {
        console.log(`Invalid parameters: id=${id}, year=${year}`);
        return res.status(400).json({ error: 'Invalid id or year parameter' });
    }
    console.log(`Fetching roster for team id=${idNum}, year=${yearNum}`);
    db.all('SELECT playerId, name, position, school, teamID, height, weight, jersey, headshotURL, homeCity, homeState, player_id_PFF FROM Players_Basic WHERE teamID = ? AND year = ? AND jersey != ?', [idNum, yearNum, '-1'], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!rows.length) {
            console.log(`No roster found for team id=${idNum}, year=${yearNum}`);
            return res.status(404).json({ error: 'No roster found for this team and year' });
        }
        res.json(rows);
    });
});

app.get('/api/team_percentiles/:teamID/:year', (req, res) => {
  const { teamID, year } = req.params;
  db.get(
    'SELECT * FROM Teams_Grades_Season WHERE teamID = ? AND year = ?',
    [teamID, year],
    (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        res.status(500).send('Internal server error');
      } else if (!row) {
        res.status(404).send('No advanced grades found for team');
      } else {
        res.json(row);
      }
    }
  );
});

// Games Endpoints: 
app.get('/api/teams_games', (req, res) => {
  db.all('SELECT * FROM Teams_Games', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (!rows || rows.length === 0) {
      res.status(404).send('No games found');
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/team_game_stats/:gameId', (req, res) => {
  const { gameId } = req.params;
  db.all(
    'SELECT * FROM Teams_Games_Stats WHERE game_id = ?',
    [gameId],
    (err, rows) => {
      if (err) {
        res.status(500).send(err.message);
      } else if (!rows || rows.length === 0) {
        res.status(404).send('No game stats found for the specified game ID');
      } else {
        res.json(rows);
      }
    }
  );
});

// Portal Endpoint
app.get('/api/players_portal', (req, res) => {
  db.all('SELECT * FROM Players_TransferPortal', [], (err, rows) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).send('No players found in transfer portal');
    }
    res.json(rows);
  });
});

// Tweets endpoint
app.get('/api/teams_feeds/:id', async (req, res) => {
    const { id } = req.params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
        console.log(`Invalid parameter: id=${id}`);
        return res.status(400).json({ error: 'Invalid id parameter' });
    }
    try {
        // Fetch Twitter handle from Teams table
        const team = await new Promise((resolve, reject) => {
            db.get('SELECT twitter FROM Teams WHERE id = ?', [idNum], (err, row) => {
                if (err) {
                    console.error('Database error:', err.message);
                    reject(new Error('Internal server error'));
                }
                if (!row) {
                    console.log(`No team found for id=${idNum}`);
                    reject(new Error('Team not found'));
                }
                resolve(row);
            });
        });
        const twitterHandle = team.twitter;
        if (!twitterHandle) {
            console.log(`No Twitter handle found for team id=${idNum}`);
            return res.status(404).json({ error: 'No Twitter account found for this team' });
        }
        const username = twitterHandle.startsWith('@') ? twitterHandle.slice(1) : twitterHandle;

        // Fetch user ID from X API
        const userResponse = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, {
            headers: {
                Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
            },
            params: {
                'user.fields': 'name',
            },
        });
        const twitterUserId = userResponse.data.data.id;
        const twitterUserName = userResponse.data.data.name;

        // Fetch tweets
        console.log(`Fetching tweets for team id=${idNum}, Twitter user=${username}`);
        const tweetsResponse = await axios.get(`https://api.twitter.com/2/users/${twitterUserId}/tweets`, {
            headers: {
                Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
            },
            params: {
                'tweet.fields': 'created_at',
                max_results: 100,
            },
        });
        const tweets = tweetsResponse.data.data || [];
        const formattedTweets = tweets.map(tweet => ({
            id: tweet.id,
            text: tweet.text,
            user: { name: twitterUserName },
            link: `https://x.com/${username}/status/${tweet.id}`,
        }));
        res.json(formattedTweets);
    } catch (err) {
        console.error('Error fetching tweets:', err.message);
        res.status(err.response?.status === 404 ? 404 : 500).json({ error: 'Failed to fetch tweets' });
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});