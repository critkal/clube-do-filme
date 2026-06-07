# Frontend Architecture — Clube do Filme

> **Audience:** AI agents and developers working in `client/`.
> **Purpose:** Describe how the SPA is built *today* and the conventions you must follow so the codebase stays consistent. Match the patterns here; do not introduce new tooling or layers without a strong reason.

---

## 1. Stack & Philosophy

| Concern | Choice |
|---|---|
| Framework | React 18 (function components + hooks only) |
| Build | Vite |
| Language | Plain JavaScript + JSX (**no** TypeScript) |
| Routing | React Router v6 (`BrowserRouter`) |
| Styling | One global `styles.css` (vanilla CSS, semantic class names) |
| State | Local component state + one React Context for auth |
| Data fetching | `fetch`, centralized in `api.js` |
| Hosting | GitHub Pages (static) under base path `/clube-do-filme/` |

**Guiding principle: a small, flat, dependency-light SPA.** No Redux/Zustand, no React Query, no CSS-in-JS, no component library. Pages own their own data and state. Don't add a state-management or data-fetching library — the app is small enough that `useState` + `useEffect` + `api.js` is the intended pattern. UI text is in **Portuguese**; keep it that way.

---

## 2. Directory Layout

```
client/src/
├── main.jsx              # Entry: ReactDOM root, BrowserRouter (basename = BASE_URL), imports styles.css
├── App.jsx               # Route table, AuthCtx provider + useAuth(), <Protected> guard
├── api.js                # THE single API client — every backend call lives here
├── styles.css            # All styles, global, one file
├── pages/                # One component per route (Login, Home, Season, Movie, Vote, FinalVoting, Results, Admin)
└── components/           # Small shared, reusable UI pieces (Nav, MoviePoster, StarRating)
```

### pages vs components

- **`pages/`** = a screen mapped to a route in `App.jsx`. Owns data loading and page-level state. May define small private subcomponents (e.g. `AddMovieForm` inside `Season.jsx`) in the same file when they're only used there.
- **`components/`** = presentational, reusable, route-agnostic. Driven by props, minimal internal state (e.g. `StarRating` tracks only hover). If a piece is used by 2+ pages, promote it here.

---

## 3. Routing

Defined declaratively in [src/App.jsx](src/App.jsx) with a flat `<Routes>` table. Conventions:

- Wrap protected screens in `<Protected me={me}>...</Protected>`; add the `admin` prop for admin-only screens. Unauthenticated users redirect to `/login`; non-admins hitting an admin route get an inline "access restricted" message.
- `/login` redirects to `/` when already authenticated.
- A `*` route renders `NotFound`.
- **Base path:** GitHub Pages serves under `/clube-do-filme/`. `vite.config.js` sets `base` for production builds and `main.jsx` passes `basename={import.meta.env.BASE_URL}` to the router. Always use React Router `<Link>`/`navigate(...)` with app-relative paths — never hardcode the `/clube-do-filme/` prefix.

To add a screen: create `pages/Foo.jsx`, add a `<Route>` (wrapped in `<Protected>` as needed), and link to it with `<Link>`.

---

## 4. The API Layer — `api.js` (non-negotiable)

**Every** network request goes through the `api` object in [src/api.js](src/api.js). Components must **never** call `fetch` directly.

- A private `request(path, opts)` helper handles: base URL resolution, `credentials: 'include'`, JSON vs `FormData` bodies, attaching the `Bearer` token from `localStorage`, parsing, and error normalization.
- On a non-2xx response it throws an `Error` whose `.message` is the backend's `error` code, with `.status` and `.details` attached. Components catch this and show `e.message`.
- Auth token: stored in `localStorage` under `cdf_token`; `login()` saves it, `logout()` clears it. This is the Bearer fallback for browsers that drop the cookie (Safari/iOS).
- Base URL: `VITE_API_URL`, else `localhost:4000` in dev / the Render URL in prod.

**To add an endpoint:** add one named function to the `api` object, grouped under the existing section comment (`// auth`, `// seasons`, `// movies`, `// categories`, `// admin`). Keep them thin — just shape the path/body and delegate to `request`. File uploads pass `FormData` with `{ isForm: true }`.

