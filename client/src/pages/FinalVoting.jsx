import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

const MESSAGES = {
  season_not_completed: 'A votação final abre quando a temporada for concluída.',
  season_not_found: 'Temporada não encontrada.',
  already_voted: 'Você já votou nesta categoria.',
};
const message = (code) => MESSAGES[code] || `Erro: ${code}`;

export default function FinalVoting() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState({});
  const [pending, setPending] = useState({});
  const [voteErr, setVoteErr] = useState({});

  const load = async () => {
    try { setData(await api.finalVoting(id)); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  async function vote(categoryId, movieId) {
    setBusy((b) => ({ ...b, [categoryId]: true }));
    setVoteErr((v) => ({ ...v, [categoryId]: '' }));
    try {
      await api.castFinalVote(id, categoryId, movieId);
      await load();
    } catch (e) {
      setVoteErr((v) => ({ ...v, [categoryId]: message(e.message) }));
    } finally {
      setBusy((b) => ({ ...b, [categoryId]: false }));
      setPending((p) => ({ ...p, [categoryId]: null }));
    }
  }

  const back = <Link to={`/seasons/${id}`} className="back-link">← Temporada</Link>;

  if (err) {
    return (
      <div className="stack">
        {back}
        <p className={err === 'season_not_completed' ? 'muted' : 'error'}>{message(err)}</p>
      </div>
    );
  }
  if (!data) return <p className="loading">Carregando…</p>;

  const votable = data.filter((c) => c.nominees.length > 0);
  const votedCount = votable.filter((c) => c.your_vote_movie_id != null).length;

  return (
    <div className="stack">
      {back}
      <div>
        <h1>Votação Final</h1>
        <p className="muted final-intro">Um voto por categoria. É secreto e não pode ser alterado depois.</p>
      </div>

      {data.length === 0 ? (
        <p className="muted">Nenhum filme foi indicado nesta temporada.</p>
      ) : (
        <div className="final-progress" aria-live="polite">
          <span>
            {votedCount === votable.length
              ? 'Você votou em todas as categorias.'
              : `Você votou em ${votedCount} de ${votable.length} categorias`}
          </span>
          <div className="tally-bar-track">
            <div className="tally-bar-fill" style={{ width: `${votable.length ? (votedCount / votable.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {data.map((cat) => {
        const voted = cat.your_vote_movie_id != null;
        return (
          <section key={cat.id} className="card nominee-card" aria-labelledby={`cat-${cat.id}`}>
            <div className="nominee-card-head">
              <h3 id={`cat-${cat.id}`}>{cat.name}</h3>
              {cat.nominees.length > 0 && (
                <span className={`nominee-status ${voted ? 'done' : ''}`}>{voted ? '✓ Votado' : 'Pendente'}</span>
              )}
            </div>
            {cat.nominees.length === 0 ? (
              <p className="muted nominee-empty">Sem indicados.</p>
            ) : (
              <ul className="list">
                {cat.nominees.map((n) => {
                  const mine = cat.your_vote_movie_id === n.id;
                  const confirming = pending[cat.id] === n.id;
                  return (
                    <li key={n.id} className={`nominee ${mine ? 'mine' : ''} ${voted && !mine ? 'dim' : ''}`}>
                      <div className="nominee-info">
                        <div className="nominee-title">{n.title}</div>
                        {(n.average_rating != null || n.referral_count > 0) && (
                          <div className="nominee-meta">
                            {n.average_rating != null && (
                              <span><span className="nominee-star">★</span> {n.average_rating.toFixed(1)} média</span>
                            )}
                            {n.referral_count > 0 && (
                              <span>{n.referral_count} {n.referral_count === 1 ? 'indicação' : 'indicações'}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {mine && <span className="nominee-mark">✓ Seu voto</span>}
                      {!voted && !confirming && (
                        <button
                          type="button"
                          disabled={busy[cat.id]}
                          onClick={() => setPending((p) => ({ ...p, [cat.id]: n.id }))}
                          aria-label={`Votar em ${n.title}`}
                        >
                          Votar
                        </button>
                      )}
                      {!voted && confirming && (
                        <div className="nominee-confirm">
                          <button
                            type="button"
                            className="primary"
                            disabled={busy[cat.id]}
                            onClick={() => vote(cat.id, n.id)}
                          >
                            {busy[cat.id] ? 'Votando…' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            className="link-btn"
                            disabled={busy[cat.id]}
                            onClick={() => setPending((p) => ({ ...p, [cat.id]: null }))}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {voteErr[cat.id] && <p className="error nominee-error" role="alert">{voteErr[cat.id]}</p>}
          </section>
        );
      })}
    </div>
  );
}
