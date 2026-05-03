#!/usr/bin/env node
/**
 * Seed historical seasons (1–9) from a CSV file.
 * Usage: node seedHistoricalSeasons.js [path/to/seasons.csv]
 *
 * CSV format: season_number,member_name,movie_title,winner
 *
 * Export from Google Sheets as "CSV (UTF-8)" to avoid encoding issues.
 * The script is idempotent — safe to re-run; existing seasons/movies are skipped.
 */
const path = require('path');
const isLocal = process.argv.includes('--local');
require('dotenv').config({ path: path.resolve(__dirname, isLocal ? '../../.env.local' : '../../.env') });

const fs = require('fs');
const { db, initSchema } = require('../db');

// ---------------------------------------------------------------------------
// Name normalization — maps all CSV spelling variants to the canonical DB name
// ---------------------------------------------------------------------------
const MEMBER_ALIASES = {
  // Yuri Alessandro variants
  'Yuri A.':  'Yuri Alessandro',
  'Yuri A':   'Yuri Alessandro',
  'YuriA':    'Yuri Alessandro',
  'Yuri':     'Yuri Alessandro',  // seasons 3–4, before Yuri G. joined

  // Pedro (Pedro A. in early seasons, same person)
  'Pedro A.': 'Pedro',

  // Sebastian typo in season 5
  'Sebastean': 'Sebastian',

  // Trailing/leading whitespace variants
  'Esther ':  'Esther',

  // Yuri G. variants
  'Yuri G.':  'Yuri G.',
  'Yuri G':   'Yuri G.',
  'YuriG':    'Yuri G.',

  // Jotave is João Victor's nickname
  'Jotave':   'João Victor',

  // Gustavinho = Gustavo Carvalho (season 9 nickname)
  'Gustavinho': 'Gustavo Carvalho',

  // Medeiros = Matheus (same person)
  'Medeiros': 'Matheus',

  // Márcia — handles both clean UTF-8 and Latin-1 mojibake fallback
  'MÃ¡rcia':  'Márcia',
};

// Members currently in the DB — will be inserted with is_active = 1 if created
// (they already exist, so upsertMember won't INSERT them, but this guards edge cases)
const ACTIVE_MEMBERS = new Set([
  'Bianca', 'Camila', 'Carlos', 'Daniel', 'Esther', 'Felipe',
  'Gabriel', 'Gustavo Carvalho', 'Gustavo Costa', 'João Victor',
  'Lucas', 'Matheus', 'Pedro', 'Rabelo', 'Vanessa', 'Yuri Alessandro',
]);

// ---------------------------------------------------------------------------
// TMDB
// ---------------------------------------------------------------------------

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w500';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function tmdbSearch(title) {
  const key = process.env.TMDB_API_KEY;
  // Try pt-BR first (handles Portuguese titles), fall back to default
  for (const lang of ['pt-BR', '']) {
    const params = new URLSearchParams({ api_key: key, query: title });
    if (lang) params.set('language', lang);
    const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);
    const data = await res.json();
    if (data.results?.length) return data.results[0];
  }
  return null;
}

