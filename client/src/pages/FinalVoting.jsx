import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function FinalVoting() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState({});

  const load = async () => {
    try { setData(await api.finalVoting(id)); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  async function vote(categoryId, movieId) {
    setBusy((b) => ({ ...b, [categoryId]: true }));
    try {
      await api.castFinalVote(id, categoryId, movieId);
      await load();
    } catch (e) {
      alert(e.message === 'already_voted' ? 'Você já votou nesta categoria.' : e.message);
    } finally {
      setBusy((b) => ({ ...b, [categoryId]: false }));
    }
  }

  if (err) return <p className="error">Erro: {err}</p>;
  if (!data) return <p className="loading">Carregando…</p>;

  return (
    <div className="stack">
      <Link to={`/seasons/${id}`} className="back-link">← Temporada</Link>
      <div>
        <h1>Votação Final</h1>
        <p className="muted">Seu voto é secreto e final — não pode ser alterado.</p>
      </div>

      {data.length === 0 && <p className="muted">Nenhuma categoria criada.</p>}

      {data.map((cat) => (
        <div key={cat.id} className="card stack" style={{ gap: '0.75rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem' }}>{cat.name}</h3>
          {cat.nominees.length === 0 && <p className="muted" style={{ fontSize: '0.875rem' }}>Sem indicados.</p>}
          <ul className="list">
            {cat.nominees.map((n) => {
              const voted = cat.your_vote_movie_id != null;
              const mine = cat.your_vote_movie_id === n.id;
              return (
                <li key={n.id} className={`nominee ${mine ? 'mine' : ''}`}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{n.title}</div>
                    {n.average_rating != null && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                        <span style={{ color: 'var(--amber)' }}>★</span> {n.average_rating.toFixed(1)} média
                      </div>
                    )}
                  </div>
                  {voted ? (
                    mine
                      ? <span style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ seu voto</span>
                      : <span className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>já votou</span>
                  ) : (
                    <button
                      disabled={busy[cat.id]}
                      onClick={() => vote(cat.id, n.id)}
                      style={{ flexShrink: 0, fontSize: '0.85rem', minHeight: '36px', padding: '0.4rem 0.8rem' }}
                    >
                      Votar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
