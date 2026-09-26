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
  const [addingCat, setAddingCat] = useState(false);
  const [catErr, setCatErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    Promise.all([api.movie(id), api.categories()]).then(([m, cats]) => {
      setMovie(m);
      setAllCats(cats);
      setScore(m.your_score || 0);
      setComment(m.your_comment || '');
      setSelectedCatIds(
        new Set(m.referrals.filter((r) => r.you_referred).map((r) => r.category_id)),
      );
    }).catch((e) => setLoadErr(e.message));
  }, [id]);

  if (loadErr) return <p className="error">Erro: {loadErr}</p>;
  if (!movie) return <p className="loading">Carregando…</p>;

  const isPresenter = movie.presenter_id === me.id;
  if (isPresenter) {
    return (
      <div className="stack">
        <Link to={`/movies/${id}`} className="back-link">← {movie.title}</Link>
        <div className="card vote-blocked">
          <p>Você apresentou este filme, então não pode avaliá-lo.</p>
          <Link to={`/movies/${id}`} className="btn">Voltar ao filme</Link>
        </div>
      </div>
    );
  }

  const refCountById = Object.fromEntries(
    movie.referrals.map((r) => [r.category_id, r.count]),
  );
  const alreadyRated = Boolean(movie.your_score);

  function toggleCat(catId) {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function selectCat(cat) {
    setSelectedCatIds((prev) => new Set([...prev, cat.id]));
    setNewCatName('');
  }

  async function addNewCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setCatErr('');
    const existing = allCats.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) { selectCat(existing); return; }
    setAddingCat(true);
    try {
      const c = await api.createCategory(name);
      setAllCats((prev) => [...prev, { id: c.id, name }].sort((a, b) => a.name.localeCompare(b.name)));
      selectCat({ id: c.id });
    } catch (error) {
      if (error.message === 'category_exists') {
        const fresh = await api.categories().catch(() => []);
        const found = fresh.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (found) {
          setAllCats(fresh);
          selectCat(found);
          return;
        }
      }
      setCatErr(`Não foi possível criar a categoria (${error.message}).`);
    } finally {
      setAddingCat(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!score) return;
    setSaving(true);
    setSaveErr('');
    try {
      await api.rate(movie.id, score, comment.trim() || null);

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
      setSaveErr(`Não foi possível salvar sua avaliação (${error.message}). Tente novamente.`);
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <Link to={`/movies/${id}`} className="back-link">← {movie.title}</Link>

      <div className="card">
        <div className="vote-movie">
          <MoviePoster src={movie.poster_url} alt={movie.title} size="sm" />
          <div className="vote-movie-info">
            <h1 className="vote-movie-title">
              {movie.title}
              {movie.year && <span className="muted"> ({movie.year})</span>}
            </h1>
            <p className="muted">
              Apresentado por <strong>{movie.presenter_name}</strong>
            </p>
            {alreadyRated && (
              <p className="vote-status">Você já avaliou — pode alterar abaixo.</p>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="stack vote-form">
          <fieldset className="vote-step">
            <legend className="vote-step-head">
              <span className="form-label">Sua nota</span>
              <span className={`vote-score ${score ? '' : 'empty'}`} aria-live="polite">
                {score ? <><strong>{score}</strong>/10</> : 'escolha de 1 a 10'}
              </span>
            </legend>
            <StarRating value={score} onChange={setScore} />
          </fieldset>

          <fieldset className="vote-step">
            <legend className="vote-step-head">
              <span className="form-label">Indicar em categorias</span>
              <span className="muted vote-step-aside">
                {selectedCatIds.size > 0 ? `${selectedCatIds.size} selecionada${selectedCatIds.size > 1 ? 's' : ''}` : 'opcional'}
              </span>
            </legend>
            <p className="muted vote-hint vote-hint-top">
              Os filmes mais indicados em cada categoria vão para a votação final da temporada.
            </p>

            {allCats.length > 0 ? (
              <div className="cat-checklist">
                {allCats.map((c) => {
                  const checked = selectedCatIds.has(c.id);
                  const count = refCountById[c.id] ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat-chip ${checked ? 'checked' : ''}`}
                      onClick={() => toggleCat(c.id)}
                      aria-pressed={checked}
                    >
                      <span className="cat-chip-mark" aria-hidden="true">{checked ? '✓' : '+'}</span>
                      {c.name}
                      {count > 0 && (
                        <span className="cat-chip-count">
                          {count} {count === 1 ? 'indicação' : 'indicações'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="muted vote-hint">Nenhuma categoria ainda — crie a primeira abaixo.</p>
            )}

            {/* Not a <form>: this lives inside the rating <form>, and nested forms are invalid HTML */}
            <div className="row gap cat-new">
              <input
                placeholder="Nova categoria…"
                aria-label="Nome da nova categoria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addNewCategory(); }
                }}
              />
              <button type="button" onClick={addNewCategory} disabled={!newCatName.trim() || addingCat}>
                {addingCat ? 'Criando…' : 'Criar'}
              </button>
            </div>
            {catErr && <p className="error" role="alert">{catErr}</p>}
          </fieldset>

          <div className="vote-step">
            <label htmlFor="vote-comment" className="vote-step-head">
              <span className="form-label">Comentário para o anfitrião</span>
              <span className="muted vote-step-aside">opcional</span>
            </label>
            <textarea
              id="vote-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Uma observação privada sobre o filme…"
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <p className="muted vote-hint">Visível apenas ao anfitrião da temporada.</p>
          </div>

          {saveErr && <p className="error" role="alert">{saveErr}</p>}

          <div className="vote-submit">
            <button type="submit" disabled={!score || saving} className="btn primary">
              {saving ? 'Salvando…' : alreadyRated ? 'Atualizar avaliação' : 'Confirmar avaliação'}
            </button>
            {!score && <p className="muted vote-hint">Escolha uma nota para confirmar.</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
