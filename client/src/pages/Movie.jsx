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
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState('');
  const [newRefCat, setNewRefCat] = useState('');
  const [linkRefCat, setLinkRefCat] = useState('');
  const [removingRefCatId, setRemovingRefCatId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
  const isHost = movie.season_host_id != null && movie.season_host_id === me.id;

  // Categories the current user hasn't yet referred this movie to
  const unReferredCats = cats.filter(
    (c) => !movie.referrals.some((r) => r.category_id === c.id && r.you_referred),
  );

  async function handleAddReferral(catId) {
    try {
      await api.addReferral(movie.id, { category_id: catId });
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function handleRemoveReferral(catId) {
    setRemovingRefCatId(catId);
    try {
      await api.removeReferral(movie.id, catId);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setRemovingRefCatId(null);
    }
  }

  async function handleNominateExisting(e) {
    e.preventDefault();
    if (!linkRefCat) return;
    try {
      await api.addReferral(movie.id, { category_id: Number(linkRefCat) });
      setLinkRefCat('');
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function handleCreateAndRefer(e) {
    e.preventDefault();
    if (!newRefCat.trim()) return;
    try {
      await api.addReferral(movie.id, { category_name: newRefCat.trim() });
      setNewRefCat('');
      await load();
    } catch (e) { setErr(e.message); }
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
        {!isPresenter ? (
          <>
            {movie.your_score ? (
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.875rem' }}>
                Sua nota:{' '}
                <strong style={{ color: 'var(--amber)', fontSize: '1.1rem' }}>{movie.your_score}/10</strong>
              </p>
            ) : (
              <p className="muted" style={{ margin: '0 0 0.65rem', fontSize: '0.875rem' }}>
                Você ainda não avaliou este filme.
              </p>
            )}
            <Link
              to={`/movies/${id}/vote`}
              className="btn"
              style={{ fontSize: '0.85rem', display: 'inline-block' }}
            >
              {movie.your_score ? 'Editar avaliação' : 'Avaliar'}
            </Link>

            {/* Host-only: vote comments from members */}
            {isHost && movie.vote_comments && movie.vote_comments.length > 0 && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <p style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  letterSpacing: '0.05em',
                  margin: '0 0 0.75rem',
                  fontWeight: 600,
                }}>
                  Comentários dos membros
                </p>
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
          </>
        ) : (
          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            Você apresentou este filme — não pode avaliá-lo.
          </p>
        )}
      </div>

      {/* Referrals / Indicações */}
      <div className="card">
        <h3 style={{ marginBottom: '0.65rem' }}>Indicações</h3>
        <p className="muted" style={{ fontSize: '0.8rem', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
          Indique este filme para uma categoria. Ao final da temporada, os filmes com mais indicações concorrem na votação final.
        </p>

        {movie.referrals.length > 0 && (
          <ul className="tags" style={{ marginBottom: '0.85rem' }}>
            {movie.referrals.map((r) => (
              <li key={r.category_id} className="tag referral-tag">
                <span className="referral-tag-name">{r.category_name}</span>
                <span className="referral-tag-count">
                  {r.count} {r.count === 1 ? 'indicação' : 'indicações'}
                </span>
                {r.you_referred ? (
                  <button
                    className="link-inline"
                    onClick={() => handleRemoveReferral(r.category_id)}
                    disabled={removingRefCatId === r.category_id}
                    title="remover minha indicação"
                    aria-label="remover indicação"
                    style={{ color: 'var(--amber)' }}
                  >
                    {removingRefCatId === r.category_id ? '…' : '✓ indicado ×'}
                  </button>
                ) : (
                  <button
                    className="link-inline"
                    onClick={() => handleAddReferral(r.category_id)}
                    title="indicar"
                    style={{ color: 'var(--muted)', fontSize: '0.8rem' }}
                  >
                    + indicar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {movie.referrals.length === 0 && (
          <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.85rem' }}>
            Nenhuma indicação ainda. Seja o primeiro!
          </p>
        )}

        <div className="stack" style={{ gap: '0.6rem' }}>
          <form onSubmit={handleNominateExisting} className="row gap">
            <select
              value={linkRefCat}
              onChange={(e) => setLinkRefCat(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">— indicar em categoria existente —</option>
              {unReferredCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" disabled={!linkRefCat} style={{ flexShrink: 0, fontSize: '0.85rem' }}>
              Indicar
            </button>
          </form>

          <form onSubmit={handleCreateAndRefer} className="row gap">
            <input
              placeholder="Nova categoria…"
              value={newRefCat}
              onChange={(e) => setNewRefCat(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <button type="submit" disabled={!newRefCat.trim()} style={{ flexShrink: 0, fontSize: '0.85rem' }}>
              Criar e indicar
            </button>
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
