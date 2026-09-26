import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api.js';

// "Início": always lands the user on the active season. If there is none,
// falls back to the full seasons list (which does not redirect).
export default function Home() {
  const [target, setTarget] = useState(null);
  const [err, setErr] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setErr('');
    api.seasons()
      .then((seasons) => {
        const active = seasons.find((s) => s.status === 'active');
        setTarget(active ? `/seasons/${active.id}` : '/seasons');
      })
      .catch((e) => setErr(e.message));
  }, [attempt]);

  if (err) {
    return (
      <div className="stack">
        <p className="error" role="alert">Não foi possível carregar as temporadas ({err}).</p>
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setAttempt((n) => n + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (!target) return <p className="loading">Carregando…</p>;
  return <Navigate to={target} replace />;
}
