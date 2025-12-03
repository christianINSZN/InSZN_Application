require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const Busboy = require('busboy');
const { Clerk } = require('@clerk/clerk-sdk-node');

const app = express();
const port = process.env.PORT || 3001;

/* -------------------------------------------------------------
   MAIN DATABASE (cfb_database.db) – copied from repo on every deploy
   ------------------------------------------------------------- */
const dbPath = process.env.SQLITE_DB_PATH || './data/db/cfb_database.db';
const repoDbPath = path.join(__dirname, 'data/db/cfb_database.db');
const getDefaultYear = () => 2025;

// Validate env vars
if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
if (!process.env.CLERK_SECRET_KEY) throw new Error('Missing CLERK_SECRET_KEY');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });

// Copy main DB from repo
console.log(`Copying database from ${repoDbPath} to ${dbPath}`);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.copyFileSync(repoDbPath, dbPath);
const stats = fs.statSync(dbPath);
console.log(`Database file at: ${dbPath}, size: ${stats.size} bytes`);
if (stats.size === 0) console.error('Database file is empty');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
      if (err) console.error('Error querying tables:', err.message);
      else console.log('Available tables:', rows.map(r => r.name));
    });
  }
});

/* -------------------------------------------------------------
   PERSISTENT COMMENTS DATABASE (comments.db) – USE EXISTING DISK
   ------------------------------------------------------------- */
const commentsDir = path.dirname(dbPath); // ← /opt/render/project/data/db
const commentsDbPath = path.join(commentsDir, 'comments.db');

// === FORCE CREATE comments.db IF MISSING (ONE-TIME) ===
if (!fs.existsSync(commentsDbPath)) {
  console.log('comments.db not found – creating now...');
  const tempDb = new sqlite3.Database(commentsDbPath);
  const createSql = `
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId TEXT NOT NULL,
      parentId INTEGER,
      content TEXT NOT NULL,
      authorName TEXT,
      authorClerkId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE upvotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commentId INTEGER,
      FOREIGN KEY (commentId) REFERENCES comments (id) ON DELETE CASCADE
    );
  `;
  tempDb.exec(createSql, (err) => {
    if (err) {
      console.error('Failed to create comments.db:', err);
    } else {
      console.log('comments.db created successfully at:', commentsDbPath);
    }
    tempDb.close();
  });
}

// Open persistent connection
const commentsDb = new sqlite3.Database(commentsDbPath, (err) => {
  if (err) {
    console.error('Comments DB connection error:', err);
  } else {
    console.log('Connected to persistent comments DB:', commentsDbPath);
  }
});

/* -------------------------------------------------------------
   MIDDLEWARE
   ------------------------------------------------------------- */
app.use(cors());
app.use(express.json());

// // === TEMP: UPLOAD comments.db (REMOVE AFTER USE) ===
// app.post('/api/upload-comments', (req, res) => {
//   // SECURITY: Only allow with secret key
//   if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
//     return res.status(403).json({ error: 'Forbidden' });
//   }
//   const busboy = Busboy({ headers: req.headers });
//   let uploaded = false;
//   busboy.on('file', (fieldname, file, filename) => {
//     const savePath = '/opt/render/project/data/db/comments.db';
//     file.pipe(fs.createWriteStream(savePath));
//     uploaded = true;
//   });
//   busboy.on('finish', () => {
//     if (!uploaded) return res.status(400).json({ error: 'No file uploaded' });
//     res.json({ success: true, message: 'DB updated. Restarting in 3s...' });
//     // Auto-restart server to reload new DB
//     setTimeout(() => process.exit(0), 3000);
//   });
//   req.pipe(busboy);
// });

/* -------------------------------------------------------------
   COMMENTS, REPLIES, UPVOTES & DELETE – use commentsDb
   ------------------------------------------------------------- */

