import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.results(id).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!data) return <p className="loading">Carregando…</p>;

  return (
    <div className="stack">
      <Link to={`/seasons/${id}`} className="back-link">← Temporada</Link>
      <h1>Resultados</h1>

      {data.length === 0 && <p className="muted">Sem categorias.</p>}

      {data.map((c) => {
        const maxVotes = c.tally.length > 0 ? Math.max(...c.tally.map((t) => t.votes)) : 1;
        return (
          <div key={c.category_id} className="card stack" style={{ gap: '0.75rem' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem' }}>{c.category_name}</h3>

            {c.winners.length === 0 && (
              <p className="muted" style={{ fontSize: '0.875rem' }}>Nenhum voto registrado.</p>
            )}

            {c.winners.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', background: 'var(--gradient-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79,142,247,0.15)' }}>
                <span style={{ fontSize: '1.1rem' }}>🏆</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {c.winners.map((w) => w.title).join(' & ')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {c.winners[0].votes} voto{c.winners[0].votes > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {c.tally.length > 1 && (
              <div className="stack" style={{ gap: '0.35rem' }}>
                {c.tally.map((t) => {
                  const isWinner = c.winners.some((w) => w.movie_id === t.movie_id);
                  const pct = Math.round((t.votes / maxVotes) * 100);
                  return (
                    <div key={t.movie_id} className={`tally-row ${isWinner ? 'winner-row' : ''}`}>
                      <span className="tally-label" title={t.title}>{t.title}</span>
                      <div className="tally-bar-track">
                        <div className="tally-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tally-count">{t.votes}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
