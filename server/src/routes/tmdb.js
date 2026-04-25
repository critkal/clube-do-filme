const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG = (path, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

function key() {
  return process.env.TMDB_API_KEY || null;
}

// GET /api/tmdb/search?q=title  — returns up to 6 suggestions
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  if (!key()) return res.status(503).json({ error: 'tmdb_not_configured' });

  const url = `${TMDB_BASE}/search/movie?api_key=${key()}&query=${encodeURIComponent(q)}&language=pt-BR&page=1`;
  const r = await fetch(url);
  if (!r.ok) return res.status(502).json({ error: 'tmdb_error' });

  const data = await r.json();
  res.json(
    (data.results || []).slice(0, 6).map((m) => ({
      tmdb_id: m.id,
      title: m.title,
      year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
      poster_thumb: IMG(m.poster_path, 'w185'),
    })),
  );
});

// GET /api/tmdb/movie/:id  — full details including director and runtime
router.get('/movie/:id', requireAuth, async (req, res) => {
  if (!key()) return res.status(503).json({ error: 'tmdb_not_configured' });

  const url = `${TMDB_BASE}/movie/${req.params.id}?api_key=${key()}&language=pt-BR&append_to_response=credits`;
  const r = await fetch(url);
  if (!r.ok) return res.status(502).json({ error: 'tmdb_error' });

  const m = await r.json();
  const director = m.credits?.crew?.find((c) => c.job === 'Director')?.name || null;
  const genres = (m.genres || []).map((g) => g.name).join(', ') || null;

  res.json({
    tmdb_id: m.id,
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    director,
    synopsis: m.overview || null,
    genre: genres,
    runtime: m.runtime || null,
    poster_url: IMG(m.poster_path, 'w500'),
    poster_thumb: IMG(m.poster_path, 'w185'),
  });
});

module.exports = router;
