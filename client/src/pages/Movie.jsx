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
  if (!movie) return <p>Carregando…</p>;

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
    try {
      await api.removeMovieCategory(movie.id, catId);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function adminDelete() {
    if (!window.confirm(`Excluir "${movie.title}"?`)) return;
    try {
      await api.deleteMovie(movie.id);
      navigate(`/seasons/${movie.season_id}`);
    } catch (e) { setErr(e.message); }
  }

  const unpicked = cats.filter((c) => !movie.categories.some((mc) => mc.id === c.id));

  return (
    <div className="stack">
      <Link to={`/seasons/${movie.season_id}`}>← Voltar para a temporada</Link>
      <div className="row gap align-start movie-detail">
        <MoviePoster src={movie.poster_url} alt={movie.title} size="lg" />
        <div className="stack">
          <h1>{movie.title} {movie.year && <span className="muted">({movie.year})</span>}</h1>
          {movie.director && <p><strong>Direção:</strong> {movie.director}</p>}
          <p className="muted">Apresentado por {movie.presenter_name} · Rodada {movie.round_number}</p>
          {movie.event_date && <p className="muted">Encontro: {movie.event_date}</p>}

          <div className="card">
            <h3>Avaliação</h3>
            {movie.rating_count > 0 ? (
              <p>Média <strong>{movie.average_rating.toFixed(2)}</strong> · {movie.rating_count} voto(s) (anônimos)</p>
            ) : (
              <p className="muted">Ainda sem votos.</p>
            )}
            {!isPresenter ? (
              <>
                <p>Sua nota:</p>
                <StarRating value={movie.your_score || 0} onChange={rate} />
              </>
            ) : (
              <p className="muted">Você apresentou este filme — não pode se votar.</p>
            )}
          </div>

          <div className="card">
            <h3>Categorias indicadas</h3>
            {movie.categories.length === 0 && <p className="muted">Nenhuma ainda.</p>}
            <ul className="tags">
              {movie.categories.map((c) => (
                <li key={c.id} className="tag">
                  {c.name}
                  <button className="link-inline" onClick={() => removeCat(c.id)} title="remover">×</button>
                </li>
              ))}
            </ul>

            <form onSubmit={nominate} className="row gap">
              <select value={linkCat} onChange={(e) => setLinkCat(e.target.value)}>
                <option value="">— indicar em categoria existente —</option>
                {unpicked.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="submit" disabled={!linkCat}>Indicar</button>
            </form>

            <form onSubmit={createCategory} className="row gap">
              <input
                placeholder="Nova categoria (ex. Melhor Trilha)"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
              />
              <button type="submit" disabled={!newCat.trim()}>Criar + indicar</button>
            </form>
          </div>

          {me.is_admin && (
            <button className="btn danger" onClick={adminDelete}>Excluir filme (admin)</button>
          )}
        </div>
      </div>
    </div>
  );
}
