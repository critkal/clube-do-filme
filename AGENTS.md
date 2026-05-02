# AGENTS.md — AI Navigation Guide for Clube do Filme

## What This Project Is

**Clube do Filme** is a web app for managing a recurring movie club. Members take turns presenting a film each week; everyone rates them secretly, then at the end of a season votes for category-based awards (Best Film, Best Director, etc.). Ratings are hidden until the host decides to reveal them.

Monorepo with two independent workspaces: `client/` (React SPA) and `server/` (Express API).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite, vanilla CSS |
| Backend | Node.js, Express 4 |
| Database | Turso (SQLite-compatible edge DB via `@libsql/client`) |
| Auth | Session cookies + Bearer token (cookie name: `cdf_session`) |
| Images | Cloudinary (poster uploads) |
| Movie data | TMDB API (proxied through backend) |
| Deploy | GitHub Pages (frontend) + Render (backend) |

---

## Repository Layout

```
/
├── client/                  # React SPA
│   └── src/
│       ├── main.jsx         # Entry point, BrowserRouter
│       ├── App.jsx          # Route definitions, AuthContext, ProtectedRoute
│       ├── api.js           # ALL fetch calls go here — single API client
│       ├── styles.css       # Global styles (single file, ~20KB)
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Home.jsx         # Season listing
│       │   ├── Season.jsx       # Season detail + movie grid
│       │   ├── Movie.jsx        # Movie detail, ratings, categories
│       │   ├── FinalVoting.jsx  # Award voting UI
│       │   ├── Results.jsx      # Vote tallies + winners
│       │   └── Admin.jsx        # Admin panel (4 tabs: Members, Seasons, Movies, Categories)
│       └── components/
│           ├── Nav.jsx
│           ├── MoviePoster.jsx
│           └── StarRating.jsx
│
└── server/
    └── src/
        ├── index.js             # Express app, route registration
        ├── db.js                # Turso client + full DB schema
        ├── session.js           # Session creation/validation (cookie + Bearer)
        ├── cloudinary.js        # Upload/delete poster images
        ├── middleware/
        │   └── auth.js          # loadMember(), requireAuth(), requireAdmin()
        └── routes/
            ├── auth.js          # POST /login, /logout; GET /members, /me
            ├── seasons.js       # Season CRUD, member queue, final voting, results
            ├── movies.js        # Movie CRUD, ratings, category nomination
            ├── categories.js    # Category CRUD
            ├── admin.js         # Admin-only management endpoints
            └── tmdb.js          # Proxy: GET /tmdb/search, /tmdb/details/:id
```

---

## Database Schema (Turso/SQLite)

The full schema lives in [server/src/db.js](server/src/db.js). Tables:

- **members** — `id, first_name (UNIQUE), is_admin, password_hash`
- **sessions** — `sid (PK), sess (JSON), expired` — token-based sessions
- **seasons** — `id, name, rounds, status ('active'|'completed'|'presented'), host_id`
- **season_members** — `season_id, member_id, round_order` — shuffled presentation queue
- **movies** — `id, title, year, director, poster_url, poster_public_id, event_date, presenter_id, season_id, round_number, tmdb_id, synopsis, genre, runtime, created_at`
- **ratings** — `movie_id, member_id, score` — UNIQUE(movie_id, member_id)
- **categories** — `id, name (UNIQUE)`
- **movie_categories** — `movie_id, category_id` — nominations (composite PK)
- **final_votes** — `season_id, category_id, voter_id, movie_id` — UNIQUE(season_id, category_id, voter_id)

When editing schema, also update `initDb.js` (`scripts/`) which seeds the first admin.

---

## API Conventions

- Base URL: `http://localhost:4000` (dev), `VITE_API_URL` env var (prod)
- All routes require auth except `GET /` and `POST /login`
- Admin-only routes are guarded by `requireAdmin()` middleware
- Session: HTTP-only cookie (`cdf_session`) OR `Authorization: Bearer <sid>` header
- All API calls on the frontend go through [client/src/api.js](client/src/api.js) — add new calls there, not inline in components

