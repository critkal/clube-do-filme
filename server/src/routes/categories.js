const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await db.execute(
    'SELECT id, name FROM categories ORDER BY name COLLATE NOCASE',
  );
  res.json(rows.map((r) => ({ id: r.id, name: r.name })));
});

// POST /api/categories { name }
router.post('/', requireAuth, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name_required' });
  try {
    const r = await db.execute({
      sql: 'INSERT INTO categories (name) VALUES (?) RETURNING id',
      args: [name],
    });
    res.status(201).json({ id: Number(r.rows[0].id), name });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'category_exists' });
    }
    throw err;
  }
});

// DELETE /api/categories/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.execute({ sql: 'DELETE FROM referrals WHERE category_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM movie_categories WHERE category_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM final_votes WHERE category_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] });
  res.json({ ok: true });
});

module.exports = router;
