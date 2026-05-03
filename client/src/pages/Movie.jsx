import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

export default function Movie() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setMovie(await api.movie(id));
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!movie) return <p className="loading">Carregando…</p>;

  const isPresenter = movie.presenter_id === me.id;
  const isHost = movie.season_host_id != null && movie.season_host_id === me.id;

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

  return (
    <div className="stack">
      <Link to={`/seasons/${movie.season_id}`} className="back-link">← Temporada</Link>

      {/* Cinematic hero */}
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
                <span style={{ fontSize: '0.85rem', color: 'var(--amber)', opacity: 0.65 }}>/10</span>
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

            {/* Vote button inside the hero */}
            {!isPresenter && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/movies/${id}/vote`}
                  className="btn"
                  style={{ fontSize: '0.85rem' }}
                >
                  {movie.your_score ? 'Editar avaliação' : 'Avaliar'}
                </Link>
                {movie.your_score && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Sua nota: <strong style={{ color: 'var(--amber)' }}>{movie.your_score}/10</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {movie.synopsis && (
        <div className="card" style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--muted)' }}>
          {movie.synopsis}
        </div>
      )}

      {/* Host-only: vote comments from members */}
      {isHost && movie.vote_comments && movie.vote_comments.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Comentários dos membros</h3>
          {movie.vote_comments.map((vc, i) => (
            <div key={i} style={{ marginBottom: '0.85rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                {vc.voter_name} — {vc.score}/10
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.55 }}>{vc.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral counts — read-only; managed through the vote form */}
      {movie.referrals.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.65rem' }}>Indicações</h3>
          <ul className="tags" style={{ margin: 0 }}>
            {movie.referrals.map((r) => (
              <li key={r.category_id} className="tag referral-tag">
                <span className="referral-tag-name">{r.category_name}</span>
                <span className="referral-tag-count">
                  {r.count} {r.count === 1 ? 'indicação' : 'indicações'}
                </span>
                {r.you_referred && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--amber)' }}>✓</span>
                )}
              </li>
            ))}
          </ul>
          {!isPresenter && (
            <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.8rem' }}>
              Gerencie suas indicações na{' '}
              <Link to={`/movies/${id}/vote`} style={{ color: 'var(--amber)' }}>
                página de avaliação
              </Link>.
            </p>
          )}
        </div>
      )}

      {me.is_admin && (
        <button className="btn danger" onClick={adminDelete} disabled={deleting}>
          {deleting ? 'Excluindo…' : 'Excluir filme'}
        </button>
      )}
    </div>
  );
}
