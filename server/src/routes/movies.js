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

// event_date is a plain YYYY-MM-DD. The club meets in Brazil (UTC-3, no DST since 2019),
// so the session day starts at 00:00 -03:00 whatever the server's own timezone is.
const ATTENDANCE_WINDOW_MS = 48 * 60 * 60 * 1000;
function attendanceWindow(eventDate) {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(eventDate || '');
  if (!day) return null;
  const opens = new Date(`${day[0]}T00:00:00-03:00`);
  if (Number.isNaN(opens.getTime())) return null;
  return { opens, closes: new Date(opens.getTime() + ATTENDANCE_WINDOW_MS) };
}

// Shared checks for marking/unmarking attendance. Members act only on themselves and only
// inside the window; admins may target any member at any time.
async function resolveAttendanceTarget(req, rawMemberId) {
  const movieId = Number(req.params.id);
  const m = await db.execute({ sql: 'SELECT event_date FROM movies WHERE id = ?', args: [movieId] });
  if (!m.rows.length) return { status: 404, error: 'not_found' };

  const hasTarget = rawMemberId != null && rawMemberId !== '';
  const memberId = hasTarget ? Number(rawMemberId) : req.member.id;
  if (!req.member.is_admin) {
    if (memberId !== req.member.id) return { status: 403, error: 'forbidden' };
    const win = attendanceWindow(m.rows[0].event_date);
    const now = Date.now();
    if (!win || now < win.opens.getTime() || now >= win.closes.getTime()) {
      return { status: 403, error: 'attendance_closed' };
    }
  } else if (memberId !== req.member.id) {
    const mem = await db.execute({ sql: 'SELECT 1 FROM members WHERE id = ?', args: [memberId] });
    if (!mem.rows.length) return { status: 404, error: 'member_not_found' };
  }
  return { movieId, memberId };
}

// Mounted at /api/seasons — POST /api/seasons/:seasonId/movies
seasonScopedRouter.post('/:seasonId/movies', requireAuth, upload.single('poster'), async (req, res) => {
  const seasonId = Number(req.params.seasonId);
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });
  const year = req.body.year ? Number(req.body.year) : null;
  const director = (req.body.director || '').trim() || null;
  const eventDate = (req.body.event_date || '').trim() || null;
  const tmdbId = req.body.tmdb_id ? Number(req.body.tmdb_id) : null;
  const synopsis = (req.body.synopsis || '').trim() || null;
  const genre = (req.body.genre || '').trim() || null;
  const runtime = req.body.runtime ? Number(req.body.runtime) : null;
  const tmdbPosterUrl = (req.body.tmdb_poster_url || '').trim() || null;

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

  let posterUrl = tmdbPosterUrl;
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
            (title, year, director, poster_url, poster_public_id, event_date,
             tmdb_id, synopsis, genre, runtime,
             presenter_id, season_id, round_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [title, year, director, posterUrl, posterPublicId, eventDate,
           tmdbId, synopsis, genre, runtime,
           presenterId, seasonId, slot.round],
  });

  await maybeCloseSeason(seasonId);

  res.status(201).json({ id: Number(inserted.rows[0].id), round_number: slot.round });
});

