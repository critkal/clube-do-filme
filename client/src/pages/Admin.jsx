import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Admin() {
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [m, s, c] = await Promise.all([api.members(), api.seasons(), api.categories()]);
      setMembers(m); setSeasons(s); setCats(c);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const wrap = (fn) => async (...args) => {
    setErr(''); setMsg('');
    try { await fn(...args); await load(); setMsg('OK'); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="stack">
      <h1>Admin</h1>
      {err && <p className="error">{err}</p>}
      {msg && <p className="ok">{msg}</p>}

      <section className="card">
        <h2>Membros</h2>
        <AddMember onSubmit={wrap((first_name, is_admin) => api.createMember(first_name, is_admin))} />
        <ul className="list">
          {members.map((m) => (
            <li key={m.id} className="row space-between">
              <span>{m.first_name} {m.is_admin && <span className="badge">admin</span>}</span>
              <button className="link danger" onClick={wrap(() => api.deleteMember(m.id))}>
                remover
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Temporadas</h2>
        <CreateSeason onSubmit={wrap((name) => api.createSeason(name))} />
        <ul className="list">
          {seasons.map((s) => (
            <li key={s.id} className="row space-between">
              <span>
                {s.name || `Temporada #${s.id}`} — {s.movies_added}/{s.rounds} — <em>{s.status}</em>
              </span>
              {s.status === 'active' && (
                <button onClick={wrap(() => api.completeSeason(s.id))}>Encerrar</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Categorias</h2>
        <p className="muted">Qualquer membro pode criar uma categoria. Aqui você pode excluí-las.</p>
        <ul className="list">
          {cats.map((c) => (
            <li key={c.id} className="row space-between">
              <span>{c.name}</span>
              <button className="link danger" onClick={wrap(() => api.deleteCategory(c.id))}>
                excluir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AddMember({ onSubmit }) {
  const [name, setName] = useState('');
  const [admin, setAdmin] = useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onSubmit(name.trim(), admin); setName(''); setAdmin(false); } }}
      className="row gap"
    >
      <input placeholder="Primeiro nome" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="row gap-sm">
        <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
        admin
      </label>
      <button type="submit" disabled={!name.trim()}>Adicionar</button>
    </form>
  );
}

function CreateSeason({ onSubmit }) {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(name.trim() || null); setName(''); }}
      className="row gap"
    >
      <input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit">Criar temporada</button>
    </form>
  );
}
