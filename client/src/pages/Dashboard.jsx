import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const fmtAvg = (n) => (n == null ? '—' : n.toFixed(1).replace('.', ','));

export default function Dashboard() {
  const [seasons, setSeasons] = useState(null);
  const [seasonId, setSeasonId] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

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
    api.dashboard(seasonId).then(setData).catch((e) => setErr(e.message));
  }, [seasonId]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (seasons === null) return <p className="loading">Carregando…</p>;
  if (seasons.length === 0) return <p className="muted">Nenhuma temporada ainda.</p>;

  return (
    <div className="stack">
      <h1>Dashboard</h1>

      <label>
        Temporada
        <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `Temporada ${s.id}`}{s.status === 'active' ? ' (em andamento)' : ''}
            </option>
          ))}
        </select>
      </label>

      {!data ? <p className="loading">Carregando…</p> : <SeasonStats data={data} />}
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
          <div className="tally-bar-track">
            <div className="tally-bar-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <span className="muted">filmes assistidos</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Média geral</span>
          <span className="stat-value">{fmtAvg(data.average_rating)}</span>
          <span className="muted">{data.rating_count} nota{data.rating_count === 1 ? '' : 's'}</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Mais ativo</span>
          <span className="stat-value">{top ? top.name : '—'}</span>
          {top && (
            <span className="muted">
              {top.ratings_given} nota{top.ratings_given === 1 ? '' : 's'} · {top.referrals_given} indicaç{top.referrals_given === 1 ? 'ão' : 'ões'}
            </span>
          )}
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Presença média</span>
          <span className="stat-value">{anyAttendance ? `${avgAttendance}%` : '—'}</span>
          <span className="muted">{data.movies_watched} sess{data.movies_watched === 1 ? 'ão' : 'ões'}</span>
        </div>
      </div>

      <div className="card stack" style={{ gap: '0.5rem' }}>
        <h3>Distribuição de notas</h3>
        {data.rating_count === 0 ? (
          <p className="muted">Nenhuma nota registrada.</p>
        ) : (
          <div>
            {[...distribution].reverse().map((d) => (
              <div key={d.score} className="tally-row">
                <span className="tally-label dist-label">{d.score}</span>
                <div className="tally-bar-track">
                  <div className="tally-bar-fill" style={{ width: `${(d.count / maxScoreCount) * 100}%` }} />
                </div>
                <span className="tally-count">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack" style={{ gap: '0.5rem' }}>
        <h3>Média por filme</h3>
        {movies.length === 0 ? (
          <p className="muted">Nenhum filme ainda.</p>
        ) : (
          <div>
            {movies.map((m) => (
              <div key={m.id} className="tally-row">
                <Link to={`/movies/${m.id}`} className="tally-label" title={m.title}>
                  {m.round_number ? `${m.round_number}. ` : ''}{m.title}
                  {m.presenter_name && <span className="muted"> · {m.presenter_name}</span>}
                </Link>
                <div className="tally-bar-track">
                  <div className="tally-bar-fill" style={{ width: `${((m.average_rating || 0) / 10) * 100}%` }} />
                </div>
                <span className="tally-count" title={`${m.rating_count} notas`}>{fmtAvg(m.average_rating)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack" style={{ gap: '0.5rem' }}>
        <h3>Frequência</h3>
        {!anyAttendance ? (
          <p className="muted">Nenhuma presença registrada.</p>
        ) : (
          <div>
            {byAttendance.map((m, i) => (
              <div key={m.member_id} className="tally-row">
                <span className="tally-label">{i + 1}. {m.name}</span>
                <div className="tally-bar-track">
                  <div className="tally-bar-fill" style={{ width: `${m.attendance_pct}%` }} />
                </div>
                <span className="tally-count" title={`${m.attended} de ${data.movies_watched} sessões`}>
                  {m.attendance_pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
