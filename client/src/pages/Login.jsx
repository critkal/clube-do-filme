import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Login() {
  const [members, setMembers] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.members()
      .then(setMembers)
      .catch(() => { setMembers([]); setLoadErr(true); });
  }, []);

  const selected = members?.find((m) => m.first_name === name);
  const needsPassword = selected?.has_password;

  function handleNameChange(e) {
    setName(e.target.value);
    setPassword('');
    setErr('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!name) return;
    setErr('');
    setBusy(true);
    try {
      await api.login(name, needsPassword ? password : undefined);
      await refreshMe();
      navigate('/');
    } catch (e2) {
      const code = e2.message;
      if (code === 'member_not_found') setErr('Nome não encontrado.');
      else if (code === 'password_required' || code === 'invalid_password') setErr('Senha incorreta.');
      else setErr('Erro ao entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card-head">
          <h1 className="login-brand">Clube do <span className="brand-accent">Filme</span></h1>
          <p className="muted login-sub">Escolha seu nome para entrar no clube.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            Membro
            <select value={name} onChange={handleNameChange} required disabled={!members}>
              <option value="">{members ? 'Selecione seu nome' : 'Carregando membros…'}</option>
              {members?.map((m) => (
                <option key={m.id} value={m.first_name}>{m.first_name}</option>
              ))}
            </select>
          </label>

          {needsPassword && (
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={err === 'Senha incorreta.' || undefined}
                autoFocus
                required
              />
            </label>
          )}

          {loadErr && (
            <p className="error" role="alert">Não foi possível carregar os membros. Recarregue a página.</p>
          )}
          {err && <p className="error" role="alert">{err}</p>}
          <button
            type="submit"
            className="primary block"
            disabled={busy || !name || (needsPassword && !password)}
            style={{ marginTop: '0.25rem' }}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
