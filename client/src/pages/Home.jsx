import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api.js';

// "Início": always lands the user on the active season. If there is none,
// falls back to the full seasons list (which does not redirect).
export default function Home() {
  const [target, setTarget] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.seasons()
      .then((seasons) => {
        const active = seasons.find((s) => s.status === 'active');
        setTarget(active ? `/seasons/${active.id}` : '/seasons');
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!target) return <p className="loading">Carregando…</p>;
  return <Navigate to={target} replace />;
}
