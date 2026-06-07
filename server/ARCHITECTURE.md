# Backend Architecture — Clube do Filme

> **Audience:** AI agents and developers working in `server/`.
> **Purpose:** Describe how the backend is built *today* and the conventions you must follow so the codebase stays consistent. When in doubt, match the patterns here — do not invent new structure without a strong reason.

---

## 1. Stack & Philosophy

| Concern | Choice |
|---|---|
| Runtime | Node.js (CommonJS — `require`/`module.exports`, **not** ESM) |
| Framework | Express 4 |
| Database | Turso / libSQL (`@libsql/client`), SQLite dialect |
| Auth | Opaque session token in a DB-backed `sessions` table; sent via HTTP-only cookie **or** `Authorization: Bearer` |
| File uploads | `multer` (memory storage) → Cloudinary |
| External data | TMDB API, proxied through the backend |

**Guiding principle: keep it boring and flat.** This is a small app for a movie club. We deliberately avoid ORMs, service/repository layers, DI containers, and TypeScript. Logic lives in route handlers with raw SQL. Do **not** introduce heavier abstractions unless a route file genuinely becomes unmanageable — and even then, prefer a small helper function over a new architectural layer.

---

## 2. Directory Layout

```
server/src/
├── index.js              # App composition root: middleware chain + route mounting + error handler + startup
├── db.js                 # libSQL client singleton, schema (CREATE TABLE), migrations, initSchema()
├── session.js            # Session token lifecycle + sessionMiddleware()
├── cloudinary.js         # uploadBuffer() / delete helpers
├── middleware/
│   └── auth.js           # attachMember, requireAuth, requireAdmin, loadMember
├── routes/               # One file per resource; each exports an express.Router()
│   ├── auth.js           # /api/login, /logout, /me, /members
│   ├── seasons.js        # season lifecycle, queue, final voting, results
│   ├── movies.js         # movie CRUD, ratings, referrals, categories on a movie
│   ├── categories.js     # global category CRUD
│   ├── admin.js          # admin-only management endpoints
│   └── tmdb.js           # TMDB proxy
└── scripts/              # One-off CLI scripts run via npm (init-db, seed, local setup)
```

### Where does new code go?

- **New endpoint on an existing resource** → add a handler to that resource's router file.
- **New resource** → create `routes/<resource>.js`, export a router, mount it in `index.js` under `/api/<resource>`.
- **Reusable cross-route logic** (auth, uploads, external APIs) → a top-level module like `cloudinary.js`, imported where needed.
- **Logic used by only one route file** → a local helper function at the top of that file (see `findOpenRoundNumber` / `maybeCloseSeason` in `movies.js`). Do not export it.

---

## 3. The Request Pipeline

Defined once in [src/index.js](src/index.js), applied globally in this order:

1. `cors(...)` — origin allow-list from `CLIENT_ORIGIN` (comma-separated), `credentials: true`.
2. `express.json({ limit: '1mb' })`
3. `cookieParser()`
4. `sessionMiddleware()` — resolves the session token (cookie first, then `Bearer`), attaches `req.session` (`{ memberId }` or `null`), `req.sid`, and helpers `res.setSession(memberId)` / `res.clearSessionCookie()`.
5. `attachMember` — loads the member row into `req.member` (or `null`) from `req.session.memberId`.

Then routes are mounted under `/api/*`. A final 4-arg error handler logs and returns `500 { error: 'internal_error' }`.

**Rule:** Every route is registered under the `/api` prefix. The cookie-vs-Bearer duality exists because Safari/iOS drops third-party cookies — never remove the Bearer fallback.

---

## 4. Routing & Handler Conventions

Follow these patterns exactly — they are consistent across the codebase today.

### 4.1 Router boilerplate
```js
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
// ... handlers ...
module.exports = router;
```
Mount-time path prefixes live in `index.js`; inside a router use paths relative to that mount (`router.get('/:id', ...)`).

