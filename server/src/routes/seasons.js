const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/seasons
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.execute(
    `SELECT s.id, s.name, s.rounds, s.status, s.host_id,
            (SELECT COUNT(*) FROM movies m WHERE m.season_id = s.id) AS movies_added
     FROM seasons s
     ORDER BY s.id DESC`,
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      rounds: r.rounds,
      status: r.status,
      host_id: r.host_id ? Number(r.host_id) : null,
      is_host: r.host_id ? Number(r.host_id) === req.member.id : false,
      movies_added: Number(r.movies_added || 0),
    })),
  );
});

// GET /api/seasons/:id/members — ordered presentation queue
router.get('/:id/members', requireAuth, async (req, res) => {
  const seasonId = Number(req.params.id);
  const { rows } = await db.execute({
    sql: `SELECT sm.member_id, sm.round_order, mem.first_name,
                 CASE WHEN mv.id IS NOT NULL THEN 1 ELSE 0 END AS has_presented,
                 mv.id AS movie_id, mv.title AS movie_title
          FROM season_members sm
          JOIN members mem ON mem.id = sm.member_id
          LEFT JOIN movies mv ON mv.presenter_id = sm.member_id AND mv.season_id = sm.season_id
          WHERE sm.season_id = ?
          ORDER BY sm.round_order ASC`,
    args: [seasonId],
  });
  res.json(rows.map((r) => ({
    memberId: Number(r.member_id),
    name: r.first_name,
    roundOrder: Number(r.round_order),
    hasPresented: Boolean(r.has_presented),
    movieId: r.movie_id ? Number(r.movie_id) : null,
    movieTitle: r.movie_title || null,
  })));
});

// GET /api/seasons/:id/movies — aggregated ratings + your_score
router.get('/:id/movies', requireAuth, async (req, res) => {
  const seasonId = Number(req.params.id);
  const memberId = req.member.id;

  const seasonRow = await db.execute({
    sql: 'SELECT status, host_id FROM seasons WHERE id = ?',
    args: [seasonId],
  });
  if (!seasonRow.rows.length) return res.status(404).json({ error: 'season_not_found' });
  const season = seasonRow.rows[0];
  const ratingsVisible = season.status === 'presented' || Number(season.host_id) === memberId;

  const { rows } = await db.execute({
    sql: `SELECT m.id, m.title, m.year, m.director, m.poster_url, m.event_date, m.created_at,
                 m.round_number, m.presenter_id,
                 mem.first_name AS presenter_name,
                 (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id)  AS average_rating,
                 (SELECT COUNT(*) FROM ratings r WHERE r.movie_id = m.id)    AS rating_count,
                 (SELECT score FROM ratings r WHERE r.movie_id = m.id AND r.member_id = ?) AS your_score
          FROM movies m
          LEFT JOIN members mem ON mem.id = m.presenter_id
          WHERE m.season_id = ?
          ORDER BY m.round_number ASC`,
    args: [memberId, seasonId],
  });
  res.json(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year,
      director: r.director,
      poster_url: r.poster_url,
      event_date: r.event_date,
      created_at: r.created_at || null,
      round_number: r.round_number,
      presenter_id: r.presenter_id,
      presenter_name: r.presenter_name,
      average_rating: ratingsVisible && r.average_rating != null ? Number(r.average_rating) : null,
      rating_count: ratingsVisible ? Number(r.rating_count || 0) : null,
      your_score: r.your_score == null ? null : Number(r.your_score),
    })),
  );
});

