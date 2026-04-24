const express = require('express');
const multer = require('multer');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadBuffer } = require('../cloudinary');

const router = express.Router();
const seasonScopedRouter = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

async function findOpenRoundNumber(seasonId) {
  const season = await db.execute({
    sql: 'SELECT rounds, status FROM seasons WHERE id = ?',
    args: [seasonId],
  });
  if (!season.rows.length) return { error: 'season_not_found' };
  if (season.rows[0].status !== 'active') return { error: 'season_not_active' };
  const totalRounds = Number(season.rows[0].rounds);

  const taken = await db.execute({
    sql: 'SELECT round_number FROM movies WHERE season_id = ? ORDER BY round_number ASC',
    args: [seasonId],
  });
  const used = new Set(taken.rows.map((r) => Number(r.round_number)));
  for (let i = 1; i <= totalRounds; i++) {
    if (!used.has(i)) return { round: i, totalRounds };
  }
  return { error: 'season_full' };
}

async function maybeCloseSeason(seasonId) {
  const s = await db.execute({
    sql: 'SELECT rounds, status FROM seasons WHERE id = ?',
    args: [seasonId],
  });
  if (!s.rows.length) return;
  if (s.rows[0].status !== 'active') return;
  const total = Number(s.rows[0].rounds);
  const c = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM movies WHERE season_id = ?',
    args: [seasonId],
  });
  if (Number(c.rows[0].n) >= total) {
    await db.execute({
      sql: "UPDATE seasons SET status = 'completed' WHERE id = ?",
      args: [seasonId],
    });
  }
}

