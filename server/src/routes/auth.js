const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/members — used by login dropdown
router.get('/members', async (_req, res) => {
  const { rows } = await db.execute(
    'SELECT id, first_name, is_admin, password_hash FROM members ORDER BY first_name COLLATE NOCASE',
  );
  res.json(rows.map((r) => ({
    id: r.id,
    first_name: r.first_name,
    is_admin: !!r.is_admin,
    has_password: !!(r.is_admin && r.password_hash),
  })));
});

// POST /api/login { first_name, password? }
router.post('/login', async (req, res) => {
  const name = (req.body?.first_name || '').trim();
  const password = req.body?.password || '';
  if (!name) return res.status(400).json({ error: 'first_name_required' });

  const { rows } = await db.execute({
    sql: 'SELECT id, is_admin, password_hash FROM members WHERE first_name = ? COLLATE NOCASE',
    args: [name],
  });
  if (!rows.length) return res.status(404).json({ error: 'member_not_found' });

  const member = rows[0];
  if (member.is_admin && member.password_hash) {
    if (!password) return res.status(401).json({ error: 'password_required' });
    const ok = await bcrypt.compare(password, member.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_password' });
  }

  const token = await res.setSession(member.id);
  res.json({ ok: true, token });
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
