const { db } = require('../db');

async function loadMember(memberId) {
  if (!memberId) return null;
  const { rows } = await db.execute({
    sql: 'SELECT id, first_name, is_admin FROM members WHERE id = ?',
    args: [memberId],
  });
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r.id, first_name: r.first_name, is_admin: !!r.is_admin };
}

async function attachMember(req, _res, next) {
  req.member = req.session?.memberId ? await loadMember(req.session.memberId) : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'not_authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'not_authenticated' });
  if (!req.member.is_admin) return res.status(403).json({ error: 'admin_only' });
  next();
}

module.exports = { attachMember, requireAuth, requireAdmin, loadMember };
