const crypto = require('crypto');
const { db } = require('./db');

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'cdf_session';
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

function newSid() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(memberId) {
  const sid = newSid();
  const expired = new Date(Date.now() + TTL_MS).toISOString();
  const sess = JSON.stringify({ memberId });
  await db.execute({
    sql: 'INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)',
    args: [sid, sess, expired],
  });
  return { sid, expired };
}

async function getSession(sid) {
  if (!sid) return null;
  const { rows } = await db.execute({
    sql: 'SELECT sid, sess, expired FROM sessions WHERE sid = ?',
    args: [sid],
  });
  if (!rows.length) return null;
  const row = rows[0];
  if (new Date(row.expired).getTime() < Date.now()) {
    await destroySession(sid);
    return null;
  }
  try {
    return JSON.parse(row.sess);
  } catch {
    return null;
  }
}

async function destroySession(sid) {
  if (!sid) return;
  await db.execute({ sql: 'DELETE FROM sessions WHERE sid = ?', args: [sid] });
}

function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: TTL_MS,
    path: '/',
  };
}

function sessionMiddleware() {
  return async (req, res, next) => {
    const sid = req.cookies?.[COOKIE_NAME];
    const sess = await getSession(sid);
    req.session = sess;
    req.sid = sid;
    res.setSession = async (memberId) => {
      const { sid: newSid } = await createSession(memberId);
      res.cookie(COOKIE_NAME, newSid, sessionCookieOptions());
      req.session = { memberId };
      req.sid = newSid;
    };
    res.clearSessionCookie = async () => {
      await destroySession(sid);
      res.clearCookie(COOKIE_NAME, { path: '/' });
      req.session = null;
      req.sid = null;
    };
    next();
  };
}

module.exports = {
  COOKIE_NAME,
  sessionMiddleware,
  createSession,
  destroySession,
};
