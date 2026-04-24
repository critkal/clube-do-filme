# Clube do Filme

A simple webapp for a movie club where members present a film each week, rate it secretly, and at the end of a season vote for the best film in various categories.

## Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** Turso (edge SQLite)
- **Auth:** Session cookie + session table in Turso (login by first name)
- **Image upload:** Cloudinary
- **Hosting:** GitHub Pages (FE) + Render (BE)

## Repo layout

```
/
├── client/   # React app (Vite)
├── server/   # Express backend
├── .env.example
└── README.md
```

## Setup

### 1. Turso database

```bash
# Install the Turso CLI, then:
turso db create clube-do-filme
turso db show clube-do-filme --url
turso db tokens create clube-do-filme
```

Paste the URL and token into `server/.env`.

### 2. Cloudinary

Create a free account at cloudinary.com. Grab the cloud name, API key, and API secret. Paste into `server/.env`.

### 3. Install and run

```bash
# Backend
cd server
cp .env.example .env   # fill in values
npm install
npm run init-db        # creates tables + seeds first admin
npm run dev

# Frontend (new terminal)
cd client
cp .env.example .env   # usually fine as-is for local dev
npm install
npm run dev
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:5173`.

### 4. First admin

`npm run init-db` in `server/` will prompt you for the first admin's first name. That member is inserted with `is_admin = 1`.

## Deployment

- **Backend → Render:** connect the repo, set root directory to `server/`, build command `npm install`, start command `npm start`. Add env vars from `.env.example`. Set `CLIENT_ORIGIN` to your GitHub Pages URL.
- **Frontend → GitHub Pages:** `cd client && npm run build && npm run deploy` (uses `gh-pages`). Set `VITE_API_URL` in `client/.env.production` to the Render backend URL.

## Business rules

- All ratings and final votes are **secret** — only averages and counts are exposed.
- Any member can create categories and nominate movies.
- Only admins can delete movies, manage members, and create/close seasons.
- A season's length equals the number of members at season creation time; it auto-completes when all rounds are filled.
- Final votes are one-and-done per (season, category, voter).
