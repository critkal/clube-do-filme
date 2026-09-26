import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ConfirmButton from '../components/ConfirmButton.jsx';

const TABS = [
  { key: 'members', label: 'Membros' },
  { key: 'seasons', label: 'Temporadas' },
  { key: 'movies', label: 'Filmes' },
  { key: 'categories', label: 'Categorias' },
];

const ERRORS = {
  member_exists: 'Já existe um membro com esse nome.',
  first_name_required: 'Informe o nome.',
  cannot_delete_self: 'Você não pode remover a si mesmo.',
  member_has_movies: 'Esse membro tem filmes ou avaliações em temporadas encerradas e não pode ser removido.',
  member_not_admin: 'Só admins podem ter senha.',
  password_too_short: 'A senha deve ter pelo menos 6 caracteres.',
  active_season_exists: 'Já existe uma temporada ativa. Encerre-a antes de criar outra.',
  no_members: 'Cadastre membros antes de criar uma temporada.',
  season_still_active: 'Encerre a temporada antes de apresentá-la.',
  category_exists: 'Já existe uma categoria com esse nome.',
  name_required: 'Informe o nome.',
  nothing_to_update: 'Nada para salvar.',
  not_found: 'Item não encontrado. Recarregue a página.',
};

const errorText = (e) => ERRORS[e.message] || `Erro: ${e.message}`;

export default function Admin() {
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cats, setCats] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(null);

  const load = async () => {
    const [m, s, mv, c] = await Promise.all([
      api.members(), api.seasons(), api.allMovies(), api.categories(),
    ]);
    setMembers(m); setSeasons(s); setMovies(mv); setCats(c);
    setLoaded(true);
  };

  useEffect(() => { load().catch((e) => setLoadErr(e.message)); }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const fail = (e) => { setMsg(''); setErr(errorText(e)); };

  // Returns whether the action succeeded so forms only clear on success.
  const act = async (fn, successMsg = 'Salvo', id = null) => {
    setErr(''); setMsg('');
    if (id !== null) setPending(id);
    try {
      const r = await fn();
      if (r === false) return false;
      await load();
      setMsg(successMsg);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setPending(null);
    }
  };

  const ctx = { act, fail, setErr, setMsg, load, pending };
  const counts = { members: members.length, seasons: seasons.length, movies: movies.length, categories: cats.length };

  const selectTab = (key) => { setTab(key); setErr(''); setMsg(''); };

  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.key === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    selectTab(TABS[next].key);
    document.getElementById(`admin-tab-${TABS[next].key}`)?.focus();
  };

  if (loadErr) return <p className="error" role="alert">Erro ao carregar o painel: {loadErr}</p>;

  return (
    <div className="stack admin">
      <header className="admin-header">
        <h1>Admin</h1>
        <p className="muted">Gerencie membros, temporadas, filmes e categorias do clube.</p>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Seções do painel" onKeyDown={onTabKey}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            id={`admin-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls="admin-panel"
            tabIndex={tab === key ? 0 : -1}
            className={`admin-tab${tab === key ? ' active' : ''}`}
            onClick={() => selectTab(key)}
          >
            {label}
            {loaded && <span className="admin-tab-count">{counts[key]}</span>}
          </button>
        ))}
      </div>

      <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        {!loaded ? (
          <p className="loading">Carregando…</p>
        ) : (
          <>
            {tab === 'members' && <MembersSection members={members} ctx={ctx} />}
            {tab === 'seasons' && <SeasonsSection seasons={seasons} members={members} ctx={ctx} />}
            {tab === 'movies' && <MoviesSection movies={movies} seasons={seasons} ctx={ctx} />}
            {tab === 'categories' && <CategoriesSection cats={cats} ctx={ctx} />}
          </>
        )}
      </div>

      <div className="admin-toast-region">
        {err && (
          <div className="admin-toast error" role="alert">
            <span>{err}</span>
            <button type="button" className="icon-btn" aria-label="Fechar aviso" onClick={() => setErr('')}>×</button>
          </div>
        )}
        <div role="status" aria-live="polite">
          {msg && <div className="admin-toast ok">✓ {msg}</div>}
        </div>
      </div>
    </div>
  );
}

function SectionHead({ id, title, count, noun }) {
  return (
    <div className="admin-section-head">
      <h2 id={id}>{title}</h2>
      <span className="muted">{count} {noun}</span>
    </div>
  );
}

