import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import StarRating from '../components/StarRating.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

export default function Movie() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState('');
  const [newCat, setNewCat] = useState('');
  const [linkCat, setLinkCat] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [removingCatId, setRemovingCatId] = useState(null);

  const load = async () => {
    try {
      const [m, c] = await Promise.all([api.movie(id), api.categories()]);
      setMovie(m);
      setCats(c);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!movie) return <p className="loading">Carregando…</p>;

  const isPresenter = movie.presenter_id === me.id;

  async function rate(score) {
    try {
      await api.rate(movie.id, score);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      const c = await api.createCategory(newCat.trim());
      await api.addMovieCategory(movie.id, c.id);
      setNewCat('');
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function nominate(e) {
    e.preventDefault();
    if (!linkCat) return;
    try {
      await api.addMovieCategory(movie.id, Number(linkCat));
      setLinkCat('');
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function removeCat(catId) {
    setRemovingCatId(catId);
    try {
      await api.removeMovieCategory(movie.id, catId);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setRemovingCatId(null);
    }
  }

  async function adminDelete() {
    if (!window.confirm(`Excluir "${movie.title}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteMovie(movie.id);
      navigate(`/seasons/${movie.season_id}`);
    } catch (e) {
      setErr(e.message);
      setDeleting(false);
    }
  }

  const unpicked = cats.filter((c) => !movie.categories.some((mc) => mc.id === c.id));

  return (
    <div className="stack">
      <Link to={`/seasons/${movie.season_id}`} className="back-link">← Temporada</Link>

      {/* Cinematic hero — poster + info integrated */}
      <div className="movie-hero card">
        {movie.poster_url && (
          <div
            className="movie-hero-bg"
            style={{ backgroundImage: `url(${movie.poster_url})` }}
          />
        )}
        <div className="movie-hero-content">
          <div className="movie-hero-poster">
            <MoviePoster src={movie.poster_url} alt={movie.title} size="lg" />
          </div>
          <div className="movie-hero-info">
            <h1 style={{ marginBottom: '0.25rem' }}>
              {movie.title}
              {movie.year && (
                <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}> ({movie.year})</span>
              )}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.75rem', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
              {movie.director && (
                <span><span className="muted">dir. </span><strong style={{ color: 'var(--text)', fontWeight: 600 }}>{movie.director}</strong></span>
              )}
              {movie.genre && <span className="muted">{movie.genre}</span>}
              {movie.runtime && <span className="muted">{movie.runtime} min</span>}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.7 }}>
              Apresentado por <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{movie.presenter_name}</strong>
              {' · '}Rodada {movie.round_number}
              {movie.event_date && ` · ${movie.event_date}`}
            </p>

            {movie.ratings_visible && movie.rating_count > 0 && (
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  lineHeight: 1,
                }}>
                  {movie.average_rating.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--amber)', opacity: 0.65 }}>/5</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  · {movie.rating_count} voto{movie.rating_count > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {!movie.ratings_visible && (
              <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                🔒 Notas reveladas na apresentação final
              </p>
            )}
          </div>
        </div>
      </div>

      {movie.synopsis && (
        <div className="card" style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--muted)' }}>
          {movie.synopsis}
        </div>
      )}

      {/* Rating */}
      <div className="card">
        <h3 style={{ marginBottom: '0.65rem' }}>Avaliação</h3>
        {movie.ratings_visible && movie.rating_count === 0 && (
          <p className="muted" style={{ margin: '0 0 0.65rem', fontSize: '0.875rem' }}>Ainda sem votos.</p>
        )}
        {!isPresenter ? (
          <>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 0.4rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {movie.your_score ? 'Sua nota' : 'Avaliar'}
            </p>
            <StarRating value={movie.your_score || 0} onChange={rate} />
          </>
        ) : (
          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            Você apresentou este filme — não pode se votar.
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="card">
        <h3 style={{ marginBottom: '0.65rem' }}>Categorias</h3>
        {movie.categories.length === 0 && (
          <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Nenhuma ainda.</p>
        )}
        {movie.categories.length > 0 && (
          <ul className="tags">
            {movie.categories.map((c) => (
              <li key={c.id} className="tag">
                {c.name}
                <button
                  className="link-inline"
                  onClick={() => removeCat(c.id)}
                  disabled={removingCatId === c.id}
                  title="remover"
                  aria-label="remover"
                >
                  {removingCatId === c.id ? '…' : '×'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="stack" style={{ gap: '0.6rem' }}>
          <form onSubmit={nominate} className="row gap">
            <select value={linkCat} onChange={(e) => setLinkCat(e.target.value)} style={{ fontSize: '0.85rem' }}>
              <option value="">— indicar em categoria existente —</option>
              {unpicked.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" disabled={!linkCat} style={{ flexShrink: 0, fontSize: '0.85rem' }}>Indicar</button>
          </form>

          <form onSubmit={createCategory} className="row gap">
            <input
              placeholder="Nova categoria…"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <button type="submit" disabled={!newCat.trim()} style={{ flexShrink: 0, fontSize: '0.85rem' }}>Criar</button>
          </form>
        </div>
      </div>

      {me.is_admin && (
        <button className="btn danger" onClick={adminDelete} disabled={deleting}>
          {deleting ? 'Excluindo…' : 'Excluir filme'}
        </button>
      )}
    </div>
  );
}
