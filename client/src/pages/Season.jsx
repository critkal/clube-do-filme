import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';

export default function Season() {
  const { id } = useParams();
  const { me } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [movies, setMovies] = useState([]);
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const [all, ms] = await Promise.all([api.seasons(), api.seasonMovies(id)]);
      setSeasons(all);
      setMovies(ms);
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

  return (
    <div className="stack">
      <Link to="/" className="back-link">← Temporadas</Link>

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

      {movies.length === 0 ? (
        <p className="muted">Nenhum filme adicionado ainda.</p>
      ) : (
        <ul className="grid">
          {movies.map((m) => (
            <li key={m.id} className="card movie-card">
              <Link to={`/movies/${m.id}`} className="movie-link">
                <MoviePoster src={m.poster_url} alt={m.title} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{m.title}{m.year && <span className="muted" style={{ fontWeight: 400 }}> ({m.year})</span>}</h3>
                  <p className="muted" style={{ margin: '0.1rem 0 0.35rem' }}>
                    Rodada {m.round_number} · {m.presenter_name}
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
      )}
    </div>
  );
}

function AddMovieForm({ seasonId, onDone }) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [director, setDirector] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [poster, setPoster] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      if (year) fd.append('year', year);
      if (director) fd.append('director', director);
      if (eventDate) fd.append('event_date', eventDate);
      if (poster) fd.append('poster', poster);
      await api.addMovie(seasonId, fd);
      onDone?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card stack">
      <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
      <div className="row gap">
        <label style={{ flex: 1 }}>Ano<input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></label>
        <label style={{ flex: 2 }}>Diretor<input value={director} onChange={(e) => setDirector(e.target.value)} /></label>
      </div>
      <label>Data do encontro<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
      <label>Pôster<input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0] || null)} /></label>
      {err && <p className="error">{err}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Enviando…' : 'Adicionar filme'}</button>
    </form>
  );
}
