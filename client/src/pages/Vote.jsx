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
  const [allCats, setAllCats] = useState([]);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState(new Set());
  const [newCatName, setNewCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([api.movie(id), api.categories()]).then(([m, cats]) => {
      setMovie(m);
      setAllCats(cats);
      setScore(m.your_score || 0);
      setComment(m.your_comment || '');
      setSelectedCatIds(
        new Set(m.referrals.filter((r) => r.you_referred).map((r) => r.category_id)),
      );
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

  // Referral counts by category id (from movie.referrals, includes categories with referrals)
  const refCountById = Object.fromEntries(
    movie.referrals.map((r) => [r.category_id, r.count]),
  );

  function toggleCat(catId) {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  async function addNewCategory(e) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    const existing = allCats.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSelectedCatIds((prev) => new Set([...prev, existing.id]));
      setNewCatName('');
      return;
    }
    try {
      const c = await api.createCategory(name);
      setAllCats((prev) => [...prev, { id: c.id, name }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCatIds((prev) => new Set([...prev, c.id]));
      setNewCatName('');
    } catch (error) {
      if (error.message === 'category_exists') {
        const fresh = await api.categories();
        const found = fresh.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (found) {
          setAllCats(fresh);
          setSelectedCatIds((prev) => new Set([...prev, found.id]));
          setNewCatName('');
        }
      } else {
        setErr(error.message);
      }
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!score) return;
    setSaving(true);
    try {
      await api.rate(movie.id, score, comment.trim() || null);

      // Sync referrals: add newly selected, remove deselected
      const currentlyReferred = new Set(
        movie.referrals.filter((r) => r.you_referred).map((r) => r.category_id),
      );
      const toAdd = [...selectedCatIds].filter((catId) => !currentlyReferred.has(catId));
      const toRemove = [...currentlyReferred].filter((catId) => !selectedCatIds.has(catId));
      await Promise.all([
        ...toAdd.map((catId) => api.addReferral(movie.id, { category_id: catId })),
        ...toRemove.map((catId) => api.removeReferral(movie.id, catId)),
      ]);

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

        <form onSubmit={submit} className="stack" style={{ gap: '1.5rem' }}>

          {/* Rating */}
          <div>
            <p className="form-label">Sua nota (1–10)</p>
            <StarRating value={score} onChange={setScore} />
            {score > 0 && (
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                Nota selecionada:{' '}
                <strong style={{ color: 'var(--amber)' }}>{score}/10</strong>
              </p>
            )}
          </div>

          {/* Category referrals */}
          <div>
            <p className="form-label">Indicar em categorias</p>
            <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Selecione as categorias em que este filme deve concorrer. Ao final da temporada, os filmes com mais indicações participam da votação final.
            </p>

            {allCats.length > 0 && (
              <div className="cat-checklist">
                {allCats.map((c) => {
                  const checked = selectedCatIds.has(c.id);
                  const count = refCountById[c.id] ?? 0;
                  return (
                    <label key={c.id} className={`cat-check-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(c.id)}
                      />
                      <span className="cat-check-name">{c.name}</span>
                      {count > 0 && (
                        <span className="cat-check-count">
                          {count} {count === 1 ? 'indicação' : 'indicações'}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <form onSubmit={addNewCategory} className="row gap" style={{ marginTop: '0.65rem' }}>
              <input
                placeholder="Nova categoria…"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={!newCatName.trim()} style={{ flexShrink: 0, fontSize: '0.85rem' }}>
                Adicionar
              </button>
            </form>
          </div>

          {/* Comment */}
          <div>
            <label className="form-label" style={{ display: 'block' }}>
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
