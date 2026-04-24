import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const TABS = [
  { key: 'members', label: 'Membros' },
  { key: 'seasons', label: 'Temporadas' },
  { key: 'movies', label: 'Filmes' },
  { key: 'categories', label: 'Categorias' },
];

export default function Admin() {
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [m, s, mv, c] = await Promise.all([
      api.members(), api.seasons(), api.allMovies(), api.categories(),
    ]);
    setMembers(m); setSeasons(s); setMovies(mv); setCats(c);
  };

  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const act = async (fn, successMsg = 'Salvo') => {
    setErr(''); setMsg('');
    try {
      const r = await fn();
      if (r === false) return;
      await load();
      setMsg(successMsg);
    } catch (e) {
      setErr(e.message);
    }
  };

  const ctx = { act, setErr, setMsg, load };

  return (
    <div className="stack">
      <h1>Admin</h1>
      {err && <p className="error">{err}</p>}
      {msg && <p className="ok">{msg}</p>}

      <div className="row" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setErr(''); setMsg(''); }}
            style={tab === key ? { background: 'var(--gradient)', color: '#fff', border: 'none' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' && <MembersSection members={members} ctx={ctx} />}
      {tab === 'seasons' && <SeasonsSection seasons={seasons} ctx={ctx} />}
      {tab === 'movies' && <MoviesSection movies={movies} seasons={seasons} ctx={ctx} />}
      {tab === 'categories' && <CategoriesSection cats={cats} ctx={ctx} />}
    </div>
  );
}