### 4.2 Auth is per-route, via middleware
Every protected handler takes `requireAuth` (or `requireAdmin`) as its second argument. There is **no** global auth gate — auth is opt-in per route so public endpoints (`/login`, `/health`) just omit it.
```js
router.post('/:id/rate', requireAuth, async (req, res) => { ... });
router.delete('/:id', requireAdmin, async (req, res) => { ... });
```
Ownership checks that middleware can't express (e.g. "presenter or admin may edit") are done **inline** at the top of the handler:
```js
const allowed = req.member.is_admin || Number(row.presenter_id) === req.member.id;
if (!allowed) return res.status(403).json({ error: 'forbidden' });
```

### 4.3 Input handling
- Coerce and sanitize at the top of the handler before any DB work.
- Numbers: `Number(x)`; nullable strings: `(req.body.x || '').trim() || null`.
- Validate and **early-return** with a specific error code on bad input.
- Never trust `presenter_id`/admin-only fields from the body unless `req.member.is_admin`.

### 4.4 Response shape — explicit DTO mapping
Do **not** return raw DB rows. Map each row to an explicit object with the exact fields and types the client expects. This is where secrecy rules and number coercion are enforced.
```js
res.json(rows.map((r) => ({
  id: r.id,
  host_id: r.host_id ? Number(r.host_id) : null,
  is_host: r.host_id ? Number(r.host_id) === req.member.id : false,
})));
```
libSQL can return `BIGINT`/numeric columns in ways that need `Number(...)`; always coerce numeric fields in the response.

### 4.5 Error responses
Errors are JSON with a stable machine-readable `error` code (snake_case), optionally `message`. The frontend keys off `error`.
```js
return res.status(404).json({ error: 'not_found' });
return res.status(409).json({ error: 'presenter_already_added' });
```
Status codes in use: `400` validation, `401` not authenticated, `403` forbidden/admin_only, `404` not found, `409` conflict, `500` internal. **Reuse existing error codes** where one fits rather than inventing synonyms.

### 4.6 Async & errors
Handlers are `async`. Let unexpected throws bubble to the global error handler — only wrap in `try/catch` when you need to translate a specific failure (e.g. Cloudinary upload → `upload_failed`, or a UNIQUE violation into idempotent success). Don't add per-handler catch-alls that just `500`.

---

## 5. Data Access

### 5.1 One DB client, raw parameterized SQL
`db` is a singleton from `db.js`. There is no query builder. Every query uses the libSQL `execute` form with positional `?` args — **never** string-interpolate user input.
```js
const { rows } = await db.execute({
  sql: 'SELECT id FROM movies WHERE season_id = ? AND presenter_id = ?',
  args: [seasonId, presenterId],
});
```
For SQL with no args, the string-only form is fine: `await db.execute('SELECT ...')`.

### 5.2 Patterns to reuse
- **Upsert:** `INSERT ... ON CONFLICT(...) DO UPDATE SET col = excluded.col` (see ratings).
- **Idempotent insert:** `INSERT OR IGNORE`, or catch the `UNIQUE` error and treat as success (see referrals).
- **Derived/aggregate fields:** correlated subqueries in the SELECT (`(SELECT AVG(score) ...) AS average_rating`) rather than post-processing in JS.
- **Insert returning id:** `INSERT ... RETURNING id`, then `Number(result.rows[0].id)`.

### 5.3 No transactions today
Multi-step writes (e.g. add movie → maybe close season) run as sequential `execute` calls. This is an accepted limitation for current scale. If you add a workflow where partial failure would corrupt state, use libSQL `db.batch([...])` for atomicity rather than hoping the steps all succeed.

---

## 6. Schema & Migrations

All schema lives in [src/db.js](src/db.js):

- `SCHEMA_STATEMENTS` — idempotent `CREATE TABLE IF NOT EXISTS` for the canonical shape. New tables go here.
- `MIGRATIONS` — an **append-only** list of one-off `ALTER`/`DROP` statements, each wrapped so "already applied" failures are swallowed. To evolve an existing table, **append** an `ALTER TABLE ... ADD COLUMN` here; never edit a past migration and never reorder them.
- `migrateRatings()` — the pattern for a non-trivial migration (table rebuild with data copy) when `ALTER` isn't enough.
- `initSchema()` runs all of the above on startup and is also invoked by `scripts/initDb.js`.