// GET top-level comments
app.get('/api/comments', (req, res) => {
  const { postId } = req.query;
  if (!postId) return res.status(400).json({ error: 'postId required' });

  const sql = `
    SELECT c.id, c.postId, c.content, c.authorName, c.authorClerkId, c.createdAt,
           COUNT(u.id) AS upvoteCount
    FROM comments c
    LEFT JOIN upvotes u ON c.id = u.commentId
    WHERE c.postId = ? AND c.parentId IS NULL
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `;

  commentsDb.all(sql, [postId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST new top-level comment
app.post('/api/comments', (req, res) => {
  const { postId, content, authorName = 'Anonymous', authorClerkId } = req.body;
  if (!postId || !content) return res.status(400).json({ error: 'postId and content required' });

  const sql = `INSERT INTO comments (postId, content, authorName, authorClerkId) VALUES (?, ?, ?, ?)`;
  commentsDb.run(sql, [postId, content, authorName, authorClerkId || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      id: this.lastID,
      postId,
      content,
      authorName,
      authorClerkId: authorClerkId || null,
      createdAt: new Date().toISOString(),
      upvoteCount: 0,
    });
  });
});

// POST reply
app.post('/api/replies', (req, res) => {
  const { postId, parentId, content, authorName = 'Anonymous', authorClerkId } = req.body;
  if (!postId || !parentId || !content) return res.status(400).json({ error: 'postId, parentId, content required' });

  const sql = `INSERT INTO comments (postId, parentId, content, authorName, authorClerkId) VALUES (?, ?, ?, ?, ?)`;
  commentsDb.run(sql, [postId, parentId, content, authorName, authorClerkId || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      id: this.lastID,
      postId,
      parentId,
      content,
      authorName,
      authorClerkId: authorClerkId || null,
      createdAt: new Date().toISOString(),
      upvoteCount: 0,
    });
  });
});

// GET replies
app.get('/api/replies', (req, res) => {
  const { parentId } = req.query;
  if (!parentId) return res.status(400).json({ error: 'parentId required' });

  const sql = `
    SELECT c.id, c.postId, c.parentId, c.content, c.authorName, c.authorClerkId, c.createdAt,
           COUNT(u.id) AS upvoteCount
    FROM comments c
    LEFT JOIN upvotes u ON c.id = u.commentId
    WHERE c.parentId = ?
    GROUP BY c.id
    ORDER BY c.createdAt ASC
  `;

  commentsDb.all(sql, [parentId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// UPVOTE
app.post('/api/upvotes', (req, res) => {
  const { commentId } = req.body;
  if (!commentId) return res.status(400).json({ error: 'commentId required' });

  const insertSql = `INSERT INTO upvotes (commentId) VALUES (?)`;
  commentsDb.run(insertSql, [commentId], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const countSql = `SELECT COUNT(*) AS upvoteCount FROM upvotes WHERE commentId = ?`;
    commentsDb.get(countSql, [commentId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ upvoteCount: row.upvoteCount });
    });
  });
});

// DELETE own comment/reply
app.delete('/api/comments/:id', (req, res) => {
  const commentId = req.params.id;
  const { userId } = req.body;

  commentsDb.get(`SELECT authorClerkId FROM comments WHERE id = ?`, [commentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.authorClerkId !== userId) return res.status(403).json({ error: 'Unauthorized' });

    commentsDb.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, deletedId: commentId });
    });
  });
});

/* -------------------------------------------------------------
   DAILY POLL – admin editable, vote once, live tally
   ------------------------------------------------------------- */

// GET poll + current votes
app.get('/api/poll', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  commentsDb.get(`SELECT * FROM polls WHERE date = ?`, [today], (err, poll) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!poll) {
      // Default poll if none exists
      const defaultPoll = {
        question: "What do you think?",
        options: JSON.stringify(["Yes", "No"]),
        fakeVotes: JSON.stringify([0, 0]),
        date: today,
      };
      commentsDb.run(
        `INSERT INTO polls (question, options, fakeVotes, date) VALUES (?, ?, ?, ?)`,
        [defaultPoll.question, defaultPoll.options, defaultPoll.fakeVotes, today],
        function () {
          poll = { id: this.lastID, ...defaultPoll };
          sendPollWithVotes(poll, res);
        }
      );
    } else {
      sendPollWithVotes(poll, res);
    }
  });
});

// Helper: attach real + fake votes
function sendPollWithVotes(poll, res) {
  const options = JSON.parse(poll.options);
  const fakeVotes = JSON.parse(poll.fakeVotes);

  commentsDb.all(
    `SELECT optionIndex, COUNT(*) as count FROM poll_votes WHERE pollId = ? GROUP BY optionIndex`,
    [poll.id],
    (err, realVotes) => {
      if (err) return res.status(500).json({ error: err.message });

      const tally = options.map((opt, i) => {
        const real = realVotes.find(v => v.optionIndex === i)?.count || 0;
        return real + fakeVotes[i];
      });

      res.json({
        id: poll.id,
        question: poll.question,
        options,
        tally,
        totalVotes: tally.reduce((a, b) => a + b, 0),
        hasVoted: false, // frontend will check
      });
    }
  );
}

