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
  const [pending, setPending] = useState(null);

  const load = async () => {
    const [m, s, mv, c] = await Promise.all([
      api.members(), api.seasons(), api.allMovies(), api.categories(),
    ]);
    setMembers(m); setSeasons(s); setMovies(mv); setCats(c);
  };

  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const act = async (fn, successMsg = 'Salvo', id = null) => {
    setErr(''); setMsg('');
    if (id !== null) setPending(id);
    try {
      const r = await fn();
      if (r === false) { setPending(null); return; }
      await load();
      setMsg(successMsg);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPending(null);
    }
  };

  const ctx = { act, setErr, setMsg, load, pending };

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
      {tab === 'seasons' && <SeasonsSection seasons={seasons} members={members} ctx={ctx} />}
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
  const [saving, setSaving] = useState(false);
  const [pwdId, setPwdId] = useState(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    ctx.act(() => api.createMember(name.trim(), isAdmin), 'Membro criado', 'creating-member');
    setName(''); setIsAdmin(false);
  };

  const startEdit = (m) => {
    setEditId(m.id); setEditName(m.first_name); setEditIsAdmin(!!m.is_admin);
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateMember(editId, { first_name: editName.trim(), is_admin: editIsAdmin });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) {
      ctx.setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const creating = ctx.pending === 'creating-member';

  const savePassword = async () => {
    if (!pwdValue.trim()) return;
    ctx.setErr(''); ctx.setMsg('');
    setPwdSaving(true);
    try {
      await api.setAdminPassword(pwdId, pwdValue.trim());
      setPwdId(null); setPwdValue('');
      ctx.setMsg('Senha definida');
    } catch (e) {
      ctx.setErr(e.message === 'password_too_short' ? 'Senha deve ter pelo menos 6 caracteres.' : e.message);
    } finally {
      setPwdSaving(false);
    }
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
        <button type="submit" disabled={!name.trim() || creating}>
          {creating ? 'Adicionando…' : 'Adicionar'}
        </button>
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
                  <button onClick={saveEdit} disabled={!editName.trim() || saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="row space-between">
                  <span>
                    {m.first_name}
                    {m.is_admin && <span className="badge">admin</span>}
                  </span>
                  <div className="row gap-sm">
                    <button className="link-btn" onClick={() => startEdit(m)}>editar</button>
                    {m.is_admin && (
                      <button className="link-btn" onClick={() => { setPwdId(pwdId === m.id ? null : m.id); setPwdValue(''); }}>
                        {pwdId === m.id ? 'cancelar' : 'senha'}
                      </button>
                    )}
                    <button
                      className="link-btn danger"
                      onClick={() => ctx.act(() => api.deleteMember(m.id), 'Removido', `member-${m.id}`)}
                      disabled={ctx.pending === `member-${m.id}`}
                    >
                      {ctx.pending === `member-${m.id}` ? 'removendo…' : 'remover'}
                    </button>
                  </div>
                </div>
                {pwdId === m.id && (
                  <div className="row gap-sm" style={{ paddingLeft: '0.25rem' }}>
                    <input
                      type="password"
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={pwdValue}
                      onChange={(e) => setPwdValue(e.target.value)}
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <button onClick={savePassword} disabled={pwdValue.trim().length < 6 || pwdSaving} style={{ flexShrink: 0, fontSize: '0.85rem' }}>
                      {pwdSaving ? 'Salvando…' : 'Definir'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeasonsSection({ seasons, members, ctx }) {
  const [name, setName] = useState('');
  const [hostId, setHostId] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [orderSeasonId, setOrderSeasonId] = useState(null);
  const [saving, setSaving] = useState(false);

  const create = (e) => {
    e.preventDefault();
    ctx.act(
      () => api.createSeason(name.trim() || null, hostId ? Number(hostId) : undefined),
      'Temporada criada',
      'creating-season',
    );
    setName(''); setHostId('');
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateSeason(editId, { name: editName.trim() || null });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) {
      ctx.setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSeason = (s) => ctx.act(async () => {
    if (!window.confirm(`Excluir "${s.name || `Temporada #${s.id}`}"?\nIsso remove todos os filmes, avaliações e votos.`)) return false;
    await api.deleteSeason(s.id);
  }, 'Temporada excluída', `season-${s.id}`);

  const creating = ctx.pending === 'creating-season';

  return (
    <section className="card">
      <h2>Temporadas</h2>
      <form onSubmit={create} className="stack" style={{ marginBottom: '0.75rem', gap: '0.5rem' }}>
        <div className="row gap">
          <input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 2 }} />
          <select value={hostId} onChange={(e) => setHostId(e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }}>
            <option value="">Host (padrão: você)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={creating} style={{ alignSelf: 'flex-start' }}>
          {creating ? 'Criando…' : 'Criar temporada'}
        </button>
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
                  <button onClick={saveEdit} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row space-between" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>{s.name || `Temporada #${s.id}`}</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>{s.movies_added}/{s.rounds} filmes</span>
                  <SeasonStatusPill status={s.status} />
                  {s.host_id && (
                    <span className="muted" style={{ fontSize: '0.75rem' }}>
                      host: {members.find((m) => m.id === s.host_id)?.first_name || `#${s.host_id}`}
                    </span>
                  )}
                </span>
                <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button className="link-btn" onClick={() => { setEditId(s.id); setEditName(s.name || ''); }}>
                    editar
                  </button>
                  <button
                    className={`link-btn${orderSeasonId === s.id ? ' open' : ''}`}
                    onClick={() => setOrderSeasonId(orderSeasonId === s.id ? null : s.id)}
                  >
                    {orderSeasonId === s.id ? 'fechar fila' : 'fila'}
                  </button>
                  {s.status === 'active' && (
                    <button
                      onClick={() => ctx.act(() => api.completeSeason(s.id), 'Encerrada', `complete-${s.id}`)}
                      disabled={ctx.pending === `complete-${s.id}`}
                    >
                      {ctx.pending === `complete-${s.id}` ? 'Encerrando…' : 'Encerrar'}
                    </button>
                  )}
                  {s.status === 'completed' && (
                    <button
                      onClick={() => ctx.act(() => api.presentSeason(s.id), 'Apresentada!', `present-${s.id}`)}
                      disabled={ctx.pending === `present-${s.id}`}
                      style={{ background: 'var(--gradient)', color: '#fff', border: 'none', fontWeight: 600 }}
                    >
                      {ctx.pending === `present-${s.id}` ? 'Publicando…' : '🎬 Apresentar'}
                    </button>
                  )}
                  <button
                    className="link-btn danger"
                    onClick={() => deleteSeason(s)}
                    disabled={ctx.pending === `season-${s.id}`}
                  >
                    {ctx.pending === `season-${s.id}` ? 'excluindo…' : 'excluir'}
                  </button>
                </div>
              </div>
            )}
            {orderSeasonId === s.id && editId !== s.id && (
              <SeasonMemberOrder
                seasonId={s.id}
                ctx={ctx}
                onClose={() => setOrderSeasonId(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeasonMemberOrder({ seasonId, ctx, onClose }) {
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => api.seasonMembers(seasonId).then(setMembers).catch((e) => ctx.setErr(e.message));
  useEffect(() => { load(); }, [seasonId]);

  const move = (index, dir) => {
    const next = [...members];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setMembers(next.map((m, i) => ({ ...m, roundOrder: i + 1 })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMemberOrder(seasonId, members.map((m) => ({ memberId: m.memberId, roundOrder: m.roundOrder })));
      ctx.setMsg('Ordem salva');
    } catch (e) {
      ctx.setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <div className="row space-between" style={{ marginBottom: '0.6rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Fila de apresentações</span>
        <button className="link" style={{ fontSize: '0.82rem' }} onClick={onClose}>fechar</button>
      </div>
      <ul className="list" style={{ marginBottom: '0.65rem' }}>
        {members.map((m, i) => (
          <li key={m.memberId} className="row space-between" style={{ padding: '0.2rem 0', opacity: m.hasPresented ? 0.5 : 1 }}>
            <span className="row gap-sm">
              <span className="muted" style={{ fontSize: '0.78rem', minWidth: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
              <span style={{ fontSize: '0.88rem', textDecoration: m.hasPresented ? 'line-through' : 'none' }}>{m.name}</span>
              {m.hasPresented && <span style={{ color: 'var(--green, #4ade80)', fontSize: '0.8rem' }}>✓</span>}
            </span>
            <div className="row gap-sm">
              <button className="link" style={{ fontSize: '1rem', lineHeight: 1 }} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button className="link" style={{ fontSize: '1rem', lineHeight: 1 }} onClick={() => move(i, 1)} disabled={i === members.length - 1}>↓</button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={save} disabled={saving} className="btn primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
        {saving ? 'Salvando…' : 'Salvar ordem'}
      </button>
    </div>
  );
}

function SeasonStatusPill({ status }) {
  if (status === 'active') return <span className="status-pill active">ativa</span>;
  if (status === 'presented') return <span className="status-pill presented">apresentada</span>;
  return <span className="status-pill closed">encerrada</span>;
}

function MoviesSection({ movies, seasons, ctx }) {
  const seasonIds = [...new Set(movies.map((m) => m.season_id))];
  const bySeason = Object.fromEntries(seasonIds.map((id) => [id, []]));
  for (const m of movies) bySeason[m.season_id].push(m);

  const deleteMovie = (m) => ctx.act(async () => {
    if (!window.confirm(`Excluir "${m.title}"?`)) return false;
    await api.deleteMovie(m.id);
  }, 'Filme excluído', `movie-${m.id}`);

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
                    <button
                      className="link-btn danger"
                      onClick={() => deleteMovie(m)}
                      disabled={ctx.pending === `movie-${m.id}`}
                    >
                      {ctx.pending === `movie-${m.id}` ? 'excluindo…' : 'excluir'}
                    </button>
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
  const [saving, setSaving] = useState(false);

  const create = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    ctx.act(() => api.createCategory(name.trim()), 'Categoria criada', 'creating-cat');
    setName('');
  };

  const saveEdit = async () => {
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateCategory(editId, editName.trim());
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Salvo');
    } catch (e) {
      ctx.setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const creating = ctx.pending === 'creating-cat';

  return (
    <section className="card">
      <h2>Categorias</h2>
      <form onSubmit={create} className="row gap" style={{ marginBottom: '0.75rem' }}>
        <input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={!name.trim() || creating}>
          {creating ? 'Adicionando…' : 'Adicionar'}
        </button>
      </form>
      <ul className="list">
        {cats.map((c) => (
          <li key={c.id}>
            {editId === c.id ? (
              <div className="row space-between">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} />
                <div className="row gap-sm">
                  <button onClick={saveEdit} disabled={!editName.trim() || saving}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button className="link" onClick={() => setEditId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row space-between">
                <span>{c.name}</span>
                <div className="row gap-sm">
                  <button className="link-btn" onClick={() => { setEditId(c.id); setEditName(c.name); }}>editar</button>
                  <button
                    className="link-btn danger"
                    onClick={() => ctx.act(() => api.deleteCategory(c.id), 'Excluída', `cat-${c.id}`)}
                    disabled={ctx.pending === `cat-${c.id}`}
                  >
                    {ctx.pending === `cat-${c.id}` ? 'excluindo…' : 'excluir'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
