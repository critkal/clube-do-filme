import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Login() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.members().then(setMembers).catch(() => setMembers([]));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!name) return;
    setErr('');
    setBusy(true);
    try {
      await api.login(name);
      await refreshMe();
      navigate('/');
    } catch (e2) {
      setErr(e2.message === 'member_not_found' ? 'Nome não encontrado.' : 'Erro ao entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Entrar</h1>
      <p className="muted">Escolha seu primeiro nome para entrar no clube.</p>
      <form onSubmit={submit} className="stack">
        <label>
          Membro
          <select value={name} onChange={(e) => setName(e.target.value)} required>
            <option value="">— selecione —</option>
            {members.map((m) => (
              <option key={m.id} value={m.first_name}>{m.first_name}</option>
            ))}
          </select>
        </label>
        {err && <p className="error">{err}</p>}
        <button type="submit" disabled={busy || !name}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
