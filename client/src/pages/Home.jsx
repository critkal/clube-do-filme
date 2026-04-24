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
        <SeasonCard s={active} featured />
      ) : (
        <p className="muted">Nenhuma temporada ativa. Um admin pode criar uma nova.</p>
      )}

      {past.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: '0.5rem' }}>
            <h2>Encerradas</h2>
          </div>
          <ul className="list">
            {past.map((s) => (
              <li key={s.id}><SeasonCard s={s} /></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SeasonCard({ s, featured }) {
  const title = s.name || `Temporada #${s.id}`;
  const isActive = s.status === 'active';
  return (
    <div className={`card ${featured ? 'featured' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h3 style={{ margin: 0 }}>
              <Link to={`/seasons/${s.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                {title}
              </Link>
            </h3>
            <span className={`status-pill ${isActive ? 'active' : 'closed'}`}>
              {isActive ? 'em andamento' : 'encerrada'}
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {s.movies_added}/{s.rounds} filmes adicionados
          </p>
        </div>
        {s.status === 'completed' && (
          <div className="row gap" style={{ flexShrink: 0 }}>
            <Link to={`/seasons/${s.id}/final-voting`} className="btn" style={{ fontSize: '0.8rem', minHeight: '36px', padding: '0.4rem 0.7rem' }}>
              Votação
            </Link>
            <Link to={`/seasons/${s.id}/results`} className="btn" style={{ fontSize: '0.8rem', minHeight: '36px', padding: '0.4rem 0.7rem' }}>
              Resultados
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
