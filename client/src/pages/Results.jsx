import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.results(id).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!data) return <p className="loading">Carregando…</p>;

  const decided = data.filter((c) => c.tally.length > 0);
  const empty = data.filter((c) => c.tally.length === 0);

  return (
    <div className="stack">
      <Link to={`/seasons/${id}`} className="back-link">← Temporada</Link>
      <h1>Resultados</h1>

      {data.length === 0 && <p className="muted">Sem categorias.</p>}
      {data.length > 0 && decided.length === 0 && (
        <p className="muted">Nenhum voto registrado ainda.</p>
      )}

      {decided.map((c) => {
        const maxVotes = c.tally[0].votes;
        const total = c.tally.reduce((sum, t) => sum + t.votes, 0);
        const tie = c.winners.length > 1;
        return (
          <section key={c.category_id} className="card result-card" aria-labelledby={`res-${c.category_id}`}>
            <div className="result-card-head">
              <h3 id={`res-${c.category_id}`}>{c.category_name}</h3>
              <span className="result-total">{plural(total, 'voto', 'votos')}</span>
            </div>

            <div className="result-winner">
              <span className="result-winner-icon" aria-hidden="true">🏆</span>
              <div className="result-winner-info">
                {tie && <span className="result-tie">Empate</span>}
                <div className="result-winner-title">{c.winners.map((w) => w.title).join(' & ')}</div>
                <div className="result-winner-votes">
                  {plural(c.winners[0].votes, 'voto', 'votos')}{tie ? ' cada' : ''}
                </div>
              </div>
            </div>

            {c.tally.length > 1 && (
              <div className="result-tally">
                {c.tally.map((t) => {
                  const isWinner = c.winners.some((w) => w.movie_id === t.movie_id);
                  return (
                    <div key={t.movie_id} className={`tally-row ${isWinner ? 'winner-row' : ''}`}>
                      <span className="tally-label" title={t.title}>{t.title}</span>
                      <div className="tally-bar-track" aria-hidden="true">
                        <div className="tally-bar-fill" style={{ width: `${(t.votes / maxVotes) * 100}%` }} />
                      </div>
                      <span className="tally-count">{t.votes}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {decided.length > 0 && empty.length > 0 && (
        <div className="card">
          <h3 className="result-empty-title">Categorias sem votos</h3>
          <p className="muted result-empty-list">{empty.map((c) => c.category_name).join(' · ')}</p>
        </div>
      )}
    </div>
  );
}