// Mounted at /api/movies
router.get('/:id', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const memberId = req.member.id;
  const m = await db.execute({
    sql: `SELECT m.*, mem.first_name AS presenter_name,
                 s.status AS season_status, s.host_id AS season_host_id,
                 (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id)    AS average_rating,
                 (SELECT COUNT(*) FROM ratings r WHERE r.movie_id = m.id)      AS rating_count,
                 (SELECT score   FROM ratings r WHERE r.movie_id = m.id AND r.member_id = ?) AS your_score,
                 (SELECT comment FROM ratings r WHERE r.movie_id = m.id AND r.member_id = ?) AS your_comment
          FROM movies m
          LEFT JOIN members mem ON mem.id = m.presenter_id
          LEFT JOIN seasons s ON s.id = m.season_id
          WHERE m.id = ?`,
    args: [memberId, memberId, movieId],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });
  const row = m.rows[0];
  const isHost = Number(row.season_host_id) === memberId;
  const ratingsVisible = row.season_status === 'presented' || isHost;

  const cats = await db.execute({
    sql: `SELECT c.id, c.name
          FROM movie_categories mc
          JOIN categories c ON c.id = mc.category_id
          WHERE mc.movie_id = ?
          ORDER BY c.name COLLATE NOCASE`,
    args: [movieId],
  });

  const refs = await db.execute({
    sql: `SELECT ref.category_id, c.name AS category_name,
                 COUNT(*) AS count,
                 MAX(CASE WHEN ref.member_id = ? THEN 1 ELSE 0 END) AS you_referred
          FROM referrals ref
          JOIN categories c ON c.id = ref.category_id
          WHERE ref.movie_id = ?
          GROUP BY ref.category_id
          ORDER BY count DESC, c.name COLLATE NOCASE`,
    args: [memberId, movieId],
  });

  const att = await db.execute({
    sql: `SELECT a.member_id, mem.first_name
          FROM attendances a
          JOIN members mem ON mem.id = a.member_id
          WHERE a.movie_id = ?
          ORDER BY mem.first_name COLLATE NOCASE`,
    args: [movieId],
  });
  const win = attendanceWindow(row.event_date);
  const now = Date.now();

  let voteComments = null;
  if (isHost) {
    const vc = await db.execute({
      sql: `SELECT mem.first_name AS voter_name, r.score, r.comment
            FROM ratings r
            JOIN members mem ON mem.id = r.member_id
            WHERE r.movie_id = ? AND r.comment IS NOT NULL AND r.comment != ''
            ORDER BY mem.first_name COLLATE NOCASE`,
      args: [movieId],
    });
    voteComments = vc.rows.map((r) => ({
      voter_name: r.voter_name,
      score: Number(r.score),
      comment: r.comment,
    }));
  }

  const response = {
    id: row.id,
    title: row.title,
    year: row.year,
    director: row.director,
    poster_url: row.poster_url,
    event_date: row.event_date,
    tmdb_id: row.tmdb_id ? Number(row.tmdb_id) : null,
    synopsis: row.synopsis || null,
    genre: row.genre || null,
    runtime: row.runtime ? Number(row.runtime) : null,
    presenter_id: row.presenter_id,
    presenter_name: row.presenter_name,
    season_id: row.season_id,
    season_status: row.season_status,
    season_host_id: row.season_host_id ? Number(row.season_host_id) : null,
    round_number: row.round_number,
    ratings_visible: ratingsVisible,
    average_rating: ratingsVisible && row.average_rating != null ? Number(row.average_rating) : null,
    rating_count: ratingsVisible ? Number(row.rating_count || 0) : null,
    your_score: row.your_score == null ? null : Number(row.your_score),
    your_comment: row.your_comment || null,
    categories: cats.rows.map((c) => ({ id: c.id, name: c.name })),
    referrals: refs.rows.map((r) => ({
      category_id: Number(r.category_id),
      category_name: r.category_name,
      count: Number(r.count),
      you_referred: Boolean(r.you_referred),
    })),
    attendees: att.rows.map((a) => ({ member_id: Number(a.member_id), first_name: a.first_name })),
    attendance_opens_at: win ? win.opens.toISOString() : null,
    attendance_closes_at: win ? win.closes.toISOString() : null,
    attendance_open: Boolean(win && now >= win.opens.getTime() && now < win.closes.getTime()),
  };
  if (voteComments !== null) {
    response.vote_comments = voteComments;
  }
  res.json(response);
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
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return res.status(400).json({ error: 'invalid_score' });
  }
  const comment = (req.body?.comment || '').trim() || null;

  const m = await db.execute({
    sql: 'SELECT presenter_id FROM movies WHERE id = ?',
    args: [movieId],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });
  if (Number(m.rows[0].presenter_id) === req.member.id) {
    return res.status(400).json({ error: 'cannot_rate_own_movie' });
  }
  await db.execute({
    sql: `INSERT INTO ratings (movie_id, member_id, score, comment)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(movie_id, member_id) DO UPDATE SET score = excluded.score, comment = excluded.comment`,
    args: [movieId, req.member.id, score, comment],
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

// POST /api/movies/:id/attendance { member_id? } — member_id only honored for admins
router.post('/:id/attendance', requireAuth, async (req, res) => {
  const t = await resolveAttendanceTarget(req, req.body?.member_id);
  if (t.error) return res.status(t.status).json({ error: t.error });
  await db.execute({
    sql: 'INSERT OR IGNORE INTO attendances (movie_id, member_id) VALUES (?, ?)',
    args: [t.movieId, t.memberId],
  });
  res.json({ ok: true });
});

// DELETE /api/movies/:id/attendance?member_id= — member_id only honored for admins
router.delete('/:id/attendance', requireAuth, async (req, res) => {
  const t = await resolveAttendanceTarget(req, req.query.member_id);
  if (t.error) return res.status(t.status).json({ error: t.error });
  await db.execute({
    sql: 'DELETE FROM attendances WHERE movie_id = ? AND member_id = ?',
    args: [t.movieId, t.memberId],
  });
  res.json({ ok: true });
});

// Referrals — anyone can refer a movie to a category
router.post('/:id/referrals', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const memberId = req.member.id;

  const movieCheck = await db.execute({ sql: 'SELECT 1 FROM movies WHERE id = ?', args: [movieId] });
  if (!movieCheck.rows.length) return res.status(404).json({ error: 'movie_not_found' });

  let categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
  const categoryName = (req.body?.category_name || '').trim();

  if (!categoryId && !categoryName) {
    return res.status(400).json({ error: 'category_id_or_name_required' });
  }

  if (!categoryId && categoryName) {
    try {
      const c = await db.execute({
        sql: 'INSERT INTO categories (name) VALUES (?) RETURNING id',
        args: [categoryName],
      });
      categoryId = Number(c.rows[0].id);
    } catch (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        const existing = await db.execute({
          sql: 'SELECT id FROM categories WHERE name = ?',
          args: [categoryName],
        });
        if (!existing.rows.length) throw err;
        categoryId = Number(existing.rows[0].id);
      } else {
        throw err;
      }
    }
  }

  try {
    await db.execute({
      sql: 'INSERT INTO referrals (movie_id, member_id, category_id) VALUES (?, ?, ?)',
      args: [movieId, memberId, categoryId],
    });
    res.status(201).json({ ok: true, category_id: categoryId });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.json({ ok: true, category_id: categoryId });
    }
    throw err;
  }
});

router.delete('/:id/referrals/:catId', requireAuth, async (req, res) => {
  const movieId = Number(req.params.id);
  const catId = Number(req.params.catId);
  await db.execute({
    sql: 'DELETE FROM referrals WHERE movie_id = ? AND member_id = ? AND category_id = ?',
    args: [movieId, req.member.id, catId],
  });
  res.json({ ok: true });
});

// Kept for admin/backward-compat use
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
