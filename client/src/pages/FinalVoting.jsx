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
  if (!data) return <p>Carregando…</p>;

  return (
    <div className="stack">
      <Link to={`/seasons/${id}`}>← Temporada</Link>
      <h1>Votação final</h1>
      <p className="muted">Seu voto é secreto e final — não pode ser alterado.</p>
      {data.length === 0 && <p>Nenhuma categoria criada.</p>}
      {data.map((cat) => (
        <div key={cat.id} className="card">
          <h3>{cat.name}</h3>
          {cat.nominees.length === 0 && <p className="muted">Sem indicados.</p>}
          <ul className="grid">
            {cat.nominees.map((n) => {
              const voted = cat.your_vote_movie_id != null;
              const mine = cat.your_vote_movie_id === n.id;
              return (
                <li key={n.id} className={`nominee ${mine ? 'mine' : ''}`}>
                  <div>
                    <strong>{n.title}</strong>
                    {n.average_rating != null && (
                      <div className="muted">média {n.average_rating.toFixed(2)}</div>
                    )}
                  </div>
                  {voted ? (
                    mine
                      ? <span className="muted">✓ seu voto</span>
                      : <span className="muted">já votou</span>
                  ) : (
                    <button disabled={busy[cat.id]} onClick={() => vote(cat.id, n.id)}>Votar</button>
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
