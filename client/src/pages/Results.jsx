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
  if (!data) return <p>Carregando…</p>;

  return (
    <div className="stack">
      <Link to={`/seasons/${id}`}>← Temporada</Link>
      <h1>Resultados</h1>
      {data.length === 0 && <p className="muted">Sem categorias.</p>}
      {data.map((c) => (
        <div key={c.category_id} className="card">
          <h3>{c.category_name}</h3>
          {c.winners.length === 0 && <p className="muted">Nenhum voto registrado.</p>}
          {c.winners.length > 0 && (
            <p>
              <strong>🏆 {c.winners.map((w) => w.title).join(' & ')}</strong>
              {' '}({c.winners[0].votes} voto{c.winners[0].votes > 1 ? 's' : ''})
            </p>
          )}
          {c.tally.length > 1 && (
            <details>
              <summary>Apuração</summary>
              <ul>
                {c.tally.map((t) => (
                  <li key={t.movie_id}>{t.title} — {t.votes} voto{t.votes > 1 ? 's' : ''}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