**Migration rules for agents:**
1. Adding a column → append to `MIGRATIONS` **and** update the `CREATE TABLE` in `SCHEMA_STATEMENTS` so fresh installs match.
2. Never assume a destructive migration is safe — Turso holds real data.
3. Keep `scripts/initDb.js` (seeds the first admin) in sync with schema changes.

### Current tables
`members`, `sessions`, `seasons`, `season_members`, `movies`, `ratings`, `categories`, `movie_categories`, `referrals`, `final_votes`. See `db.js` for columns and constraints — it is the single source of truth (the root `AGENTS.md` table list may lag behind).

---

## 7. Auth & Sessions (details)

- **Members** have a `first_name` (unique) and optional `password_hash`. Regular members log in by name only; admins require a bcrypt password.
- **Session token** = 32 random bytes (hex) stored in `sessions(sid, sess, expired)`. `sess` is JSON `{ memberId }`. TTL from `SESSION_TTL_DAYS` (default 30).
- Resolution order: `cdf_session` cookie → `Authorization: Bearer <sid>`. Login returns the token in the body so the SPA can store it for the Bearer path.
- Cookie flags adapt to env: prod = `secure: true, sameSite: 'none'`; dev = `lax`.
- Use the four building blocks in `middleware/auth.js` — don't re-implement auth checks inline:
  - `attachMember` (global) → `requireAuth` → `requireAdmin`, plus `loadMember(id)` for lookups.

---

## 8. External Services

- **Cloudinary** (`cloudinary.js`): posters are uploaded via `uploadBuffer(req.file.buffer)`, which returns `{ url, public_id }`. Store **both** `poster_url` and `poster_public_id` so the image can be deleted later. Wrap upload calls in `try/catch` → `upload_failed`.
- **TMDB** (`routes/tmdb.js`): always proxied through the backend so the API key stays server-side. The client never calls TMDB directly. Endpoints: `/api/tmdb/search?q=`, `/api/tmdb/movie/:id`.

Keep all third-party API keys server-side, read from `process.env`, and never log them.

---

## 9. Configuration

Env is loaded in `index.js` before anything else: `.env.local` when run with `--local`, otherwise `.env`. Required/used vars (see `.env.example`): `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`, `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLOUDINARY_*`, `TMDB_API_KEY`.

`db.js` throws on startup if `TURSO_DATABASE_URL` is missing — fail fast is intentional; keep that pattern for any other hard-required config.

---

## 10. Domain Invariants (enforce server-side, always)

The client may hide things, but these must be guaranteed in the backend:

- **Ratings are secret.** Only expose a member's own `score`/`comment`. Aggregates (avg/count) are revealed only when `season.status === 'presented'` **or** the requester is the season `host`. Bake this into the DTO mapping, not just the query.
- **Presenters can't rate their own movie.** (`cannot_rate_own_movie`)
- **One movie per presenter per season.** (`presenter_already_added`)
- **Round slots:** a movie occupies the lowest open `round_number`; filling the last slot flips the season to `completed` (`maybeCloseSeason`).
- **One final vote per (season, category, voter).** Enforced by UNIQUE + server check.
- **Categories are global.** Anyone can create; only admins delete.

When adding features, ask "does this leak a secret rating or bypass an invariant?" before writing the query.

---

## 11. Checklist for Adding an Endpoint

1. Pick the right router file (or create one and mount it in `index.js`).
2. Add `requireAuth`/`requireAdmin` as appropriate; add inline ownership checks if needed.
3. Coerce + validate input; early-return specific `error` codes.
4. Parameterized SQL only.
5. Map rows to an explicit DTO, coercing numbers and enforcing secrecy rules.
6. If you touched the schema: update `SCHEMA_STATEMENTS`, append a `MIGRATION`, sync `initDb.js`.
7. Add the matching function to the client's `api.js` (see `client/ARCHITECTURE.md`).
8. Keep the root `AGENTS.md` endpoint list roughly in sync.
