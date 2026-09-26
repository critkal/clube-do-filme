const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/seasons/:id — season metrics for admins.
// Averages are always real here: the dashboard is admin-only, so the
// `presented` secrecy rule does not apply.
router.get('/seasons/:id', requireAdmin, async (req, res) => {
  const seasonId = Number(req.params.id);

  const seasonRow = await db.execute({
    sql: `SELECT s.id, s.name, s.rounds, s.status, s.host_id, h.first_name AS host_name
          FROM seasons s
          LEFT JOIN members h ON h.id = s.host_id
          WHERE s.id = ?`,
    args: [seasonId],
  });
  if (!seasonRow.rows.length) return res.status(404).json({ error: 'season_not_found' });
  const s = seasonRow.rows[0];

  const [movies, distribution, overall, members] = await Promise.all([
    db.execute({
      sql: `SELECT m.id, m.title, m.round_number, m.event_date, mem.first_name AS presenter_name,
                   (SELECT AVG(score) FROM ratings r WHERE r.movie_id = m.id) AS average_rating,
                   (SELECT COUNT(*) FROM ratings r WHERE r.movie_id = m.id) AS rating_count,
                   (SELECT COUNT(*) FROM attendances a WHERE a.movie_id = m.id) AS attendance_count
            FROM movies m
            LEFT JOIN members mem ON mem.id = m.presenter_id
            WHERE m.season_id = ?
            ORDER BY m.round_number ASC`,
      args: [seasonId],
    }),
    db.execute({
      sql: `SELECT r.score, COUNT(*) AS count
            FROM ratings r
            JOIN movies m ON m.id = r.movie_id
            WHERE m.season_id = ?
            GROUP BY r.score`,
      args: [seasonId],
    }),
    db.execute({
      sql: `SELECT AVG(r.score) AS average_rating, COUNT(*) AS rating_count
            FROM ratings r
            JOIN movies m ON m.id = r.movie_id
            WHERE m.season_id = ?`,
      args: [seasonId],
    }),
    // Season roster plus anyone who rated, referred or attended without being in the queue.
    db.execute({
      sql: `SELECT * FROM (
              SELECT mem.id, mem.first_name,
                     EXISTS (SELECT 1 FROM season_members sm
                             WHERE sm.season_id = ?1 AND sm.member_id = mem.id) AS in_season,
                     (SELECT COUNT(*) FROM ratings r JOIN movies m ON m.id = r.movie_id
                      WHERE m.season_id = ?1 AND r.member_id = mem.id) AS ratings_given,
                     (SELECT COUNT(*) FROM referrals ref JOIN movies m ON m.id = ref.movie_id
                      WHERE m.season_id = ?1 AND ref.member_id = mem.id) AS referrals_given,
                     (SELECT COUNT(*) FROM attendances a JOIN movies m ON m.id = a.movie_id
                      WHERE m.season_id = ?1 AND a.member_id = mem.id) AS attended
              FROM members mem
            )
            WHERE in_season OR ratings_given > 0 OR referrals_given > 0 OR attended > 0
            ORDER BY first_name COLLATE NOCASE`,
      args: [seasonId],
    }),
  ]);

  const sessions = movies.rows.length;
  const counts = new Map(distribution.rows.map((r) => [Number(r.score), Number(r.count)]));

  const memberStats = members.rows.map((r) => ({
    member_id: Number(r.id),
    name: r.first_name,
    ratings_given: Number(r.ratings_given || 0),
    referrals_given: Number(r.referrals_given || 0),
    attended: Number(r.attended || 0),
    attendance_pct: sessions ? Math.round((Number(r.attended || 0) / sessions) * 100) : 0,
  }));

  const activity = (m) => m.ratings_given + m.referrals_given;
  const mostActive = memberStats.reduce(
    (best, m) => (activity(m) > 0 && (!best || activity(m) > activity(best)) ? m : best),
    null,
  );

  const o = overall.rows[0];
  res.json({
    season: {
      id: Number(s.id),
      name: s.name,
      rounds: Number(s.rounds),
      status: s.status,
      host_id: s.host_id ? Number(s.host_id) : null,
      host_name: s.host_name || null,
    },
    movies_watched: sessions,
    average_rating: o.average_rating != null ? Number(o.average_rating) : null,
    rating_count: Number(o.rating_count || 0),
    distribution: Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: counts.get(i + 1) || 0 })),
    movies: movies.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      round_number: r.round_number != null ? Number(r.round_number) : null,
      event_date: r.event_date || null,
      presenter_name: r.presenter_name || null,
      average_rating: r.average_rating != null ? Number(r.average_rating) : null,
      rating_count: Number(r.rating_count || 0),
      attendance_count: Number(r.attendance_count || 0),
    })),
    members: memberStats,
    most_active: mostActive,
  });
});

module.exports = router;
