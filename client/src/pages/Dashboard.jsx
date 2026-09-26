import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const fmtAvg = (n) => (n == null ? '—' : n.toFixed(1).replace('.', ','));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const MESSAGES = {
  admin_only: 'Só administradores podem ver o dashboard.',
  season_not_found: 'Temporada não encontrada.',
};
const message = (code) => MESSAGES[code] || `Erro: ${code}`;

export default function Dashboard() {
  const [seasons, setSeasons] = useState(null);
  const [seasonId, setSeasonId] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [dataErr, setDataErr] = useState('');

  useEffect(() => {
    api.seasons()
      .then((list) => {
        setSeasons(list);
        // List comes newest first, so the fallback is the most recent season.
        const active = list.find((s) => s.status === 'active');
        const initial = active || list[0];
        if (initial) setSeasonId(String(initial.id));
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setData(null);
    setDataErr('');
    api.dashboard(seasonId).then(setData).catch((e) => setDataErr(e.message));
  }, [seasonId]);

  if (err) return <p className="error">{message(err)}</p>;
  if (seasons === null) return <p className="loading">Carregando…</p>;
  if (seasons.length === 0) return <p className="muted empty-state">Nenhuma temporada ainda.</p>;

  return (
    <div className="stack">
      <h1>Dashboard</h1>

      <label className="dash-season">
        Temporada
        <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `Temporada ${s.id}`}{s.status === 'active' ? ' (em andamento)' : ''}
            </option>
          ))}
        </select>
      </label>

      {dataErr ? (
        <p className="error" role="alert">{message(dataErr)}</p>
      ) : !data ? (
        <p className="loading">Carregando…</p>
      ) : (
        <SeasonStats data={data} />
      )}
    </div>
  );
}

function SeasonStats({ data }) {
  const { season, movies, members, distribution, most_active: top } = data;
  const progressPct = season.rounds ? Math.round((data.movies_watched / season.rounds) * 100) : 0;
  const maxScoreCount = Math.max(1, ...distribution.map((d) => d.count));
  const byAttendance = [...members].sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));
  const anyAttendance = members.some((m) => m.attended > 0);
  const avgAttendance = members.length
    ? Math.round(members.reduce((sum, m) => sum + m.attendance_pct, 0) / members.length)
    : 0;

  return (
    <>
      <div className="stat-grid">
        <div className="card stat-tile">
          <span className="stat-label">Progresso</span>
          <span className="stat-value">{data.movies_watched}/{season.rounds}</span>
          <div className="tally-bar-track" aria-hidden="true">
            <div className="tally-bar-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <span className="stat-note">filmes assistidos</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Média geral</span>
          <span className="stat-value">{fmtAvg(data.average_rating)}</span>
          <span className="stat-note">{plural(data.rating_count, 'nota', 'notas')}</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Mais ativo</span>
          <span className="stat-value">{top ? top.name : '—'}</span>
          {top && (
            <span className="stat-note">
              {plural(top.ratings_given, 'nota', 'notas')} · {plural(top.referrals_given, 'indicação', 'indicações')}
            </span>
          )}
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Presença média</span>
          <span className="stat-value">{anyAttendance ? `${avgAttendance}%` : '—'}</span>
          <span className="stat-note">{plural(data.movies_watched, 'sessão', 'sessões')}</span>
        </div>
      </div>

      <section className="card dash-card">
        <div className="dash-card-head">
          <h3>Distribuição de notas</h3>
          <span className="dash-card-hint">nº de notas</span>
        </div>
        {data.rating_count === 0 ? (
          <p className="muted empty-state">Nenhuma nota registrada.</p>
        ) : (
          <div className="dash-list">
            {[...distribution].reverse().map((d) => (
              <div key={d.score} className="tally-row">
                <span className="tally-label dist-label">{d.score}</span>
                <div className="tally-bar-track" aria-hidden="true">
                  <div className="tally-bar-fill" style={{ width: `${(d.count / maxScoreCount) * 100}%` }} />
                </div>
                <span className="tally-count">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card dash-card">
        <div className="dash-card-head">
          <h3>Média por filme</h3>
          <span className="dash-card-hint">notas de 1 a 10</span>
        </div>
        {movies.length === 0 ? (
          <p className="muted empty-state">Nenhum filme ainda.</p>
        ) : (
          <div className="dash-list dash-list-ruled">
            {movies.map((m) => (
              <div key={m.id} className="tally-row">
                <span className="tally-label">
                  <Link to={`/movies/${m.id}`} title={m.title}>
                    {m.round_number ? `${m.round_number}. ` : ''}{m.title}
                  </Link>
                  <span className="dash-sub">
                    {m.presenter_name && `${m.presenter_name} · `}{plural(m.rating_count, 'nota', 'notas')}
                  </span>
                </span>
                <div className="tally-bar-track" aria-hidden="true">
                  <div className="tally-bar-fill" style={{ width: `${((m.average_rating || 0) / 10) * 100}%` }} />
                </div>
                <span className="tally-count dash-value">{fmtAvg(m.average_rating)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card dash-card">
        <div className="dash-card-head">
          <h3>Frequência</h3>
          <span className="dash-card-hint">{plural(data.movies_watched, 'sessão', 'sessões')}</span>
        </div>
        {!anyAttendance ? (
          <p className="muted empty-state">Nenhuma presença registrada.</p>
        ) : (
          <div className="dash-list dash-list-ruled">
            {byAttendance.map((m, i) => (
              <div key={m.member_id} className="tally-row">
                <span className="tally-label">
                  {i + 1}. {m.name}
                  <span className="dash-sub">{m.attended} de {data.movies_watched}</span>
                </span>
                <div className="tally-bar-track" aria-hidden="true">
                  <div className="tally-bar-fill" style={{ width: `${m.attendance_pct}%` }} />
                </div>
                <span className="tally-count dash-value">{m.attendance_pct}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