```js
// in api.js
fooBar: (id, data) => request(`/api/foo/${id}`, { method: 'POST', body: data }),
```

---

## 5. Data Fetching & State Patterns

The repeating pattern across pages — **follow it** rather than inventing alternatives:

```js
export default function Season() {
  const { id } = useParams();
  const { me } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.seasons(), api.seasonMovies(id)]);
      setData({ a, b });
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!data) return <p className="loading">Carregando…</p>;
  // ...render
}
```

Conventions:
- **Load in `useEffect`**, keyed on the relevant route param. Use `Promise.all` for parallel independent calls.
- Keep a `load()` function in scope and **re-call it after mutations** (`onDone={() => { setShowForm(false); load(); }}`) — we re-fetch rather than optimistically mutating local state.
- **Error state:** a string set from `e.message`, rendered as `<p className="error">`.
- **Loading state:** render `<p className="loading">Carregando…</p>` (or check for null data) until loaded.
- Keep state **local** to the page. Don't lift state into context or a store unless it's genuinely app-wide (right now only auth qualifies).

---

## 6. Auth Context

[src/App.jsx](src/App.jsx) defines `AuthCtx` and exports `useAuth()`. The provider value is `{ me, setMe, refreshMe, logout }`:

- `me` is the current member (`{ id, first_name, is_admin, ... }`) or `null`. On mount, `App` calls `api.me()` and shows a global "Carregando…" until resolved.
- Gate **UI** with `me.is_admin` (e.g. show admin buttons). Remember this is convenience only — the backend enforces real authorization.
- After login set `me`; `logout()` calls `api.logout()` and clears `me`.

Access auth with `const { me } = useAuth();` — don't thread member data through props from the top.

---

## 7. Styling

- **One file:** `src/styles.css`, global, vanilla CSS with semantic class names: `container`, `stack`, `row gap`, `btn` / `btn primary`, `link`, `card`, `muted`, `error`, `loading`, `status-pill`, `rating-picker`, etc.
- **Reuse existing classes first.** Read `styles.css` and use what's there before adding new rules. New classes should follow the same lowercase-hyphenated, semantic naming.
- Inline `style={{ ... }}` is used for one-off layout (flex alignment, spacing) and is acceptable for small page-specific tweaks — but recurring visual treatments belong in a class in `styles.css`.
- No CSS modules, no Tailwind, no styled-components.

---

## 8. Component Conventions

- Function components with hooks; default-export one component per file (private subcomponents may follow in the same file).
- Props over context for reusable components. Keep them controlled (`value` + `onChange`) like `StarRating`.
- Use optional chaining for callbacks (`onChange?.(n)`) so components are safe when a handler is omitted.
- Include basic accessibility attributes where natural (`role`, `aria-label`), matching `StarRating`/`Nav`.
- **Ratings are 1–10** (not 1–5) — see `StarRating`. Keep client validation in sync with the backend constraint.

---

## 9. Configuration & Build

- **Env vars** are build-time, prefixed `VITE_`. Used: `VITE_API_URL` (backend base), `VITE_BASE` (optional base-path override). See `.env.example` / `.env.production`.
- **Dev:** `npm run dev` → Vite on `:5173`, base `/`. **Build:** base becomes `/clube-do-filme/`.
- **Deploy:** GitHub Pages via `gh-pages`. `public/404.html` exists to support SPA client-side routing on Pages (deep links). Don't remove it.

---

## 10. Checklist for Adding a Feature

1. Need data? Add/confirm the function in `api.js` (correct section, thin wrapper around `request`).
2. New screen? Create `pages/Foo.jsx`, add a `<Route>` in `App.jsx` wrapped in `<Protected>` as needed.
3. Follow the load/err/loading state pattern; re-call `load()` after mutations.
4. Render errors as the backend `error` code via `e.message`; UI copy in Portuguese.
5. Gate admin-only UI on `me.is_admin` (defense-in-depth only — backend is the real gate).
6. Reuse `styles.css` classes; add new semantic classes there rather than scattering styles.
7. Use app-relative paths with `<Link>`/`navigate` — never hardcode the Pages base path.
8. Shared, reusable UI → `components/`; screen-specific bits stay in the page file.