function MembersSection({ members, ctx }) {
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    ctx.act(() => api.createMember(name.trim(), isAdmin), 'Membro criado');
    setName(''); setIsAdmin(false);
  };

  const startEdit = (m) => {
    setEditId(m.id); setEditName(m.first_name); setEditIsAdmin(!!m.is_admin);
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    try {
      await api.updateMember(editId, { first_name: editName.trim(), is_admin: editIsAdmin });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) { ctx.setErr(e.message); }
  };

  return (
    <section className="card">
      <h2>Membros</h2>
      <form onSubmit={create} className="row gap" style={{ marginBottom: '0.75rem' }}>
        <input placeholder="Primeiro nome" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="row gap-sm" style={{ flexShrink: 0 }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ width: 'auto', minHeight: 'auto' }} />
          admin
        </label>
        <button type="submit" disabled={!name.trim()}>Adicionar</button>
      </form>
      <ul className="list">
        {members.map((m) => (
          <li key={m.id}>
            {editId === m.id ? (
              <div className="row space-between" style={{ gap: '0.5rem' }}>
                <div className="row gap" style={{ flex: 1 }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} />
                  <label className="row gap-sm" style={{ flexShrink: 0 }}>
                    <input type="checkbox" checked={editIsAdmin} onChange={(e) => setEditIsAdmin(e.target.checked)} style={{ width: 'auto', minHeight: 'auto' }} />
                    admin
                  </label>
                </div>
                <div className="row gap-sm">
                  <button onClick={saveEdit} disabled={!editName.trim()}>Salvar</button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row space-between">
                <span>
                  {m.first_name}
                  {m.is_admin && <span className="badge">admin</span>}
                </span>
                <div className="row gap-sm">
                  <button className="link" onClick={() => startEdit(m)}>editar</button>
                  <button className="link danger" onClick={() => ctx.act(() => api.deleteMember(m.id), 'Removido')}>remover</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeasonsSection({ seasons, ctx }) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const create = (e) => {
    e.preventDefault();
    ctx.act(() => api.createSeason(name.trim() || null), 'Temporada criada');
    setName('');
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    try {
      await api.updateSeason(editId, { name: editName.trim() || null });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) { ctx.setErr(e.message); }
  };

  const deleteSeason = (s) => ctx.act(async () => {
    if (!window.confirm(`Excluir "${s.name || `Temporada #${s.id}`}"?\nIsso remove todos os filmes, avaliações e votos.`)) return false;
    await api.deleteSeason(s.id);
  }, 'Temporada excluída');

  return (
    <section className="card">
      <h2>Temporadas</h2>
      <form onSubmit={create} className="row gap" style={{ marginBottom: '0.75rem' }}>
        <input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Criar temporada</button>
      </form>
      <ul className="list">
        {seasons.map((s) => (
          <li key={s.id}>
            {editId === s.id ? (
              <div className="row space-between">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={`Temporada #${s.id}`}
                  style={{ flex: 1 }}
                />
                <div className="row gap-sm">
                  <button onClick={saveEdit}>Salvar</button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row space-between" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>{s.name || `Temporada #${s.id}`}</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{s.movies_added}/{s.rounds} filmes</span>
                  <span className={`status-pill ${s.status === 'active' ? 'active' : 'closed'}`}>
                    {s.status === 'active' ? 'ativa' : 'encerrada'}
                  </span>
                </span>
                <div className="row gap-sm">
                  <button className="link" onClick={() => { setEditId(s.id); setEditName(s.name || ''); }}>editar</button>
                  {s.status === 'active' && (
                    <button onClick={() => ctx.act(() => api.completeSeason(s.id), 'Encerrada')}>Encerrar</button>
                  )}
                  <button className="link danger" onClick={() => deleteSeason(s)}>excluir</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MoviesSection({ movies, seasons, ctx }) {
  const seasonIds = [...new Set(movies.map((m) => m.season_id))];
  const bySeason = Object.fromEntries(seasonIds.map((id) => [id, []]));
  for (const m of movies) bySeason[m.season_id].push(m);

  const deleteMovie = (m) => ctx.act(async () => {
    if (!window.confirm(`Excluir "${m.title}"?`)) return false;
    await api.deleteMovie(m.id);
  }, 'Filme excluído');

  if (movies.length === 0) {
    return <p className="muted">Nenhum filme cadastrado.</p>;
  }

  return (
    <div className="stack">
      {seasonIds.map((sid) => {
        const s = seasons.find((x) => x.id === sid);
        const label = s?.name || `Temporada #${sid}`;
        return (
          <section key={sid} className="card">
            <h2 style={{ marginBottom: '0.5rem' }}>{label}</h2>
            <ul className="list">
              {bySeason[sid].map((m) => (
                <li key={m.id} className="row space-between">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                    <span>
                      {m.title}
                      {m.year && <span className="muted"> ({m.year})</span>}
                    </span>
                    <span className="muted" style={{ fontSize: '0.78rem' }}>
                      Rodada {m.round_number} · {m.presenter_name}
                      {m.director && ` · dir. ${m.director}`}
                    </span>
                  </span>
                  <div className="row gap-sm" style={{ flexShrink: 0 }}>
                    <Link
                      to={`/movies/${m.id}`}
                      style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 500 }}
                    >
                      ver
                    </Link>
                    <button className="link danger" onClick={() => deleteMovie(m)}>excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CategoriesSection({ cats, ctx }) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    ctx.act(() => api.createCategory(name.trim()), 'Categoria criada');
    setName('');
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    try {
      await api.updateCategory(editId, editName.trim());
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) { ctx.setErr(e.message); }
  };

  return (
    <section className="card">
      <h2>Categorias</h2>
      <form onSubmit={create} className="row gap" style={{ marginBottom: '0.75rem' }}>
        <input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={!name.trim()}>Adicionar</button>
      </form>
      <ul className="list">
        {cats.map((c) => (
          <li key={c.id}>
            {editId === c.id ? (
              <div className="row space-between">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} />
                <div className="row gap-sm">
                  <button onClick={saveEdit} disabled={!editName.trim()}>Salvar</button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row space-between">
                <span>{c.name}</span>
                <div className="row gap-sm">
                  <button className="link" onClick={() => { setEditId(c.id); setEditName(c.name); }}>editar</button>
                  <button className="link danger" onClick={() => ctx.act(() => api.deleteCategory(c.id), 'Excluída')}>excluir</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
