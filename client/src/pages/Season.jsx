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
  if (!season) return <p>Carregando…</p>;

  const presenterAlreadyAdded = movies.some((m) => m.presenter_id === me.id);

  return (
    <div className="stack">
      <div className="row space-between">
        <div>
          <h1>{season.name || `Temporada #${season.id}`}</h1>
          <p className="muted">
            {movies.length}/{season.rounds} · {season.status === 'active' ? 'em andamento' : 'encerrada'}
          </p>
        </div>
        {season.status === 'completed' && (
          <div className="row gap">
            <Link to={`/seasons/${id}/final-voting`} className="btn">Votação final</Link>
            <Link to={`/seasons/${id}/results`} className="btn">Resultados</Link>
          </div>
        )}
      </div>

      {season.status === 'active' && !presenterAlreadyAdded && (
        <>
          <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : 'Adicionar meu filme'}
          </button>
          {showForm && <AddMovieForm seasonId={id} onDone={() => { setShowForm(false); load(); }} />}
        </>
      )}
      {season.status === 'active' && presenterAlreadyAdded && (
        <p className="muted">Você já apresentou seu filme nesta temporada.</p>
      )}

      <ul className="grid">
        {movies.map((m) => (
          <li key={m.id} className="card movie-card">
            <Link to={`/movies/${m.id}`} className="movie-link">
              <MoviePoster src={m.poster_url} alt={m.title} size="sm" />
              <div>
                <h3>{m.title} {m.year && <span className="muted">({m.year})</span>}</h3>
                <p className="muted">Rodada {m.round_number} · Apresentado por {m.presenter_name}</p>
                <p>
                  {m.rating_count > 0
                    ? <>⭐ {m.average_rating.toFixed(2)} · {m.rating_count} nota(s)</>
                    : <span className="muted">sem notas ainda</span>}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
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
        <label>Ano<input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></label>
        <label>Diretor<input value={director} onChange={(e) => setDirector(e.target.value)} /></label>
      </div>
      <label>Data do encontro<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
      <label>Pôster<input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0] || null)} /></label>
      {err && <p className="error">{err}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Adicionar'}</button>
    </form>
  );
}