// POST vote (once per user)
app.post('/api/poll/vote', (req, res) => {
  const { pollId, optionIndex, userId } = req.body;
  if (!pollId || optionIndex == null || !userId) return res.status(400).json({ error: 'Missing data' });

  commentsDb.get(
    `SELECT 1 FROM poll_votes WHERE pollId = ? AND userClerkId = ?`,
    [pollId, userId],
    (err, row) => {
      if (row) return res.status(403).json({ error: 'Already voted' });

      commentsDb.run(
        `INSERT INTO poll_votes (pollId, userClerkId, optionIndex) VALUES (?, ?, ?)`,
        [pollId, userId, optionIndex],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        }
      );
    }
  );
});

// ADMIN: Update poll + fake votes
app.post('/api/admin/poll', (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { question, options, fakeVotes } = req.body;
  const today = new Date().toISOString().split('T')[0];

  commentsDb.run(
    `INSERT OR REPLACE INTO polls (question, options, fakeVotes, date) VALUES (?, ?, ?, ?)`,
    [question, JSON.stringify(options), JSON.stringify(fakeVotes), today],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// GET: Has user voted?
app.get('/api/poll/voted', (req, res) => {
  const { pollId, userId } = req.query;
  if (!pollId || !userId) return res.status(400).json({ error: 'Missing data' });

  commentsDb.get(
    `SELECT 1 FROM poll_votes WHERE pollId = ? AND userClerkId = ?`,
    [pollId, userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ hasVoted: !!row });
    }
  );
});

/* -------------------------------------------------------------
   MULTI-POLL SYSTEM – /api/poll/:slug
   ------------------------------------------------------------- */

// GET specific poll by slug
app.get('/api/poll/:slug', (req, res) => {
  const { slug } = req.params;

  commentsDb.get(`SELECT * FROM polls WHERE slug = ?`, [slug], (err, poll) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const options = JSON.parse(poll.options);
    const fakeVotes = JSON.parse(poll.fakeVotes);

    commentsDb.all(
      `SELECT optionIndex, COUNT(*) as count FROM poll_votes WHERE pollId = ? GROUP BY optionIndex`,
      [poll.id],
      (err, realVotes) => {
        if (err) return res.status(500).json({ error: err.message });

        const tally = options.map((_, i) => {
          const real = realVotes.find(v => v.optionIndex === i)?.count || 0;
          return real + fakeVotes[i];
        });

        res.json({
          id: poll.id,
          slug: poll.slug,
          question: poll.question,
          options,
          tally,
          totalVotes: tally.reduce((a, b) => a + b, 0),
        });
      }
    );
  });
});

// ADMIN: Create or update poll by slug
app.post('/api/admin/poll/:slug', (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { slug } = req.params;
  const { question, options, fakeVotes } = req.body;

  commentsDb.run(
    `INSERT OR REPLACE INTO polls (slug, question, options, fakeVotes) VALUES (?, ?, ?, ?)`,
    [slug, question, JSON.stringify(options), JSON.stringify(fakeVotes)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

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

        const plan = subscription.items.data[0]?.price.id === 'price_1SVdVlF6OYpAGuKxD9OKJYzD' ? 'pro' : 'premium'; // Replace with your Price IDs
        const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
        await clerk.users.updateUserMetadata(retryClerkUserId, {
          publicMetadata: { subscriptionPlan: plan },
        });
        console.log(`Updated user ${retryClerkUserId} with subscriptionPlan: ${plan}`);
      } else {
        const plan = subscription.items.data[0]?.price.id === 'price_1SVdVlF6OYpAGuKxD9OKJYzD' ? 'pro' : 'premium'; // Replace with your Price IDs
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

/* -------------------------------------------------------------
   SCOUTING REPORT VOTES – live up/down on spread & over/under
   ------------------------------------------------------------- */

app.post('/api/scouting/vote', (req, res) => {
  const { matchupId, voteType, voteValue, userId } = req.body; // voteType: 'spread'|'ou', voteValue: 1|-1
  if (!matchupId || !voteType || !['spread', 'ou'].includes(voteType) || ![-1, 1].includes(voteValue)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const table = 'scouting_votes';
  const key = { matchupId, voteType, userId: userId || null };

  commentsDb.get(
    `SELECT voteValue FROM ${table} WHERE matchupId = ? AND voteType = ? AND userClerkId ${userId ? '=' : 'IS'} ?`,
    [matchupId, voteType, userId || null],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        if (row.voteValue === voteValue) {
          // Same vote → remove
          commentsDb.run(
            `DELETE FROM ${table} WHERE matchupId = ? AND voteType = ? AND userClerkId ${userId ? '=' : 'IS'} ?`,
            [matchupId, voteType, userId || null],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true, action: 'removed' });
            }
          );
        } else {
          // Flip vote
          commentsDb.run(
            `UPDATE ${table} SET voteValue = ? WHERE matchupId = ? AND voteType = ? AND userClerkId ${userId ? '=' : 'IS'} ?`,
            [voteValue, matchupId, voteType, userId || null],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true, action: 'flipped' });
            }
          );
        }
      } else {
        // New vote
        commentsDb.run(
          `INSERT INTO ${table} (matchupId, voteType, voteValue, userClerkId) VALUES (?, ?, ?, ?)`,
          [matchupId, voteType, voteValue, userId || null],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, action: 'added' });
          }
        );
      }
    }
  );
});

