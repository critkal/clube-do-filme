import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

const STATUS = {
  active: { cls: 'active', label: 'em andamento' },
  completed: { cls: 'closed', label: 'em votação' },
  presented: { cls: 'presented', label: 'apresentada' },
};

const ADD_ERRORS = {
  presenter_already_added: 'Você já adicionou um filme nesta temporada.',
  season_full: 'Todas as rodadas desta temporada já têm filme.',
  season_not_active: 'Esta temporada não está mais aceitando filmes.',
  title_required: 'Informe o título do filme.',
  upload_failed: 'Não foi possível enviar o pôster. Tente outra imagem ou envie sem pôster.',
};

export default function Season() {
  const { id } = useParams();
  const { me } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [movies, setMovies] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const [all, ms, mems] = await Promise.all([
        api.seasons(), api.seasonMovies(id), api.seasonMembers(id),
      ]);
      setSeasons(all);
      setMovies(ms);
      setMembers(mems);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  const season = seasons.find((s) => String(s.id) === String(id));
  if (err) return <p className="error">Erro: {err}</p>;
  if (!season) return <p className="loading">Carregando…</p>;

  const myMovie = movies.find((m) => m.presenter_id === me.id);
  const isActive = season.status === 'active';
  const status = STATUS[season.status] || STATUS.completed;
  const progress = season.rounds > 0 ? Math.min(100, Math.round((movies.length / season.rounds) * 100)) : 0;
  const nextMember = members.find((m) => !m.hasPresented);
  const isMyTurn = nextMember?.memberId === me.id;
  const pendingCount = movies.filter((m) => m.presenter_id !== me.id && m.your_score == null).length;

  const sortedMovies = [...movies].sort((a, b) => {
    if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
    return b.round_number - a.round_number;
  });

  return (
    <div className="stack">
      <Link to="/seasons" className="back-link">← Temporadas</Link>

      <header className="season-head">
        <div className="season-card-title-row">
          <h1 className="season-head-title">{season.name || `Temporada #${season.id}`}</h1>
          <span className={`status-pill ${status.cls}`}>{status.label}</span>
        </div>
        <div
          className="season-progress-track"
          role="progressbar"
          aria-label="Filmes adicionados"
          aria-valuemin={0}
          aria-valuemax={season.rounds}
          aria-valuenow={movies.length}
        >
          <div className="season-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="season-progress-label">
          {movies.length} de {season.rounds} filmes
          {isActive && nextMember && !isMyTurn && <> · próximo: <strong>{nextMember.name}</strong></>}
        </p>
        {season.status === 'completed' && (
          <div className="season-head-actions">
            <Link to={`/seasons/${id}/final-voting`} className="btn primary">Votar agora</Link>
            <Link to={`/seasons/${id}/results`} className="btn">Resultados</Link>
          </div>
        )}
        {season.status === 'presented' && (
          <div className="season-head-actions">
            <Link to={`/seasons/${id}/results`} className="btn">Ver resultados</Link>
          </div>
        )}
      </header>

      {isActive && !myMovie && (
        showForm ? (
          <AddMovieForm
            seasonId={id}
            onCancel={() => setShowForm(false)}
            onDone={() => { setShowForm(false); load(); }}
          />
        ) : (
          <div className={`card season-cta ${isMyTurn ? 'featured' : ''}`}>
            <div className="season-cta-text">
              <strong>{isMyTurn ? 'É a sua vez de apresentar!' : 'Seu filme ainda não está na temporada'}</strong>
              <span className="muted">Busque pelo título ou cadastre manualmente.</span>
            </div>
            <button type="button" className="btn primary" onClick={() => setShowForm(true)}>
              + Adicionar meu filme
            </button>
          </div>
        )
      )}
      {isActive && myMovie && (
        <p className="muted season-own-note">
          Seu filme nesta temporada: <Link to={`/movies/${myMovie.id}`}>{myMovie.title}</Link>
        </p>
      )}

      {members.length > 0 && <CollapsibleQueue members={members} meId={me.id} />}

      <section className="stack" aria-labelledby="season-movies">
        <div className="section-header">
          <h2 id="season-movies">Filmes</h2>
          {pendingCount > 0 ? (
            <span className="post-pending-count">{pendingCount} para avaliar</span>
          ) : movies.length > 1 && (
            <span className="muted post-feed-hint">mais recentes primeiro</span>
          )}
        </div>
        {sortedMovies.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum filme adicionado ainda.</p>
            <p className="muted">Os filmes aparecem aqui conforme cada membro apresenta o seu.</p>
          </div>
        ) : (
          <ul className="post-feed">
            {sortedMovies.map((m) => (
              <li key={m.id}>
                <MoviePostCard m={m} isOwn={m.presenter_id === me.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function formatPostDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function MoviePostCard({ m, isOwn }) {
  return (
    <article className="card post-card">
      <Link to={`/movies/${m.id}`} className="post-card-link">
        <header className="post-header">
          <span className="avatar" aria-hidden="true">{initials(m.presenter_name)}</span>
          <div className="post-byline">
            <span className="post-author">
              <strong>{m.presenter_name}</strong> apresentou
            </span>
            <span className="post-meta">
              Rodada {m.round_number}
              {m.created_at && ` · ${formatPostDate(m.created_at)}`}
            </span>
          </div>
        </header>

        <div className="post-body">
          <MoviePoster src={m.poster_url} alt={m.title} size="sm" />
          <div className="post-movie-info">
            <h3>
              {m.title}
              {m.year && <span className="muted"> ({m.year})</span>}
            </h3>
            {m.director && (
              <p className="post-movie-credits muted">dir. {m.director}</p>
            )}
            <div className="post-rating">
              {isOwn ? (
                <span className="your-rating none">Seu filme</span>
              ) : m.your_score != null ? (
                <span className="your-rating">Sua nota <strong>★ {m.your_score}/10</strong></span>
              ) : (
                <span className="your-rating pending">Falta sua nota →</span>
              )}
              {m.rating_count > 0 && (
                <span className="muted post-avg">média ★ {m.average_rating.toFixed(1).replace('.', ',')} · {m.rating_count} {m.rating_count === 1 ? 'nota' : 'notas'}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function CollapsibleQueue({ members, meId }) {
  const [open, setOpen] = useState(false);
  const nextIndex = members.findIndex((m) => !m.hasPresented);
  const nextMember = nextIndex !== -1 ? members[nextIndex] : null;
  const doneCount = members.filter((m) => m.hasPresented).length;

  return (
    <section className="card queue">
      <button
        type="button"
        className="collapsible-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="season-queue-list"
      >
        <span className="queue-title">
          Fila de apresentações
          <span className="muted queue-count">{doneCount}/{members.length}</span>
        </span>
        <span className="queue-toggle-side">
          {!open && nextMember && (
            <span className="queue-next-hint">
              a seguir: <strong>{nextMember.memberId === meId ? 'você' : nextMember.name}</strong>
            </span>
          )}
          <span className={`queue-chevron ${open ? 'open' : ''}`} aria-hidden="true">▾</span>
        </span>
      </button>

      {open && (
        <ol className="queue-list" id="season-queue-list">
          {members.map((m, i) => (
            <li key={m.memberId} className={`queue-item ${m.hasPresented ? 'done' : ''}`}>
              <span className="queue-num">{m.roundOrder}.</span>
              <span className="queue-name">
                {m.name}
                {m.memberId === meId && <span className="muted"> (você)</span>}
                {m.hasPresented && m.movieTitle && (
                  <span className="muted queue-movie"> · {m.movieTitle}</span>
                )}
              </span>
              {i === nextIndex && <span className="queue-next">próximo</span>}
              {m.hasPresented && <span className="queue-check" aria-label="já apresentou">✓</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AddMovieForm({ seasonId, onDone, onCancel }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchUnavailable, setSearchUnavailable] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selected, setSelected] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [manual, setManual] = useState(false);

  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [director, setDirector] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('');
  const [runtime, setRuntime] = useState('');
  const [customPoster, setCustomPoster] = useState(null);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (manual || !query || query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchTMDB(query);
        setSuggestions(res);
        setSearchUnavailable(false);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setSearchUnavailable(true);
      } finally {
        setSearchedQuery(query);
        setSearching(false);
      }
    }, 420);
    return () => clearTimeout(t);
  }, [query, manual]);

  async function pickSuggestion(s) {
    setShowSuggestions(false);
    setLoadingDetails(true);
    try {
      const details = await api.tmdbMovie(s.tmdb_id);
      setSelected(details);
      setTitle(details.title || '');
      setYear(details.year ? String(details.year) : '');
      setDirector(details.director || '');
      setSynopsis(details.synopsis || '');
      setGenre(details.genre || '');
      setRuntime(details.runtime ? String(details.runtime) : '');
    } catch {
      setManual(true);
      setTitle(s.title);
      setYear(s.year ? String(s.year) : '');
    } finally {
      setLoadingDetails(false);
    }
  }

  function goManual() {
    setManual(true);
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
    if (!title && query) setTitle(query);
  }

  function reset() {
    setManual(false);
    setSelected(null);
    setQuery('');
    setSearchedQuery('');
    setSuggestions([]);
    setTitle(''); setYear(''); setDirector('');
    setSynopsis(''); setGenre(''); setRuntime('');
    setCustomPoster(null);
    setErr('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function focusSuggestion(delta) {
    const buttons = [...(listRef.current?.querySelectorAll('button') || [])];
    if (!buttons.length) return;
    const i = buttons.indexOf(document.activeElement);
    const next = i === -1 ? (delta > 0 ? 0 : buttons.length - 1) : i + delta;
    if (next < 0) searchRef.current?.focus();
    else buttons[Math.min(next, buttons.length - 1)].focus();
  }

  function onSearchKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showSuggestions) return;
      e.preventDefault();
      focusSuggestion(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape' && showSuggestions) {
      e.preventDefault();
      setShowSuggestions(false);
      searchRef.current?.focus();
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (year) fd.append('year', year);
      if (director) fd.append('director', director);
      if (synopsis) fd.append('synopsis', synopsis);
      if (genre) fd.append('genre', genre);
      if (runtime) fd.append('runtime', runtime);
      if (selected?.tmdb_id) fd.append('tmdb_id', selected.tmdb_id);
      if (selected?.poster_url && !customPoster) fd.append('tmdb_poster_url', selected.poster_url);
      if (customPoster) fd.append('poster', customPoster);
      await api.addMovie(seasonId, fd);
      onDone?.();
    } catch (e2) {
      setErr(ADD_ERRORS[e2.message] || `Não foi possível adicionar o filme (${e2.message}).`);
    } finally {
      setBusy(false);
    }
  }

  const hasSelection = Boolean(selected);
  const showForm = hasSelection || manual;
  const noResults = !searching && !searchUnavailable && query.length >= 2
    && searchedQuery === query && suggestions.length === 0;

  return (
    <section className="card stack add-movie" aria-labelledby="add-movie-title">
      <div className="add-movie-head">
        <h2 id="add-movie-title">Adicionar meu filme</h2>
        {!showForm && <button type="button" className="link-btn" onClick={onCancel}>Cancelar</button>}
      </div>

      {!showForm && (
        <div
          className="tmdb-search"
          onKeyDown={onSearchKeyDown}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setShowSuggestions(false);
          }}
        >
          <label htmlFor="tmdb-search-input">Buscar filme</label>
          <div className="tmdb-search-field">
            <input
              id="tmdb-search-input"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o título…"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="tmdb-suggestions"
              onFocus={() => suggestions.length && setShowSuggestions(true)}
            />
            {searching && <span className="tmdb-searching" aria-hidden="true">buscando…</span>}

            {showSuggestions && suggestions.length > 0 && (
              <ul className="tmdb-suggestions" id="tmdb-suggestions" ref={listRef}>
                {suggestions.map((s) => (
                  <li key={s.tmdb_id}>
                    <button
                      type="button"
                      className="tmdb-suggestion-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                    >
                      {s.poster_thumb
                        ? <img src={s.poster_thumb} alt="" className="tmdb-thumb" />
                        : <span className="tmdb-thumb tmdb-thumb-placeholder" aria-hidden="true">🎬</span>
                      }
                      <span className="tmdb-suggestion-info">
                        <span className="tmdb-suggestion-title">{s.title}</span>
                        {s.year && <span className="tmdb-suggestion-year">{s.year}</span>}
                      </span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="tmdb-manual-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={goManual}
                  >
                    Não encontrei meu filme — cadastrar manualmente
                  </button>
                </li>
              </ul>
            )}
          </div>

          <p className="tmdb-status" role="status">
            {loadingDetails && 'Carregando detalhes do filme…'}
            {!loadingDetails && searchUnavailable && 'A busca está indisponível no momento.'}
            {!loadingDetails && noResults && `Nenhum resultado para “${query}”.`}
            {!loadingDetails && showSuggestions && suggestions.length > 0
              && `${suggestions.length} ${suggestions.length === 1 ? 'resultado' : 'resultados'}`}
          </p>

          {!loadingDetails && (
            <button type="button" className="link-btn tmdb-manual-link" onClick={goManual}>
              {searchUnavailable || noResults ? 'Cadastrar manualmente' : 'Prefiro cadastrar manualmente'}
            </button>
          )}
        </div>
      )}

      {hasSelection && (
        <div className="tmdb-selected">
          {selected.poster_thumb && (
            <img src={selected.poster_thumb} alt="" className="tmdb-selected-poster" />
          )}
          <div className="tmdb-selected-info">
            <p className="tmdb-selected-title">{selected.title}</p>
            <p className="muted tmdb-selected-meta">
              {[selected.year, selected.director, selected.runtime && `${selected.runtime} min`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" className="link-btn" onClick={reset}>Trocar</button>
        </div>
      )}
      {manual && (
        <div className="tmdb-manual-bar">
          <span className="muted">Cadastro manual</span>
          <button type="button" className="link-btn" onClick={reset}>← Buscar no TMDB</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="stack add-movie-form">
          {hasSelection && (
            <p className="muted add-movie-hint">Confira os dados abaixo — você pode ajustar antes de enviar.</p>
          )}
          <label>Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus={manual} />
          </label>
          <div className="row gap">
            <label style={{ flex: 1 }}>Ano
              <input type="number" inputMode="numeric" min="1880" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>Duração (min)
              <input type="number" inputMode="numeric" min="1" value={runtime} onChange={(e) => setRuntime(e.target.value)} />
            </label>
          </div>
          <label>Diretor
            <input value={director} onChange={(e) => setDirector(e.target.value)} />
          </label>
          <label>Gênero
            <input value={genre} onChange={(e) => setGenre(e.target.value)} />
          </label>
          {manual && (
            <label>Sinopse
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </label>
          )}
          <label>{hasSelection && selected.poster_url ? 'Trocar pôster (opcional)' : 'Pôster (opcional)'}
            <input type="file" accept="image/*" onChange={(e) => setCustomPoster(e.target.files?.[0] || null)} />
          </label>
          {err && <p className="error" role="alert">{err}</p>}
          <div className="add-movie-actions">
            <button type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
            <button type="submit" className="primary" disabled={busy || !title.trim()}>
              {busy ? 'Enviando…' : 'Adicionar filme'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