// Mounted at /api/seasons — POST /api/seasons/:seasonId/movies
seasonScopedRouter.post('/:seasonId/movies', requireAuth, upload.single('poster'), async (req, res) => {
  const seasonId = Number(req.params.seasonId);
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });
  const year = req.body.year ? Number(req.body.year) : null;
  const director = (req.body.director || '').trim() || null;
  const eventDate = (req.body.event_date || '').trim() || null;

  let presenterId = req.member.id;
  if (req.body.presenter_id && req.member.is_admin) {
    presenterId = Number(req.body.presenter_id);
  }

  const dup = await db.execute({
    sql: 'SELECT 1 FROM movies WHERE season_id = ? AND presenter_id = ?',
    args: [seasonId, presenterId],
  });
  if (dup.rows.length) return res.status(409).json({ error: 'presenter_already_added' });

  const slot = await findOpenRoundNumber(seasonId);
  if (slot.error) return res.status(400).json({ error: slot.error });

  let posterUrl = null;
  let posterPublicId = null;
  if (req.file) {
    try {
      const { url, public_id } = await uploadBuffer(req.file.buffer);
      posterUrl = url;
      posterPublicId = public_id;
    } catch (err) {
      return res.status(500).json({ error: 'upload_failed', message: err.message });
    }
  }

  const inserted = await db.execute({
    sql: `INSERT INTO movies
            (title, year, director, poster_url, poster_public_id, event_date, presenter_id, season_id, round_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [title, year, director, posterUrl, posterPublicId, eventDate, presenterId, seasonId, slot.round],
  });

  await maybeCloseSeason(seasonId);

  res.status(201).json({ id: Number(inserted.rows[0].id), round_number: slot.round });
});

// Mounted at /api/movies
router.get('/:id', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const m = await db.execute({
    sql: `SELECT m.*, mem.first_name AS presenter_name,
                 (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id) AS average_rating,
                 (SELECT COUNT(*) FROM ratings r WHERE r.movie_id = m.id)   AS rating_count,
                 (SELECT score FROM ratings r WHERE r.movie_id = m.id AND r.member_id = ?) AS your_score
          FROM movies m
          LEFT JOIN members mem ON mem.id = m.presenter_id
          WHERE m.id = ?`,
    args: [req.member.id, movieId],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });
  const row = m.rows[0];
  const cats = await db.execute({
    sql: `SELECT c.id, c.name
          FROM movie_categories mc
          JOIN categories c ON c.id = mc.category_id
          WHERE mc.movie_id = ?
          ORDER BY c.name COLLATE NOCASE`,
    args: [movieId],
  });
  res.json({
    id: row.id,
    title: row.title,
    year: row.year,
    director: row.director,
    poster_url: row.poster_url,
    event_date: row.event_date,
    presenter_id: row.presenter_id,
    presenter_name: row.presenter_name,
    season_id: row.season_id,
    round_number: row.round_number,
    average_rating: row.average_rating == null ? null : Number(row.average_rating),
    rating_count: Number(row.rating_count || 0),
    your_score: row.your_score == null ? null : Number(row.your_score),
    categories: cats.rows.map((c) => ({ id: c.id, name: c.name })),
  });
});

router.put('/:id', requireAuth, upload.single('poster'), async (req, res) => {
  const movieId = Number(req.params.id);
  const m = await db.execute({
    sql: 'SELECT presenter_id, poster_public_id FROM movies WHERE id = ?',
    args: [movieId],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });
  const row = m.rows[0];
  const allowed = req.member.is_admin || Number(row.presenter_id) === req.member.id;
  if (!allowed) return res.status(403).json({ error: 'forbidden' });

  const fields = [];
  const args = [];
  if (req.body.title !== undefined) { fields.push('title = ?'); args.push(String(req.body.title).trim()); }
  if (req.body.year !== undefined) { fields.push('year = ?'); args.push(req.body.year ? Number(req.body.year) : null); }
  if (req.body.director !== undefined) { fields.push('director = ?'); args.push(String(req.body.director).trim() || null); }
  if (req.body.event_date !== undefined) { fields.push('event_date = ?'); args.push(String(req.body.event_date).trim() || null); }

  if (req.file) {
    try {
      const { url, public_id } = await uploadBuffer(req.file.buffer);
      fields.push('poster_url = ?'); args.push(url);
      fields.push('poster_public_id = ?'); args.push(public_id);
    } catch (err) {
      return res.status(500).json({ error: 'upload_failed', message: err.message });
    }
  }

  if (!fields.length) return res.json({ ok: true });

  args.push(movieId);
  await db.execute({
    sql: `UPDATE movies SET ${fields.join(', ')} WHERE id = ?`,
    args,
  });
  res.json({ ok: true });
});

router.post('/:id/rate', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const score = Number(req.body?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'invalid_score' });
  }
  const m = await db.execute({
    sql: 'SELECT presenter_id FROM movies WHERE id = ?',
    args: [movieId],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });
  if (Number(m.rows[0].presenter_id) === req.member.id) {
    return res.status(400).json({ error: 'cannot_rate_own_movie' });
  }
  await db.execute({
    sql: `INSERT INTO ratings (movie_id, member_id, score)
          VALUES (?, ?, ?)
          ON CONFLICT(movie_id, member_id) DO UPDATE SET score = excluded.score`,
    args: [movieId, req.member.id, score],
  });
  res.json({ ok: true });
});

router.get('/:id/rating', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const r = await db.execute({
    sql: `SELECT AVG(score) AS average, COUNT(*) AS count FROM ratings WHERE movie_id = ?`,
    args: [movieId],
  });
  const own = await db.execute({
    sql: 'SELECT score FROM ratings WHERE movie_id = ? AND member_id = ?',
    args: [movieId, req.member.id],
  });
  res.json({
    average: r.rows[0].average == null ? null : Number(r.rows[0].average),
    count: Number(r.rows[0].count || 0),
    your_score: own.rows.length ? Number(own.rows[0].score) : null,
  });
});

router.post('/:id/categories', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const catId = Number(req.body?.category_id);
  if (!catId) return res.status(400).json({ error: 'category_id_required' });
  const m = await db.execute({ sql: 'SELECT 1 FROM movies WHERE id = ?', args: [movieId] });
  if (!m.rows.length) return res.status(404).json({ error: 'movie_not_found' });
  const c = await db.execute({ sql: 'SELECT 1 FROM categories WHERE id = ?', args: [catId] });
  if (!c.rows.length) return res.status(404).json({ error: 'category_not_found' });
  await db.execute({
    sql: `INSERT OR IGNORE INTO movie_categories (movie_id, category_id) VALUES (?, ?)`,
    args: [movieId, catId],
  });
  res.json({ ok: true });
});

router.delete('/:id/categories/:cid', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const catId = Number(req.params.cid);
  await db.execute({
    sql: 'DELETE FROM movie_categories WHERE movie_id = ? AND category_id = ?',
    args: [movieId, catId],
  });
  res.json({ ok: true });
});

module.exports = { moviesRouter: router, seasonScopedMoviesRouter: seasonScopedRouter };
