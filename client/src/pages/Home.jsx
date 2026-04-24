import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Home() {
  const [seasons, setSeasons] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.seasons().then(setSeasons).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="error">Erro: {err}</p>;

  const active = seasons.find((s) => s.status === 'active');
  const past = seasons.filter((s) => s.status !== 'active');

  return (
    <div className="stack">
      <h1>Temporadas</h1>
      {active ? (
        <SeasonRow s={active} featured />
      ) : (
        <p className="muted">Nenhuma temporada ativa. Um admin pode criar uma nova.</p>
      )}
      {past.length > 0 && (
        <>
          <h2>Encerradas</h2>
          <ul className="list">
            {past.map((s) => <li key={s.id}><SeasonRow s={s} /></li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function SeasonRow({ s, featured }) {
  const title = s.name || `Temporada #${s.id}`;
  return (
    <div className={`card ${featured ? 'featured' : ''}`}>
      <div className="row space-between">
        <div>
          <h3><Link to={`/seasons/${s.id}`}>{title}</Link></h3>
          <p className="muted">
            {s.movies_added}/{s.rounds} filmes · {s.status === 'active' ? 'em andamento' : 'encerrada'}
          </p>
        </div>
        {s.status === 'completed' && (
          <div className="row gap">
            <Link to={`/seasons/${s.id}/final-voting`} className="btn">Votação final</Link>
            <Link to={`/seasons/${s.id}/results`} className="btn">Resultados</Link>
          </div>
        )}
      </div>
    </div>
  );
}