function cancelOnEscape(onCancel) {
  return (e) => { if (e.key === 'Escape') onCancel(); };
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

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await ctx.act(() => api.createMember(name.trim(), isAdmin), 'Membro criado', 'creating-member');
    if (ok) { setName(''); setIsAdmin(false); }
  };

  const startEdit = (m) => {
    setPwdId(null);
    setEditId(m.id); setEditName(m.first_name); setEditIsAdmin(!!m.is_admin);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateMember(editId, { first_name: editName.trim(), is_admin: editIsAdmin });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Membro atualizado');
    } catch (e) {
      ctx.fail(e);
    } finally {
      setSaving(false);
    }
  };

  const creating = ctx.pending === 'creating-member';

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwdValue.trim().length < 6) return;
    ctx.setErr(''); ctx.setMsg('');
    setPwdSaving(true);
    try {
      await api.setAdminPassword(pwdId, pwdValue.trim());
      setPwdId(null); setPwdValue('');
      ctx.setMsg('Senha definida');
    } catch (e) {
      ctx.fail(e);
    } finally {
      setPwdSaving(false);
    }
  };

  const closePwd = () => { setPwdId(null); setPwdValue(''); };

  return (
    <section className="card admin-section" aria-labelledby="admin-members-title">
      <SectionHead id="admin-members-title" title="Membros" count={members.length} noun={members.length === 1 ? 'membro' : 'membros'} />

      <form onSubmit={create} className="admin-create">
        <label className="admin-field grow">
          Novo membro
          <input placeholder="Primeiro nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Admin
        </label>
        <button type="submit" className="primary" disabled={!name.trim() || creating}>
          {creating ? 'Adicionando…' : 'Adicionar'}
        </button>
      </form>

      {members.length === 0 ? (
        <p className="admin-empty">Nenhum membro cadastrado ainda.</p>
      ) : (
        <ul className="admin-list">
          {members.map((m) => (
            <li key={m.id} className="admin-item">
              {editId === m.id ? (
                <form className="admin-edit" onSubmit={saveEdit} onKeyDown={cancelOnEscape(() => setEditId(null))}>
                  <input
                    aria-label={`Nome de ${m.first_name}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <label className="admin-check">
                    <input type="checkbox" checked={editIsAdmin} onChange={(e) => setEditIsAdmin(e.target.checked)} />
                    Admin
                  </label>
                  <div className="admin-actions">
                    <button type="submit" className="primary" disabled={!editName.trim() || saving}>
                      {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="admin-item-main">
                    <span className="admin-item-title">
                      {m.first_name}
                      {m.is_admin && <span className="badge">admin</span>}
                    </span>
                    {m.is_admin && (
                      <span className="admin-item-meta">{m.has_password ? 'Com senha' : 'Sem senha'}</span>
                    )}
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="link-btn" onClick={() => startEdit(m)}>Editar</button>
                    {m.is_admin && (
                      <button
                        type="button"
                        className={`link-btn${pwdId === m.id ? ' open' : ''}`}
                        aria-expanded={pwdId === m.id}
                        onClick={() => { setPwdValue(''); setPwdId(pwdId === m.id ? null : m.id); }}
                      >
                        Senha
                      </button>
                    )}
                    <ConfirmButton
                      className="link-btn danger"
                      question={`Remover ${m.first_name}?`}
                      busy={ctx.pending === `member-${m.id}`}
                      busyLabel="Removendo…"
                      onConfirm={() => ctx.act(() => api.deleteMember(m.id), 'Membro removido', `member-${m.id}`)}
                    >
                      Remover
                    </ConfirmButton>
                  </div>
                  {pwdId === m.id && (
                    <form className="admin-subpanel admin-edit" onSubmit={savePassword} onKeyDown={cancelOnEscape(closePwd)}>
                      <label className="admin-field grow">
                        Nova senha de {m.first_name}
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Mínimo de 6 caracteres"
                          value={pwdValue}
                          onChange={(e) => setPwdValue(e.target.value)}
                          autoFocus
                        />
                      </label>
                      <div className="admin-actions">
                        <button type="submit" className="primary" disabled={pwdValue.trim().length < 6 || pwdSaving}>
                          {pwdSaving ? 'Salvando…' : 'Definir senha'}
                        </button>
                        <button type="button" onClick={closePwd}>Cancelar</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
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

  const create = async (e) => {
    e.preventDefault();
    const ok = await ctx.act(
      () => api.createSeason(name.trim() || null, hostId ? Number(hostId) : undefined),
      'Temporada criada',
      'creating-season',
    );
    if (ok) { setName(''); setHostId(''); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateSeason(editId, { name: editName.trim() || null });
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Temporada atualizada');
    } catch (e) {
      ctx.fail(e);
    } finally {
      setSaving(false);
    }
  };

  const creating = ctx.pending === 'creating-season';

  return (
    <section className="card admin-section" aria-labelledby="admin-seasons-title">
      <SectionHead id="admin-seasons-title" title="Temporadas" count={seasons.length} noun={seasons.length === 1 ? 'temporada' : 'temporadas'} />

      <form onSubmit={create} className="admin-create">
        <label className="admin-field grow">
          Nome
          <input placeholder="Opcional" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="admin-field grow">
          Host
          <select value={hostId} onChange={(e) => setHostId(e.target.value)}>
            <option value="">Você (padrão)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary" disabled={creating}>
          {creating ? 'Criando…' : 'Criar temporada'}
        </button>
      </form>

      {seasons.length === 0 ? (
        <p className="admin-empty">Nenhuma temporada ainda. Crie a primeira acima.</p>
      ) : (
        <ul className="admin-list">
          {seasons.map((s) => {
            const queueOpen = orderSeasonId === s.id && editId !== s.id;
            const host = s.host_id && (members.find((m) => m.id === s.host_id)?.first_name || `#${s.host_id}`);
            return (
              <li key={s.id} className="admin-item">
                {editId === s.id ? (
                  <form className="admin-edit" onSubmit={saveEdit} onKeyDown={cancelOnEscape(() => setEditId(null))}>
                    <input
                      aria-label="Nome da temporada"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={`Temporada #${s.id}`}
                      autoFocus
                    />
                    <div className="admin-actions">
                      <button type="submit" className="primary" disabled={saving}>
                        {saving ? 'Salvando…' : 'Salvar'}
                      </button>
                      <button type="button" onClick={() => setEditId(null)}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="admin-item-main">
                      <span className="admin-item-title">
                        {s.name || `Temporada #${s.id}`}
                        <SeasonStatusPill status={s.status} />
                      </span>
                      <span className="admin-item-meta">
                        {s.movies_added}/{s.rounds} filmes
                        {host && ` · host: ${host}`}
                      </span>
                    </div>
                    <div className="admin-actions">
                      {s.status === 'active' && (
                        <ConfirmButton
                          className="btn"
                          question="Encerrar a temporada?" tone="primary"
                          busy={ctx.pending === `complete-${s.id}`}
                          busyLabel="Encerrando…"
                          onConfirm={() => ctx.act(() => api.completeSeason(s.id), 'Temporada encerrada', `complete-${s.id}`)}
                        >
                          Encerrar
                        </ConfirmButton>
                      )}
                      {s.status === 'completed' && (
                        <ConfirmButton
                          className="btn primary"
                          question="Revelar notas e resultados para todos?" tone="primary"
                          busy={ctx.pending === `present-${s.id}`}
                          busyLabel="Publicando…"
                          onConfirm={() => ctx.act(() => api.presentSeason(s.id), 'Temporada apresentada!', `present-${s.id}`)}
                        >
                          🎬 Apresentar
                        </ConfirmButton>
                      )}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => { setOrderSeasonId(null); setEditId(s.id); setEditName(s.name || ''); }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`link-btn${queueOpen ? ' open' : ''}`}
                        aria-expanded={queueOpen}
                        aria-controls={`admin-queue-${s.id}`}
                        onClick={() => setOrderSeasonId(queueOpen ? null : s.id)}
                      >
                        Fila
                      </button>
                      <ConfirmButton
                        className="link-btn danger"
                        question="Excluir? Remove filmes, avaliações e votos."
                        busy={ctx.pending === `season-${s.id}`}
                        busyLabel="Excluindo…"
                        onConfirm={() => ctx.act(() => api.deleteSeason(s.id), 'Temporada excluída', `season-${s.id}`)}
                      >
                        Excluir
                      </ConfirmButton>
                    </div>
                  </>
                )}
                {queueOpen && (
                  <SeasonMemberOrder
                    seasonId={s.id}
                    ctx={ctx}
                    onClose={() => setOrderSeasonId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SeasonMemberOrder({ seasonId, ctx, onClose }) {
  const [members, setMembers] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.seasonMembers(seasonId).then(setMembers).catch((e) => { setMembers([]); ctx.fail(e); });
  }, [seasonId]);

  const move = (index, dir) => {
    const next = [...members];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setMembers(next.map((m, i) => ({ ...m, roundOrder: i + 1 })));
    setDirty(true);
  };

  const save = async () => {
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateMemberOrder(seasonId, members.map((m) => ({ memberId: m.memberId, roundOrder: m.roundOrder })));
      setDirty(false);
      ctx.setMsg('Ordem salva');
    } catch (e) {
      ctx.fail(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-subpanel" id={`admin-queue-${seasonId}`}>
      <div className="admin-subpanel-head">
        <h3>Fila de apresentações</h3>
        <button type="button" className="link-btn" onClick={onClose}>Fechar</button>
      </div>
      {members === null ? (
        <p className="loading">Carregando…</p>
      ) : members.length === 0 ? (
        <p className="admin-empty">Nenhum membro na fila.</p>
      ) : (
        <>
          <ol className="admin-queue">
            {members.map((m, i) => (
              <li key={m.memberId} className={m.hasPresented ? 'done' : ''}>
                <span className="admin-queue-pos">{i + 1}.</span>
                <span className="admin-queue-name">{m.name}</span>
                {m.hasPresented && <span className="admin-queue-done">✓ apresentou</span>}
                <span className="admin-queue-moves">
                  <button type="button" className="icon-btn" aria-label={`Mover ${m.name} para cima`} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="icon-btn" aria-label={`Mover ${m.name} para baixo`} onClick={() => move(i, 1)} disabled={i === members.length - 1}>↓</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="admin-actions">
            <button type="button" onClick={save} disabled={!dirty || saving} className="primary">
              {saving ? 'Salvando…' : 'Salvar ordem'}
            </button>
            {dirty && <span className="muted">Alterações não salvas</span>}
          </div>
        </>
      )}
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

  if (movies.length === 0) {
    return (
      <section className="card admin-section">
        <p className="admin-empty">Nenhum filme cadastrado. Os filmes são adicionados pela página de cada temporada.</p>
      </section>
    );
  }

  return (
    <div className="stack">
      {seasonIds.map((sid) => {
        const s = seasons.find((x) => x.id === sid);
        const label = s?.name || `Temporada #${sid}`;
        const count = bySeason[sid].length;
        return (
          <section key={sid} className="card admin-section" aria-labelledby={`admin-movies-${sid}`}>
            <SectionHead id={`admin-movies-${sid}`} title={label} count={count} noun={count === 1 ? 'filme' : 'filmes'} />
            <ul className="admin-list">
              {bySeason[sid].map((m) => (
                <li key={m.id} className="admin-item">
                  <div className="admin-item-main">
                    <span className="admin-item-title">
                      {m.title}
                      {m.year && <span className="muted">({m.year})</span>}
                    </span>
                    <span className="admin-item-meta">
                      Rodada {m.round_number} · {m.presenter_name}
                      {m.director && ` · dir. ${m.director}`}
                    </span>
                  </div>
                  <div className="admin-actions">
                    <Link to={`/movies/${m.id}`} className="admin-link" aria-label={`Ver ${m.title}`}>Ver</Link>
                    <ConfirmButton
                      className="link-btn danger"
                      question={`Excluir "${m.title}"?`}
                      busy={ctx.pending === `movie-${m.id}`}
                      busyLabel="Excluindo…"
                      onConfirm={() => ctx.act(() => api.deleteMovie(m.id), 'Filme excluído', `movie-${m.id}`)}
                    >
                      Excluir
                    </ConfirmButton>
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

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await ctx.act(() => api.createCategory(name.trim()), 'Categoria criada', 'creating-cat');
    if (ok) setName('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    ctx.setErr(''); ctx.setMsg('');
    setSaving(true);
    try {
      await api.updateCategory(editId, editName.trim());
      await ctx.load();
      setEditId(null);
      ctx.setMsg('Categoria atualizada');
    } catch (e) {
      ctx.fail(e);
    } finally {
      setSaving(false);
    }
  };

  const creating = ctx.pending === 'creating-cat';

  return (
    <section className="card admin-section" aria-labelledby="admin-cats-title">
      <SectionHead id="admin-cats-title" title="Categorias" count={cats.length} noun={cats.length === 1 ? 'categoria' : 'categorias'} />

      <form onSubmit={create} className="admin-create">
        <label className="admin-field grow">
          Nova categoria
          <input placeholder="Ex.: Melhor Fotografia" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <button type="submit" className="primary" disabled={!name.trim() || creating}>
          {creating ? 'Adicionando…' : 'Adicionar'}
        </button>
      </form>

      {cats.length === 0 ? (
        <p className="admin-empty">Nenhuma categoria cadastrada.</p>
      ) : (
        <ul className="admin-list">
          {cats.map((c) => (
            <li key={c.id} className="admin-item">
              {editId === c.id ? (
                <form className="admin-edit" onSubmit={saveEdit} onKeyDown={cancelOnEscape(() => setEditId(null))}>
                  <input
                    aria-label="Nome da categoria"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <div className="admin-actions">
                    <button type="submit" className="primary" disabled={!editName.trim() || saving}>
                      {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="admin-item-main">
                    <span className="admin-item-title">{c.name}</span>
                  </div>
                  <div className="admin-actions">
                    <button type="button" className="link-btn" onClick={() => { setEditId(c.id); setEditName(c.name); }}>Editar</button>
                    <ConfirmButton
                      className="link-btn danger"
                      question={`Excluir "${c.name}"?`}
                      busy={ctx.pending === `cat-${c.id}`}
                      busyLabel="Excluindo…"
                      onConfirm={() => ctx.act(() => api.deleteCategory(c.id), 'Categoria excluída', `cat-${c.id}`)}
                    >
                      Excluir
                    </ConfirmButton>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
