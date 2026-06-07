import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Seasons() {
  const [seasons, setSeasons] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.seasons().then(setSeasons).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="error">Erro: {err}</p>;
  if (seasons === null) return <p className="loading">Carregando…</p>;

  const active = seasons.filter((s) => s.status === 'active');
  const past = seasons.filter((s) => s.status !== 'active');

  return (
    <div className="stack">
      <h1>Temporadas</h1>

      {seasons.length === 0 && <p className="muted">Nenhuma temporada ainda.</p>}

      {active.length > 0 && (
        <>
          <div className="section-header">
            <h2>Em andamento</h2>
          </div>
          <ul className="list">
            {active.map((s) => (
              <li key={s.id}><SeasonCard s={s} /></li>
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: active.length > 0 ? '0.5rem' : 0 }}>
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

const STATUS = {
  active: { cls: 'active', label: 'em andamento' },
  completed: { cls: 'closed', label: 'encerrada' },
  presented: { cls: 'presented', label: 'apresentada' },
};

function SeasonCard({ s }) {
  const navigate = useNavigate();
  const title = s.name || `Temporada #${s.id}`;
  const status = STATUS[s.status] || STATUS.completed;
  const progress = s.rounds > 0 ? Math.round((s.movies_added / s.rounds) * 100) : 0;
  const hasActions = s.status === 'completed' || s.status === 'presented';

  return (
    <div
      className="card season-card"
      onClick={() => navigate(`/seasons/${s.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/seasons/${s.id}`)}
    >
      <div className="season-card-header">
        <div className="season-card-title-row">
          <span className="season-card-title">{title}</span>
          <span className={`status-pill ${status.cls}`}>{status.label}</span>
        </div>
        <div className="season-progress-track">
          <div className="season-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="season-progress-label">{s.movies_added} de {s.rounds} filmes adicionados</p>
      </div>
      {hasActions && (
        <div className="season-card-actions" onClick={(e) => e.stopPropagation()}>
          <Link to={`/seasons/${s.id}/final-voting`} className="btn" style={{ fontSize: '0.82rem', minHeight: '36px', padding: '0.4rem 0.85rem' }}>
            Votação final
          </Link>
          <Link to={`/seasons/${s.id}/results`} className="btn" style={{ fontSize: '0.82rem', minHeight: '36px', padding: '0.4rem 0.85rem' }}>
            Resultados
          </Link>
        </div>
      )}
    </div>
  );
}
