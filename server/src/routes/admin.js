const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { destroyAsset } = require('../cloudinary');

const router = express.Router();

// POST /api/admin/members { first_name, is_admin? }
router.post('/members', requireAdmin, async (req, res) => {
  const name = (req.body?.first_name || '').trim();
  const isAdmin = req.body?.is_admin ? 1 : 0;
  if (!name) return res.status(400).json({ error: 'first_name_required' });
  try {
    const r = await db.execute({
      sql: 'INSERT INTO members (first_name, is_admin) VALUES (?, ?) RETURNING id',
      args: [name, isAdmin],
    });
    res.status(201).json({ id: Number(r.rows[0].id), first_name: name, is_admin: !!isAdmin });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'member_exists' });
    }
    throw err;
  }
});

// DELETE /api/admin/members/:id
router.delete('/members/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.member.id) return res.status(400).json({ error: 'cannot_delete_self' });
  // Keep history simple: block delete if member has any movies or ratings tied to a completed season
  const hasMovies = await db.execute({
    sql: 'SELECT 1 FROM movies WHERE presenter_id = ? LIMIT 1',
    args: [id],
  });
  if (hasMovies.rows.length) {
    return res.status(409).json({ error: 'member_has_movies' });
  }
  await db.execute({ sql: 'DELETE FROM ratings WHERE member_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM final_votes WHERE voter_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM season_members WHERE member_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM sessions WHERE sess LIKE ?', args: [`%"memberId":${id}%`] });
  await db.execute({ sql: 'DELETE FROM members WHERE id = ?', args: [id] });
  res.json({ ok: true });
});

// POST /api/admin/seasons { name? } — auto-adds all current members, rounds = member count
router.post('/seasons', requireAdmin, async (req, res) => {
  const name = (req.body?.name || '').trim() || null;

  const active = await db.execute(
    "SELECT id FROM seasons WHERE status = 'active' LIMIT 1",
  );
  if (active.rows.length) {
    return res.status(409).json({ error: 'active_season_exists' });
  }

  const members = await db.execute('SELECT id FROM members ORDER BY id');
  if (!members.rows.length) return res.status(400).json({ error: 'no_members' });
  const memberIds = members.rows.map((r) => Number(r.id));

  // Shuffle for round order
  for (let i = memberIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [memberIds[i], memberIds[j]] = [memberIds[j], memberIds[i]];
  }

  const ins = await db.execute({
    sql: "INSERT INTO seasons (name, rounds, status) VALUES (?, ?, 'active') RETURNING id",
    args: [name, memberIds.length],
  });
  const seasonId = Number(ins.rows[0].id);

  for (let i = 0; i < memberIds.length; i++) {
    await db.execute({
      sql: 'INSERT INTO season_members (season_id, member_id, round_order) VALUES (?, ?, ?)',
      args: [seasonId, memberIds[i], i + 1],
    });
  }
  res.status(201).json({ id: seasonId, rounds: memberIds.length });
});

// POST /api/admin/seasons/:id/complete — force-close
router.post('/seasons/:id/complete', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.execute({
    sql: "UPDATE seasons SET status = 'completed' WHERE id = ?",
    args: [id],
  });
  res.json({ ok: true });
});

// DELETE /api/admin/movies/:id — cascades ratings, category links, final votes; removes poster
router.delete('/movies/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const m = await db.execute({
    sql: 'SELECT poster_public_id FROM movies WHERE id = ?',
    args: [id],
  });
  if (!m.rows.length) return res.status(404).json({ error: 'not_found' });

  await db.execute({ sql: 'DELETE FROM ratings WHERE movie_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM movie_categories WHERE movie_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM final_votes WHERE movie_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM movies WHERE id = ?', args: [id] });

  const publicId = m.rows[0].poster_public_id;
  if (publicId) destroyAsset(publicId); // fire-and-forget

  res.json({ ok: true });
});

module.exports = router;