**Key endpoints:**
```
POST   /login                        # { firstName, password? }
POST   /logout
GET    /me                           # Current user
GET    /members                      # All members (public)

GET    /seasons                      # All seasons
GET    /seasons/:id                  # Season detail + member queue
GET    /seasons/:id/movies           # Movies in season
POST   /seasons/:id/final-vote       # Cast award vote
GET    /seasons/:id/results          # Final vote tallies

GET    /movies/:id                   # Movie detail + ratings
POST   /movies                       # Add movie (admin)
PUT    /movies/:id                   # Edit movie (admin)
DELETE /movies/:id                   # Delete movie (admin)
POST   /movies/:id/rate              # Rate movie { score: 1-5 }
POST   /movies/:id/nominate          # Nominate in category

GET    /categories                   # All categories
POST   /categories                   # Create category
DELETE /categories/:id               # Delete (admin only)

GET    /tmdb/search?q=               # Search TMDB
GET    /tmdb/details/:tmdbId         # TMDB movie metadata

GET    /admin/members                # Admin member list
POST   /admin/members                # Create member
PUT    /admin/members/:id            # Update member
DELETE /admin/members/:id            # Delete member
POST   /admin/seasons                # Create season
PUT    /admin/seasons/:id            # Update season (status, host, etc.)
DELETE /admin/seasons/:id            # Delete season
PUT    /admin/movies/:id             # Edit any movie
DELETE /admin/movies/:id             # Delete any movie
```

---

## Domain Rules to Know

- **Ratings are secret.** A member's score for a movie is only visible to themselves. Aggregated averages are hidden until the season reaches `presented` status — unless you are the season's `host`, who can see averages anytime.
- **Season lifecycle:** `active` → `completed` (all rounds filled, triggers final voting) → `presented` (host reveals ratings).
- **One presenter per round.** `season_members.round_order` defines the shuffled queue; each round has exactly one presenter.
- **Presenters can't rate their own movie.** Enforced server-side.
- **One final vote per (season, category, voter).** Enforced by UNIQUE constraint and server-side.
- **Categories are global** (not per-season). Any member can create them; only admins can delete them.

---

## Auth System

Two member types:
- **Regular members** — login by first name only (no password)
- **Admin members** — `is_admin = true`, login requires first name + bcrypt password

Session middleware chain (per request):
1. `sessionMiddleware()` — validates `sid` from cookie or Bearer header, attaches `req.session`
2. `loadMember()` — attaches `req.member` from session
3. `requireAuth()` — rejects if no member
4. `requireAdmin()` — rejects if `!req.member.is_admin`

---

## Environment Variables

**Server** (see [server/.env.example](server/.env.example)):
```
PORT                      # default 4000
NODE_ENV
CLIENT_ORIGIN             # comma-separated CORS origins
SESSION_COOKIE_NAME       # default cdf_session
SESSION_TTL_DAYS          # default 30
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
TMDB_API_KEY              # optional
```

**Client** (see [client/.env.example](client/.env.example)):
```
VITE_API_URL              # backend base URL
```

---

## How to Run Locally

```bash
# From project root
npm run install-all   # install all deps
npm run dev           # starts server (4000) + client (5173) concurrently

# Or individually:
cd server && npm run dev
cd client && npm run dev

# First time only — creates schema and seeds first admin:
cd server && npm run init-db
```

---

## Frontend Patterns

- **AuthContext** (in `App.jsx`) — provides `{ member, setMember }` to all pages. Check `member.is_admin` to gate UI.
- **ProtectedRoute** — wraps all routes except `/login`; redirects unauthenticated users.
- **api.js** — all fetches live here as named async functions. When adding a new endpoint, add the corresponding function to `api.js` and import it where needed.
- **Routing:** React Router v6 with `<BrowserRouter>`. Deployed on GitHub Pages with base path `/clube-do-filme/`, so Vite is configured with `base: '/clube-do-filme/'`.

---

## Planned Features (not yet implemented)

From [STEPS.md](STEPS.md):
1. Google OAuth to replace first-name login
2. Base/seed categories (defaults for new seasons)
3. Attendance tracking per session
4. Next-session date voting
5. Pre-registered movies (next-round placeholders)
6. Host analytics dashboard
