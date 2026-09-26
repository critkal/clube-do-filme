import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

      {seasons.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma temporada ainda.</p>
          <p className="muted">Quando um admin criar a primeira temporada, ela aparece aqui.</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="stack season-group" aria-labelledby="seasons-active">
          <div className="section-header">
            <h2 id="seasons-active">Em andamento</h2>
          </div>
          <ul className="list">
            {active.map((s) => (
              <li key={s.id}><SeasonCard s={s} /></li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="stack season-group" aria-labelledby="seasons-past">
          <div className="section-header">
            <h2 id="seasons-past">Encerradas</h2>
            <span className="muted season-group-count">{past.length}</span>
          </div>
          <ul className="list">
            {past.map((s) => (
              <li key={s.id}><SeasonCard s={s} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const STATUS = {
  active: { cls: 'active', label: 'em andamento' },
  completed: { cls: 'closed', label: 'em votação' },
  presented: { cls: 'presented', label: 'apresentada' },
};

function SeasonCard({ s }) {
  const title = s.name || `Temporada #${s.id}`;
  const status = STATUS[s.status] || STATUS.completed;
  const progress = s.rounds > 0 ? Math.min(100, Math.round((s.movies_added / s.rounds) * 100)) : 0;

  return (
    <div className={`card season-card ${s.status === 'active' ? 'is-active' : ''}`}>
      <div className="season-card-header">
        <div className="season-card-title-row">
          {/* Stretched over the card via ::after so the action links aren't nested in a link */}
          <Link to={`/seasons/${s.id}`} className="season-card-link season-card-title">{title}</Link>
          <span className={`status-pill ${status.cls}`}>{status.label}</span>
        </div>
        <div
          className="season-progress-track"
          role="progressbar"
          aria-label="Filmes adicionados"
          aria-valuemin={0}
          aria-valuemax={s.rounds}
          aria-valuenow={s.movies_added}
        >
          <div className="season-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="season-progress-label">
          {s.movies_added} de {s.rounds} filmes
          {s.is_host && <span className="season-host-tag">você é o anfitrião</span>}
        </p>
      </div>
      {s.status === 'completed' && (
        <div className="season-card-actions">
          <Link to={`/seasons/${s.id}/final-voting`} className="btn primary">Votar agora</Link>
          <Link to={`/seasons/${s.id}/results`} className="btn">Resultados</Link>
        </div>
      )}
      {s.status === 'presented' && (
        <div className="season-card-actions">
          <Link to={`/seasons/${s.id}/results`} className="btn">Ver resultados</Link>
        </div>
      )}
    </div>
  );
}
