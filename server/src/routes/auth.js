const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/members — used by login dropdown
router.get('/members', async (_req, res) => {
  const { rows } = await db.execute(
    'SELECT id, first_name, is_admin FROM members ORDER BY first_name COLLATE NOCASE',
  );
  res.json(rows.map((r) => ({ id: r.id, first_name: r.first_name, is_admin: !!r.is_admin })));
});

// POST /api/login { first_name }
router.post('/login', async (req, res) => {
  const name = (req.body?.first_name || '').trim();
  if (!name) return res.status(400).json({ error: 'first_name_required' });
  const { rows } = await db.execute({
    sql: 'SELECT id FROM members WHERE first_name = ? COLLATE NOCASE',
    args: [name],
  });
  if (!rows.length) return res.status(404).json({ error: 'member_not_found' });
  await res.setSession(rows[0].id);
  res.json({ ok: true });
});

// POST /api/logout
router.post('/logout', requireAuth, async (_req, res) => {
  await res.clearSessionCookie();
  res.json({ ok: true });
});

// GET /api/me
router.get('/me', requireAuth, async (req, res) => {
  res.json(req.member);
});

module.exports = router;