// GET /api/seasons/:id/final-voting
// Nominees = movies with referrals in this season (primary) + movie_categories (backward compat)
router.get('/:id/final-voting', requireAuth, async (req, res) => {
  const seasonId = Number(req.params.id);
  const season = await db.execute({
    sql: 'SELECT id, status FROM seasons WHERE id = ?',
    args: [seasonId],
  });
  if (!season.rows.length) return res.status(404).json({ error: 'season_not_found' });
  if (season.rows[0].status !== 'completed') {
    return res.status(400).json({ error: 'season_not_completed' });
  }

  // Referral-based nominees (democratic nominations)
  const referralNoms = await db.execute({
    sql: `SELECT ref.category_id, c.name AS category_name,
                 m.id AS movie_id, m.title, m.poster_url,
                 (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id) AS average_rating,
                 COUNT(ref.id) AS referral_count
          FROM referrals ref
          JOIN movies m ON m.id = ref.movie_id
          JOIN categories c ON c.id = ref.category_id
          WHERE m.season_id = ?
          GROUP BY ref.category_id, m.id
          ORDER BY ref.category_id, referral_count DESC`,
    args: [seasonId],
  });

  // movie_categories nominees (backward compat with manually assigned categories)
  const catNoms = await db.execute({
    sql: `SELECT mc.category_id, c.name AS category_name,
                 m.id AS movie_id, m.title, m.poster_url,
                 (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id) AS average_rating,
                 0 AS referral_count
          FROM movie_categories mc
          JOIN movies m ON m.id = mc.movie_id
          JOIN categories c ON c.id = mc.category_id
          WHERE m.season_id = ?`,
    args: [seasonId],
  });

  const myVotes = await db.execute({
    sql: 'SELECT category_id, movie_id FROM final_votes WHERE season_id = ? AND voter_id = ?',
    args: [seasonId, req.member.id],
  });
  const votedByCat = Object.fromEntries(
    myVotes.rows.map((v) => [Number(v.category_id), Number(v.movie_id)]),
  );

  // Merge nominees, deduplicating by (category_id, movie_id), preferring referral counts
  const catMap = {};
  const addNominee = (row, isReferral) => {
    const catId = Number(row.category_id);
    if (!catMap[catId]) {
      catMap[catId] = { id: catId, name: row.category_name, nominees: new Map() };
    }
    const movieId = Number(row.movie_id);
    if (!catMap[catId].nominees.has(movieId)) {
      catMap[catId].nominees.set(movieId, {
        id: movieId,
        title: row.title,
        poster_url: row.poster_url,
        average_rating: row.average_rating == null ? null : Number(row.average_rating),
        referral_count: Number(row.referral_count || 0),
      });
    } else if (isReferral) {
      const existing = catMap[catId].nominees.get(movieId);
      existing.referral_count = Math.max(existing.referral_count, Number(row.referral_count || 0));
    }
  };

  for (const r of referralNoms.rows) addNominee(r, true);
  for (const r of catNoms.rows) addNominee(r, false);

  res.json(
    Object.values(catMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        nominees: [...cat.nominees.values()].sort((a, b) => b.referral_count - a.referral_count),
        your_vote_movie_id: votedByCat[cat.id] ?? null,
      })),
  );
});

// POST /api/seasons/:id/final-votes { category_id, movie_id }
router.post('/:id/final-votes', requireAuth, async (req, res) => {
  const seasonId = Number(req.params.id);
  const categoryId = Number(req.body?.category_id);
  const movieId = Number(req.body?.movie_id);
  if (!categoryId || !movieId) return res.status(400).json({ error: 'missing_fields' });

  const season = await db.execute({
    sql: 'SELECT status FROM seasons WHERE id = ?',
    args: [seasonId],
  });
  if (!season.rows.length) return res.status(404).json({ error: 'season_not_found' });
  if (season.rows[0].status !== 'completed') {
    return res.status(400).json({ error: 'season_not_completed' });
  }

  // Movie must be nominated in this category (via referrals or movie_categories) and belong to this season
  const check = await db.execute({
    sql: `SELECT 1 FROM movies m
          WHERE m.id = ? AND m.season_id = ?
          AND (
            EXISTS (SELECT 1 FROM referrals r WHERE r.movie_id = m.id AND r.category_id = ?)
            OR EXISTS (SELECT 1 FROM movie_categories mc WHERE mc.movie_id = m.id AND mc.category_id = ?)
          )`,
    args: [movieId, seasonId, categoryId, categoryId],
  });
  if (!check.rows.length) return res.status(400).json({ error: 'invalid_nominee' });

  try {
    await db.execute({
      sql: `INSERT INTO final_votes (season_id, category_id, voter_id, movie_id)
            VALUES (?, ?, ?, ?)`,
      args: [seasonId, categoryId, req.member.id, movieId],
    });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'already_voted' });
    }
    throw err;
  }
  res.json({ ok: true });
});

// GET /api/seasons/:id/results — winners + counts, no voter identity
router.get('/:id/results', requireAuth, async (req, res) => {
  const seasonId = Number(req.params.id);
  const cats = await db.execute('SELECT id, name FROM categories ORDER BY name COLLATE NOCASE');
  const tallies = await db.execute({
    sql: `SELECT fv.category_id, fv.movie_id, m.title, m.poster_url, COUNT(*) AS votes
          FROM final_votes fv
          JOIN movies m ON m.id = fv.movie_id
          WHERE fv.season_id = ?
          GROUP BY fv.category_id, fv.movie_id
          ORDER BY fv.category_id, votes DESC`,
    args: [seasonId],
  });
  const byCat = {};
  for (const r of tallies.rows) {
    const key = Number(r.category_id);
    if (!byCat[key]) byCat[key] = [];
    byCat[key].push({
      movie_id: Number(r.movie_id),
      title: r.title,
      poster_url: r.poster_url,
      votes: Number(r.votes),
    });
  }
  res.json(
    cats.rows.map((c) => {
      const tally = byCat[Number(c.id)] || [];
      const topVotes = tally[0]?.votes ?? 0;
      return {
        category_id: c.id,
        category_name: c.name,
        tally,
        winners: tally.filter((t) => t.votes === topVotes && topVotes > 0),
      };
    }),
  );
});

module.exports = router;
