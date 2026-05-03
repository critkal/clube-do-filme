import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import StarRating from '../components/StarRating.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

export default function Vote() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.movie(id).then((m) => {
      setMovie(m);
      setScore(m.your_score || 0);
      setComment(m.your_comment || '');
    }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!movie) return <p className="loading">Carregando…</p>;

  const isPresenter = movie.presenter_id === me.id;
  if (isPresenter) {
    return (
      <div className="stack">
        <Link to={`/movies/${id}`} className="back-link">← {movie.title}</Link>
        <div className="card">
          <p className="muted">Você apresentou este filme — não pode avaliá-lo.</p>
        </div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!score) return;
    setSaving(true);
    try {
      await api.rate(movie.id, score, comment.trim() || null);
      navigate(`/movies/${id}`);
    } catch (error) {
      setErr(error.message);
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <Link to={`/movies/${id}`} className="back-link">← {movie.title}</Link>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          {movie.poster_url && (
            <div style={{ flexShrink: 0 }}>
              <MoviePoster src={movie.poster_url} alt={movie.title} size="sm" />
            </div>
          )}
          <div>
            <h2 style={{ margin: '0 0 0.2rem' }}>{movie.title}</h2>
            {movie.year && (
              <span className="muted" style={{ fontSize: '0.9rem' }}>({movie.year})</span>
            )}
            <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
              Apresentado por{' '}
              <strong style={{ color: 'var(--text)' }}>{movie.presenter_name}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="stack" style={{ gap: '1.25rem' }}>
          <div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              margin: '0 0 0.6rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Sua nota (1–10)
            </p>
            <StarRating value={score} onChange={setScore} />
            {score > 0 && (
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                Nota selecionada: <strong style={{ color: 'var(--amber)' }}>{score}/10</strong>
              </p>
            )}
          </div>

          <div>
            <label style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.5rem',
            }}>
              Comentário para o anfitrião (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe uma observação privada para o anfitrião da temporada…"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.875rem' }}
            />
            <p className="muted" style={{ margin: '0.3rem 0 0', fontSize: '0.75rem' }}>
              Visível apenas ao anfitrião da temporada.
            </p>
          </div>

          {err && <p className="error">{err}</p>}

          <button type="submit" disabled={!score || saving} className="btn primary">
            {saving ? 'Salvando…' : movie.your_score ? 'Atualizar avaliação' : 'Confirmar avaliação'}
          </button>
        </form>
      </div>
    </div>
  );
}
