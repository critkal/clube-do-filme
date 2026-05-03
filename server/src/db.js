const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT UNIQUE NOT NULL,
    is_admin INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    rounds INTEGER NOT NULL,
    status TEXT DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS season_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER REFERENCES seasons(id),
    member_id INTEGER REFERENCES members(id),
    round_order INTEGER,
    UNIQUE(season_id, member_id)
  )`,
  `CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    director TEXT,
    poster_url TEXT,
    poster_public_id TEXT,
    event_date TEXT,
    presenter_id INTEGER REFERENCES members(id),
    season_id INTEGER REFERENCES seasons(id),
    round_number INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER REFERENCES movies(id),
    member_id INTEGER REFERENCES members(id),
    score INTEGER CHECK(score BETWEEN 1 AND 10),
    comment TEXT,
    UNIQUE(movie_id, member_id)
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS movie_categories (
    movie_id INTEGER REFERENCES movies(id),
    category_id INTEGER REFERENCES categories(id),
    PRIMARY KEY (movie_id, category_id)
  )`,
  `CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id),
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(movie_id, member_id, category_id)
  )`,
  `CREATE TABLE IF NOT EXISTS final_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER REFERENCES seasons(id),
    category_id INTEGER REFERENCES categories(id),
    voter_id INTEGER REFERENCES members(id),
    movie_id INTEGER REFERENCES movies(id),
    UNIQUE(season_id, category_id, voter_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired TEXT NOT NULL
  )`,
];

const MIGRATIONS = [
  'ALTER TABLE movies ADD COLUMN tmdb_id INTEGER',
  'ALTER TABLE movies ADD COLUMN synopsis TEXT',
  'ALTER TABLE movies ADD COLUMN genre TEXT',
  'ALTER TABLE movies ADD COLUMN runtime INTEGER',
  'ALTER TABLE members ADD COLUMN password_hash TEXT',
  'ALTER TABLE seasons ADD COLUMN host_id INTEGER REFERENCES members(id)',
  'DROP TABLE IF EXISTS date_votes',
  'DROP TABLE IF EXISTS date_options',
];

// Recreates the ratings table with 1-10 constraint and comment column if needed.
async function migrateRatings() {
  const info = await db.execute('PRAGMA table_info(ratings)');
  const cols = info.rows.map((r) => r.name);
  if (cols.includes('comment')) return;

  await db.execute(`CREATE TABLE IF NOT EXISTS ratings_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER REFERENCES movies(id),
    member_id INTEGER REFERENCES members(id),
    score INTEGER CHECK(score BETWEEN 1 AND 10),
    comment TEXT,
    UNIQUE(movie_id, member_id)
  )`);

  const existing = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ratings'",
  );
  if (existing.rows.length) {
    await db.execute(
      `INSERT OR IGNORE INTO ratings_v2 (id, movie_id, member_id, score)
       SELECT id, movie_id, member_id, score FROM ratings`,
    );
    await db.execute('DROP TABLE ratings');
  }
  await db.execute('ALTER TABLE ratings_v2 RENAME TO ratings');
}

async function initSchema() {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt);
  }
  for (const sql of MIGRATIONS) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }
  await migrateRatings();
}

module.exports = { db, initSchema };