async function fetchTMDB(title) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  try {
    const hit = await tmdbSearch(title);
    if (!hit) {
      console.log(`    [tmdb]   no match for "${title}"`);
      return null;
    }

    const params = new URLSearchParams({ api_key: key, language: 'pt-BR', append_to_response: 'credits' });
    const res = await fetch(`${TMDB_BASE}/movie/${hit.id}?${params}`);
    const d = await res.json();

    const director = d.credits?.crew?.find(c => c.job === 'Director')?.name ?? null;
    const genre    = d.genres?.map(g => g.name).join(', ') || null;
    const year     = d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null;
    const poster   = d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null;

    console.log(`    [tmdb]   "${title}" → "${d.title}" (${year}, dir. ${director ?? '?'})`);
    return { tmdb_id: d.id, year, director, synopsis: d.overview || null, genre, runtime: d.runtime || null, poster_url: poster };
  } catch (err) {
    console.log(`    [tmdb]   fetch error for "${title}": ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveName(raw) {
  const trimmed = raw.trim();
  return MEMBER_ALIASES[trimmed] ?? trimmed;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const [, ...dataLines] = lines; // skip header

  return dataLines.map(line => {
    // Handle quoted fields (e.g., "Good bye, Lenin")
    const parts = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(current); current = ''; continue; }
      current += ch;
    }
    parts.push(current);

    const [season_number, member_name, movie_title, winner] = parts;
    return {
      seasonNumber: parseInt(season_number, 10),
      memberName: resolveName(member_name ?? ''),
      movieTitle: (movie_title ?? '').trim(),
      winner: (winner ?? '').trim() === '1',
    };
  }).filter(r => r.seasonNumber > 0 && r.memberName && r.movieTitle);
}

async function upsertMember(name) {
  const { rows } = await db.execute({
    sql: 'SELECT id FROM members WHERE first_name = ? COLLATE NOCASE',
    args: [name],
  });
  if (rows.length) return Number(rows[0].id);

  const isActive = ACTIVE_MEMBERS.has(name) ? 1 : 0;
  const result = await db.execute({
    sql: 'INSERT INTO members (first_name, is_active) VALUES (?, ?)',
    args: [name, isActive],
  });
  console.log(`  [member+] "${name}" (active=${isActive})`);
  return Number(result.lastInsertRowid);
}

async function upsertSeason(seasonNumber, roundCount) {
  const name = `Temporada ${seasonNumber}`;
  const { rows } = await db.execute({
    sql: 'SELECT id FROM seasons WHERE name = ?',
    args: [name],
  });
  if (rows.length) {
    console.log(`  [season]  "${name}" already exists (id=${rows[0].id}), skipping insert`);
    return Number(rows[0].id);
  }
  const result = await db.execute({
    sql: "INSERT INTO seasons (name, rounds, status) VALUES (?, ?, 'presented')",
    args: [name, roundCount],
  });
  console.log(`  [season+] "${name}" — ${roundCount} rounds`);
  return Number(result.lastInsertRowid);
}

async function upsertSeasonMember(seasonId, memberId, roundOrder) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO season_members (season_id, member_id, round_order) VALUES (?, ?, ?)',
    args: [seasonId, memberId, roundOrder],
  });
}

async function insertMovie(seasonId, presenterId, title, roundNumber, winner, tmdb) {
  const { rows } = await db.execute({
    sql: 'SELECT id, tmdb_id FROM movies WHERE season_id = ? AND presenter_id = ?',
    args: [seasonId, presenterId],
  });

  const flag = winner ? ' 🏆' : '';

  if (rows.length) {
    // Enrich with TMDB data if the row is missing it
    if (tmdb && !rows[0].tmdb_id) {
      await db.execute({
        sql: `UPDATE movies
              SET tmdb_id = ?, year = ?, director = ?, synopsis = ?, genre = ?, runtime = ?, poster_url = ?
              WHERE id = ?`,
        args: [tmdb.tmdb_id, tmdb.year, tmdb.director, tmdb.synopsis, tmdb.genre, tmdb.runtime, tmdb.poster_url, rows[0].id],
      });
      console.log(`    [movie~] "${title}"${flag} — enriched with TMDB data`);
    } else {
      console.log(`    [movie]  "${title}"${flag} — already exists, skipping`);
    }
    return;
  }

  const t = tmdb ?? {};
  await db.execute({
    sql: `INSERT INTO movies
            (title, season_id, presenter_id, round_number, winner,
             tmdb_id, year, director, synopsis, genre, runtime, poster_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      title, seasonId, presenterId, roundNumber, winner ? 1 : 0,
      t.tmdb_id ?? null, t.year ?? null, t.director ?? null,
      t.synopsis ?? null, t.genre ?? null, t.runtime ?? null, t.poster_url ?? null,
    ],
  });
  console.log(`    [movie+] "${title}"${flag}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  try {
    const csvArg = process.argv.slice(2).find(a => !a.startsWith('--'));
    const csvPath = csvArg || path.join(__dirname, 'historical_seasons.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`\nCSV file not found: ${csvPath}`);
      console.error('Usage: node seedHistoricalSeasons.js [path/to/seasons.csv]\n');
      process.exit(1);
    }

    console.log('[seed] Applying schema & migrations...');
    await initSchema();
    console.log('[seed] Schema OK.\n');

    const rows = parseCSV(csvPath);

    // Group rows by season, preserving CSV order
    const seasonMap = new Map();
    for (const row of rows) {
      if (!seasonMap.has(row.seasonNumber)) seasonMap.set(row.seasonNumber, []);
      seasonMap.get(row.seasonNumber).push(row);
    }

    const seasonNumbers = [...seasonMap.keys()].sort((a, b) => a - b);

    for (const num of seasonNumbers) {
      const movies = seasonMap.get(num);
      console.log(`\n── Temporada ${num} (${movies.length} filmes) ──`);

      const seasonId = await upsertSeason(num, movies.length);

      for (let i = 0; i < movies.length; i++) {
        const { memberName, movieTitle, winner } = movies[i];
        const memberId = await upsertMember(memberName);
        await upsertSeasonMember(seasonId, memberId, i + 1);
        const tmdb = await fetchTMDB(movieTitle);
        await insertMovie(seasonId, memberId, movieTitle, i + 1, winner, tmdb);
        if (process.env.TMDB_API_KEY) await sleep(300); // stay within rate limit
      }
    }

    console.log('\n[seed] Done. ✓');
    process.exit(0);
  } catch (err) {
    console.error('\n[seed] Failed:', err);
    process.exit(1);
  }
})();
