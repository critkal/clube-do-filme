import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';

export default function Movie() {
  const { id } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [m, mems] = await Promise.all([api.movie(id), me.is_admin ? api.members() : []]);
      setMovie(m);
      setMembers(mems);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => { load(); }, [id]);

  if (err) return <p className="error">Erro: {err}</p>;
  if (!movie) return <p className="loading">Carregando…</p>;

  const isPresenter = movie.presenter_id === me.id;
  const isHost = movie.season_host_id != null && movie.season_host_id === me.id;

  async function adminDelete() {
    setDeleting(true);
    try {
      await api.deleteMovie(movie.id);
      navigate(`/seasons/${movie.season_id}`);
    } catch (e) {
      setErr(e.message);
      setDeleting(false);
    }
  }

  return (
    <div className="stack">
      <Link to={`/seasons/${movie.season_id}`} className="back-link">← Temporada</Link>

      {/* Cinematic hero */}
      <div className="movie-hero card">
        {movie.poster_url && (
          <div
            className="movie-hero-bg"
            style={{ backgroundImage: `url(${movie.poster_url})` }}
          />
        )}
        <div className="movie-hero-content">
          <div className="movie-hero-poster">
            <MoviePoster src={movie.poster_url} alt={movie.title} size="lg" />
          </div>
          <div className="movie-hero-info">
            <h1 style={{ marginBottom: '0.25rem' }}>
              {movie.title}
              {movie.year && (
                <span className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}> ({movie.year})</span>
              )}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.75rem', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
              {movie.director && (
                <span><span className="muted">dir. </span><strong style={{ color: 'var(--text)', fontWeight: 600 }}>{movie.director}</strong></span>
              )}
              {movie.genre && <span className="muted">{movie.genre}</span>}
              {movie.runtime && <span className="muted">{movie.runtime} min</span>}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.7 }}>
              Apresentado por <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{movie.presenter_name}</strong>
              {' · '}Rodada {movie.round_number}
              {movie.event_date && ` · ${movie.event_date}`}
            </p>

            {movie.ratings_visible && movie.rating_count > 0 && (
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  lineHeight: 1,
                }}>
                  {movie.average_rating.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--amber)', opacity: 0.65 }}>/10</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  · {movie.rating_count} voto{movie.rating_count > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {!movie.ratings_visible && (
              <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                🔒 Notas reveladas na apresentação final
              </p>
            )}

            {/* Vote button inside the hero */}
            {!isPresenter && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/movies/${id}/vote`}
                  className={`btn ${movie.your_score ? '' : 'primary'}`}
                >
                  {movie.your_score ? 'Editar avaliação' : 'Avaliar'}
                </Link>
                {movie.your_score && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Sua nota: <strong style={{ color: 'var(--amber)' }}>{movie.your_score}/10</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {movie.synopsis && (
        <div className="card" style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--muted)' }}>
          {movie.synopsis}
        </div>
      )}

      {/* Host-only: vote comments from members */}
      {isHost && movie.vote_comments && movie.vote_comments.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Comentários dos membros</h3>
          {movie.vote_comments.map((vc, i) => (
            <div key={i} style={{ marginBottom: '0.85rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                {vc.voter_name} — {vc.score}/10
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.55 }}>{vc.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral counts — read-only; managed through the vote form */}
      {movie.referrals.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.65rem' }}>Indicações</h3>
          <ul className="tags" style={{ margin: 0 }}>
            {movie.referrals.map((r) => (
              <li key={r.category_id} className="tag referral-tag">
                <span className="referral-tag-name">{r.category_name}</span>
                <span className="referral-tag-count">
                  {r.count} {r.count === 1 ? 'indicação' : 'indicações'}
                </span>
                {r.you_referred && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--amber)' }}>✓</span>
                )}
              </li>
            ))}
          </ul>
          {!isPresenter && (
            <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.8rem' }}>
              Gerencie suas indicações na{' '}
              <Link to={`/movies/${id}/vote`} style={{ color: 'var(--amber)' }}>
                página de avaliação
              </Link>.
            </p>
          )}
        </div>
      )}

      <AttendanceCard movie={movie} me={me} members={members} onChange={load} />

      {me.is_admin && (
        <ConfirmButton
          className="btn danger"
          question={`Excluir "${movie.title}"?`}
          busy={deleting}
          busyLabel="Excluindo…"
          onConfirm={adminDelete}
        >
          Excluir filme
        </ConfirmButton>
      )}
    </div>
  );
}

function formatBR(iso, withTime) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function AttendanceCard({ movie, me, members, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const attendeeIds = new Set(movie.attendees.map((a) => a.member_id));
  const youAttended = attendeeIds.has(me.id);

  async function run(fn) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await onChange();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const toggleSelf = () => run(() =>
    youAttended ? api.unmarkAttendance(movie.id) : api.markAttendance(movie.id));

  const toggleMember = (memberId) => run(() =>
    attendeeIds.has(memberId)
      ? api.unmarkAttendance(movie.id, memberId)
      : api.markAttendance(movie.id, memberId));

  const saveDate = (value) => run(() => {
    const fd = new FormData();
    fd.append('event_date', value);
    return api.updateMovie(movie.id, fd);
  });

  let windowNote;
  if (!movie.attendance_opens_at) {
    windowNote = 'Presença abre na data da sessão, que ainda não foi definida.';
  } else if (movie.attendance_open) {
    windowNote = `Aberta até ${formatBR(movie.attendance_closes_at, true)}.`;
  } else if (Date.now() < new Date(movie.attendance_opens_at).getTime()) {
    windowNote = `Presença abre em ${formatBR(movie.attendance_opens_at)}.`;
  } else {
    windowNote = 'Registro de presença encerrado.';
  }

  return (
    <div className="card">
      <div className="row space-between" style={{ marginBottom: '0.65rem' }}>
        <h3 style={{ margin: 0 }}>Presença</h3>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {movie.attendees.length} {movie.attendees.length === 1 ? 'presente' : 'presentes'}
        </span>
      </div>

      {movie.attendees.length > 0 ? (
        <ul className="tags">
          {movie.attendees.map((a) => (
            <li key={a.member_id} className="tag referral-tag">{a.first_name}</li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Ninguém marcou presença ainda.
        </p>
      )}

      <div className="row wrap gap">
        {movie.attendance_open && (
          <button
            type="button"
            className={`btn ${youAttended ? '' : 'primary'}`}
            disabled={busy}
            onClick={toggleSelf}
          >
            {youAttended ? 'Desmarcar presença' : 'Marcar presença'}
          </button>
        )}
        <span className="muted" style={{ fontSize: '0.8rem' }}>{windowNote}</span>
      </div>

      {me.is_admin && (
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
          <p className="form-label">Admin</p>
          <label style={{ marginBottom: '0.75rem' }}>
            Data da sessão
            <input
              type="date"
              value={movie.event_date ? movie.event_date.slice(0, 10) : ''}
              disabled={busy}
              onChange={(e) => saveDate(e.target.value)}
            />
          </label>
          <div className="cat-checklist">
            {members.map((m) => {
              const checked = attendeeIds.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`cat-chip ${checked ? 'checked' : ''}`}
                  disabled={busy}
                  onClick={() => toggleMember(m.id)}
                  aria-pressed={checked}
                >
                  {checked ? '✓ ' : ''}{m.first_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {err && <p className="error" style={{ margin: '0.75rem 0 0' }}>Erro: {err}</p>}
    </div>
  );
}
