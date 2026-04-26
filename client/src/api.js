const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://clube-do-filme.onrender.com');

const TOKEN_KEY = 'cdf_token';
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => { if (t) localStorage.setItem(TOKEN_KEY, t); };
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (isForm) {
    opts.body = body;
  }
  const res = await fetch(`${API_URL}${path}`, opts);
  const text = await res.text();
  const json = text ? safeJSON(text) : null;
  if (!res.ok) {
    const err = new Error(json?.error || `http_${res.status}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

function safeJSON(text) {
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  // auth
  members: () => request('/api/members'),
  login: async (first_name, password) => {
    const res = await request('/api/login', { method: 'POST', body: { first_name, ...(password ? { password } : {}) } });
    setToken(res?.token);
    return res;
  },
  logout: async () => {
    const res = await request('/api/logout', { method: 'POST' });
    clearToken();
    return res;
  },
  me: () => request('/api/me'),
  setAdminPassword: (id, password) => request(`/api/admin/members/${id}/password`, { method: 'PUT', body: { password } }),

  // seasons
  seasons: () => request('/api/seasons'),
  seasonMovies: (id) => request(`/api/seasons/${id}/movies`),
  addMovie: (seasonId, formData) =>
    request(`/api/seasons/${seasonId}/movies`, { method: 'POST', body: formData, isForm: true }),
  finalVoting: (seasonId) => request(`/api/seasons/${seasonId}/final-voting`),
  castFinalVote: (seasonId, category_id, movie_id) =>
    request(`/api/seasons/${seasonId}/final-votes`, {
      method: 'POST',
      body: { category_id, movie_id },
    }),
  results: (seasonId) => request(`/api/seasons/${seasonId}/results`),
  seasonMembers: (id) => request(`/api/seasons/${id}/members`),
  searchTMDB: (q) => request(`/api/tmdb/search?q=${encodeURIComponent(q)}`),
  tmdbMovie: (id) => request(`/api/tmdb/movie/${id}`),

  // movies
  movie: (id) => request(`/api/movies/${id}`),
  rate: (id, score) => request(`/api/movies/${id}/rate`, { method: 'POST', body: { score } }),
  updateMovie: (id, formData) =>
    request(`/api/movies/${id}`, { method: 'PUT', body: formData, isForm: true }),
  addMovieCategory: (movieId, categoryId) =>
    request(`/api/movies/${movieId}/categories`, {
      method: 'POST',
      body: { category_id: categoryId },
    }),
  removeMovieCategory: (movieId, catId) =>
    request(`/api/movies/${movieId}/categories/${catId}`, { method: 'DELETE' }),

  // categories
  categories: () => request('/api/categories'),
  createCategory: (name) => request('/api/categories', { method: 'POST', body: { name } }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  // admin
  createMember: (first_name, is_admin = false) =>
    request('/api/admin/members', { method: 'POST', body: { first_name, is_admin } }),
  updateMember: (id, data) => request(`/api/admin/members/${id}`, { method: 'PUT', body: data }),
  deleteMember: (id) => request(`/api/admin/members/${id}`, { method: 'DELETE' }),
  createSeason: (name) => request('/api/admin/seasons', { method: 'POST', body: { name } }),
  updateSeason: (id, data) => request(`/api/admin/seasons/${id}`, { method: 'PUT', body: data }),
  completeSeason: (id) => request(`/api/admin/seasons/${id}/complete`, { method: 'POST' }),
  deleteSeason: (id) => request(`/api/admin/seasons/${id}`, { method: 'DELETE' }),
  allMovies: () => request('/api/admin/movies'),
  deleteMovie: (id) => request(`/api/admin/movies/${id}`, { method: 'DELETE' }),
  updateCategory: (id, name) => request(`/api/admin/categories/${id}`, { method: 'PUT', body: { name } }),
  updateMemberOrder: (seasonId, order) =>
    request(`/api/admin/seasons/${seasonId}/member-order`, { method: 'PUT', body: { order } }),
};
