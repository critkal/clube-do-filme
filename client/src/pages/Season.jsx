import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

export default function Season() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
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

  const presenterAlreadyAdded = movies.some((m) => m.presenter_id === me.id);
  const isActive = season.status === 'active';

  const sortedMovies = [...movies].sort((a, b) => {
    if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
    return b.round_number - a.round_number;
  });

  return (
    <div className="stack">
      <button type="button" className="link back-link" onClick={() => navigate(-1)}>← Temporadas</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.35rem' }}>{season.name || `Temporada #${season.id}`}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="muted">{movies.length}/{season.rounds} filmes</span>
            <span className={`status-pill ${isActive ? 'active' : 'closed'}`}>
              {isActive ? 'em andamento' : 'encerrada'}
            </span>
          </div>
        </div>
        {season.status === 'completed' && (
          <div className="row gap" style={{ flexShrink: 0 }}>
            <Link to={`/seasons/${id}/final-voting`} className="btn" style={{ fontSize: '0.85rem' }}>Votação final</Link>
            <Link to={`/seasons/${id}/results`} className="btn" style={{ fontSize: '0.85rem' }}>Resultados</Link>
          </div>
        )}
      </div>

      {isActive && !presenterAlreadyAdded && (
        <>
          <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Adicionar meu filme'}
          </button>
          {showForm && <AddMovieForm seasonId={id} onDone={() => { setShowForm(false); load(); }} />}
        </>
      )}
      {isActive && presenterAlreadyAdded && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>Você já adicionou seu filme nesta temporada.</p>
      )}

      {sortedMovies.length === 0 ? (
        <p className="muted">Nenhum filme adicionado ainda.</p>
      ) : (
        <>
          <div className="section-header">
            <h2>Filmes</h2>
            <span className="muted" style={{ fontSize: '0.72rem', marginLeft: 'auto' }}>mais recentes primeiro</span>
          </div>
          <ul className="grid">
            {sortedMovies.map((m) => (
              <li key={m.id} className="card movie-card">
                <Link to={`/movies/${m.id}`} className="movie-link">
                  <MoviePoster src={m.poster_url} alt={m.title} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{m.title}{m.year && <span className="muted" style={{ fontWeight: 400 }}> ({m.year})</span>}</h3>
                    <p className="muted" style={{ margin: '0.1rem 0 0.35rem' }}>
                      Rodada {m.round_number} · {m.presenter_name}
                      {m.created_at && (
                        <span> · {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      )}
                    </p>
                    {m.rating_count > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--amber)', fontWeight: 600 }}>★ {m.average_rating.toFixed(1)}</span>
                        <span className="muted">· {m.rating_count} nota{m.rating_count > 1 ? 's' : ''}</span>
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: '0.82rem' }}>sem notas ainda</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {isActive && <DateVoting seasonId={id} me={me} />}
      {members.length > 0 && <CollapsibleQueue members={members} />}
    </div>
  );
}

function CollapsibleQueue({ members }) {
  const [open, setOpen] = useState(false);
  const nextIndex = members.findIndex((m) => !m.hasPresented);
  const nextMember = nextIndex !== -1 ? members[nextIndex] : null;

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text)',
          minHeight: 'auto',
          gap: '0.5rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Fila de apresentações</h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {!open && nextMember && (
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              a seguir: <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{nextMember.name}</strong>
            </span>
          )}
          <span style={{
            color: 'var(--muted)',
            fontSize: '0.85rem',
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</span>
        </span>
      </button>

      {open && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
          {members.map((m, i) => {
            const isNext = i === nextIndex;
            return (
              <li
                key={m.memberId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.45rem 0',
                  borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: m.hasPresented ? 0.45 : 1,
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: '0.82rem', minWidth: '1.4rem', fontVariantNumeric: 'tabular-nums' }}>
                  {m.roundOrder}.
                </span>
                <span style={{ flex: 1, fontSize: '0.92rem', textDecoration: m.hasPresented ? 'line-through' : 'none' }}>
                  {m.name}
                  {m.hasPresented && m.movieTitle && (
                    <span className="muted" style={{ fontSize: '0.78rem', textDecoration: 'none' }}>
                      {' '}· {m.movieTitle}
                    </span>
                  )}
                </span>
                {isNext && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '20px',
                    background: 'var(--gradient)',
                    color: '#fff',
                    letterSpacing: '0.02em',
                  }}>
                    próximo
                  </span>
                )}
                {m.hasPresented && (
                  <span style={{ color: 'var(--green, #4ade80)', fontSize: '0.85rem' }}>✓</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function AddMovieForm({ seasonId, onDone }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
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

  useEffect(() => {
    if (manual || !query || query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchTMDB(query);
        setSuggestions(res);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
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
  }

  function reset() {
    setManual(false);
    setSelected(null);
    setQuery('');
    setSuggestions([]);
    setTitle(''); setYear(''); setDirector('');
    setSynopsis(''); setGenre(''); setRuntime('');
    setCustomPoster(null);
    setTimeout(() => searchRef.current?.focus(), 50);
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
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const hasSelection = Boolean(selected);
  const showForm = hasSelection || manual;

  return (
    <div className="card stack">
      {!showForm && (
        <div style={{ position: 'relative' }}>
          <label>Buscar filme
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o título…"
                autoFocus
                autoComplete="off"
                onFocus={() => suggestions.length && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              />
              {searching && (
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  buscando…
                </span>
              )}
            </div>
          </label>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="tmdb-suggestions">
              {suggestions.map((s) => (
                <li key={s.tmdb_id}>
                  <button type="button" className="tmdb-suggestion-btn" onMouseDown={() => pickSuggestion(s)}>
                    {s.poster_thumb
                      ? <img src={s.poster_thumb} alt={s.title} className="tmdb-thumb" />
                      : <div className="tmdb-thumb tmdb-thumb-placeholder">🎬</div>
                    }
                    <span className="tmdb-suggestion-info">
                      <span className="tmdb-suggestion-title">{s.title}</span>
                      {s.year && <span className="tmdb-suggestion-year">{s.year}</span>}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="tmdb-manual-btn" onMouseDown={goManual}>
                  Não encontrei meu filme — cadastrar manualmente
                </button>
              </li>
            </ul>
          )}

          {loadingDetails && <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Carregando detalhes…</p>}
        </div>
      )}

      {hasSelection && (
        <div className="tmdb-selected">
          {selected.poster_thumb && (
            <img src={selected.poster_thumb} alt={selected.title} className="tmdb-selected-poster" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, margin: '0 0 0.15rem', fontSize: '0.95rem' }}>{selected.title}</p>
            <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              {[selected.year, selected.director].filter(Boolean).join(' · ')}
              {selected.runtime && ` · ${selected.runtime} min`}
            </p>
          </div>
          <button type="button" className="link" style={{ fontSize: '0.8rem', flexShrink: 0 }} onClick={reset}>trocar</button>
        </div>
      )}
      {manual && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Cadastro manual</span>
          <button type="button" className="link" style={{ fontSize: '0.8rem' }} onClick={reset}>← buscar pelo TMDB</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="stack" style={{ gap: '0.75rem' }}>
          <label>Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="row gap">
            <label style={{ flex: 1 }}>Ano
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>Duração (min)
              <input type="number" value={runtime} onChange={(e) => setRuntime(e.target.value)} />
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
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.6rem 0.8rem', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-sm)', width: '100%' }}
              />
            </label>
          )}
          <label>Pôster personalizado (opcional)
            <input type="file" accept="image/*" onChange={(e) => setCustomPoster(e.target.files?.[0] || null)} />
          </label>
          {err && <p className="error">{err}</p>}
          <button type="submit" className="primary" disabled={busy || !title.trim()}>
            {busy ? 'Enviando…' : 'Adicionar filme'}
          </button>
        </form>
      )}

      {!showForm && !loadingDetails && query.length >= 2 && suggestions.length === 0 && !searching && (
        <button type="button" className="link" style={{ fontSize: '0.85rem', textAlign: 'left' }} onClick={goManual}>
          Nenhum resultado — cadastrar manualmente
        </button>
      )}

      {!showForm && query.length === 0 && (
        <button type="button" className="link" style={{ fontSize: '0.85rem', textAlign: 'left' }} onClick={goManual}>
          Cadastrar manualmente sem buscar
        </button>
      )}
    </div>
  );
}

function DateVoting({ seasonId, me }) {
  const [options, setOptions] = useState(null);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadOptions = async () => {
    try {
      const data = await api.dateOptions(seasonId);
      setOptions(data);
    } catch {
      setOptions([]);
    }
  };

  useEffect(() => { loadOptions(); }, [seasonId]);

  async function handleVote(optionId) {
    try {
      await api.toggleDateVote(seasonId, optionId);
      loadOptions();
    } catch {}
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newDate) return;
    setErr(''); setBusy(true);
    try {
      await api.addDateOption(seasonId, newDate);
      setNewDate('');
      setShowForm(false);
      loadOptions();
    } catch (e2) {
      setErr(e2.message === 'date_already_exists' ? 'Esta data já foi sugerida.' : e2.message);
    } finally { setBusy(false); }
  }

  async function handleRemove(optionId) {
    try {
      await api.removeDateOption(seasonId, optionId);
      loadOptions();
    } catch {}
  }

  const safeOptions = options || [];
  const topVotes = safeOptions.length > 0 ? Math.max(...safeOptions.map((o) => o.vote_count)) : 0;

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text)', minHeight: 'auto', gap: '0.5rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Próxima sessão</h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {!open && safeOptions.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {safeOptions.length} opç{safeOptions.length === 1 ? 'ão' : 'ões'}
            </span>
          )}
          <span style={{
            color: 'var(--muted)', fontSize: '0.85rem', display: 'inline-block',
            transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</span>
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {options === null && <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Carregando…</p>}
          {options !== null && safeOptions.length === 0 && (
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>Nenhuma data sugerida ainda.</p>
          )}
          {safeOptions.map((opt) => {
            const isTop = topVotes > 0 && opt.vote_count === topVotes;
            const canDelete = opt.proposed_by === me.id || me.is_admin;
            const dateLabel = new Date(opt.proposed_date + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            });
            return (
              <div key={opt.id} className={`nominee${opt.voted_by_me ? ' mine' : ''}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {dateLabel}
                    {isTop && opt.vote_count > 0 && (
                      <span style={{
                        marginLeft: '0.45rem', fontSize: '0.68rem', fontWeight: 700,
                        padding: '0.1rem 0.45rem', borderRadius: '20px',
                        background: 'var(--gradient)', color: '#fff', letterSpacing: '0.03em',
                      }}>mais votada</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    {opt.vote_count} voto{opt.vote_count !== 1 ? 's' : ''} · sugerida por {opt.proposed_by_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    className={opt.voted_by_me ? 'btn primary' : 'btn'}
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', minHeight: 'auto' }}
                    onClick={() => handleVote(opt.id)}
                  >
                    {opt.voted_by_me ? '✓ Votei' : 'Votar'}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="link"
                      style={{ fontSize: '0.82rem', color: 'var(--muted)', padding: '0.2rem 0.3rem' }}
                      onClick={() => handleRemove(opt.id)}
                      title="Remover sugestão"
                    >✕</button>
                  )}
                </div>
              </div>
            );
          })}

          {showForm ? (
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                autoFocus
                style={{ flex: 1, minWidth: '160px' }}
              />
              <button type="submit" className="btn primary" style={{ fontSize: '0.82rem' }} disabled={busy}>
                {busy ? '…' : 'Sugerir'}
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: '0.82rem' }}
                onClick={() => { setShowForm(false); setErr(''); setNewDate(''); }}
              >Cancelar</button>
              {err && <p className="error" style={{ width: '100%', margin: 0 }}>{err}</p>}
            </form>
          ) : (
            <button
              type="button"
              className="link"
              style={{ fontSize: '0.82rem', textAlign: 'left', alignSelf: 'flex-start' }}
              onClick={() => setShowForm(true)}
            >+ Sugerir data</button>
          )}
        </div>
      )}
    </section>
  );
}