app.get('/api/scouting/votes/:matchupId', (req, res) => {
  const { matchupId } = req.params;
  commentsDb.all(
    `SELECT voteType, voteValue, COUNT(*) as count 
     FROM scouting_votes 
     WHERE matchupId = ? 
     GROUP BY voteType, voteValue`,
    [matchupId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const tally = { spread: { up: 0, down: 0 }, ou: { up: 0, down: 0 } };
      rows.forEach(r => {
        if (r.voteType === 'spread') tally.spread[r.voteValue === 1 ? 'up' : 'down'] = r.count;
        if (r.voteType === 'ou') tally.ou[r.voteValue === 1 ? 'up' : 'down'] = r.count;
      });
      res.json(tally);
    }
  );
});

// Apply JSON parsing for other routes
app.use(express.json());

app.post('/api/subscriptions/create-subscription', async (req, res) => {
  const { priceId, clerkUserId, paymentMethodId, email, promoCode } = req.body;

  try {
    if (!clerkUserId || !priceId || !paymentMethodId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Promo → sales rep
    const salesRepMap = { 'MILESINSZN': 'Miles Emery', 
      'MilesINSZN': 'Miles Emery', 
      'MIGUEL25': 'Miguel Jacome',
      'BLAZE25': 'Blake Brockman', 
      'TARTER25': 'Sam Tarter', 
      'BRAXTONINSZN': 'Braxton Wilks',
      'CFBKINGS': 'CFBKings', 
      'INSZN_RBN': 'INSZN RBN',
      'EMAW': 'EMAW',
      'INSZN_IRISH': 'INSZN Irish' ,
      'SECBIAS': 'SEC Bias', 
      'INSZN_BYU': 'INSZN BYU', 
      'POSITIONPICKS': 'Position Picks', 
      'CFBTALK': 'CFB Talk', 
      'HEADGEAR': 'Headgear CFB', 
      'INSZN_COUGS': 'INSZN Cougs',
      'INSZN_UTES': 'INSZN Utes',
      'REDRAIDERS': 'Red Raiders',
      'INSZN_TTU': 'INSZN TTU',
      'INSZN_STG': 'INSZN STG',
      'INSZN_VANDY': 'INSZN VANDY'};
          const salesRep = salesRepMap[promoCode?.toUpperCase()] || null;
    const metadataToAttach = {
      promoCode: promoCode || null,
      referredBy: salesRep || null,
      referralDate: new Date().toISOString().split('T')[0],
    };

    // Create customer
    const customer = await stripe.customers.create({
      email: email || null,
      metadata: { clerkUserId, ...metadataToAttach },
    });

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // CRITICAL FIX: Use 'charge_automatically' instead of 'default_incomplete'
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      collection_method: 'charge_automatically',     // ← THIS IS THE KEY
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      default_payment_method: paymentMethodId,
      metadata: metadataToAttach,
    });

    // Update Clerk metadata immediately
    const planMap = {
      'price_1SVdVlF6OYpAGuKxD9OKJYzD': 'pro',     // $20
      'price_1SVcw8F6OYpAGuKxhZ0y3jrK': 'pro',     // $15 promo
      'price_pro': 'premium',
      'price_elite': 'elite',
    };

    const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        subscriptionPlan: planMap[priceId] || 'pro',
        hasActiveSubscription: true,
        ...metadataToAttach,
      },
    });

    // Success — subscription is ACTIVE immediately
    return res.json({
      status: 'active',
      subscriptionId: subscription.id,
    });

  } catch (error) {
    console.error('Subscription creation failed:', error);
    res.status(500).json({ error: error.message || 'Payment failed' });
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

// Backend endpoint
app.get('/api/teams_games_predictions', (req, res) => {
  db.all('SELECT * FROM Teams_Games_Predictions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/teams_games_predictions_v2', (req, res) => {
  db.all('SELECT * FROM Teams_Games_Ensemble_Predictions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
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