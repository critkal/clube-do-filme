const path = require('path');
const envFile = process.argv.includes('--local') ? '.env.local' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '..', envFile) });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { initSchema } = require('./db');
const { sessionMiddleware } = require('./session');
const { attachMember } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const seasonRoutes = require('./routes/seasons');
const { moviesRouter, seasonScopedMoviesRouter } = require('./routes/movies');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const tmdbRoutes = require('./routes/tmdb');

const app = express();

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      return cb(new Error(`origin_not_allowed: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(sessionMiddleware());
app.use(attachMember);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Auth + member directory
app.use('/api', authRoutes);

// Feature routes
app.use('/api/seasons', seasonRoutes);
app.use('/api/seasons', seasonScopedMoviesRouter); // POST /api/seasons/:seasonId/movies
app.use('/api/movies', moviesRouter);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tmdb', tmdbRoutes);

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal_error', message: err.message });
});

const PORT = Number(process.env.PORT || 4000);

(async () => {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[startup] failed', err);
    process.exit(1);
  }
})();
