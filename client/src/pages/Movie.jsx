import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import MoviePoster from '../components/MoviePoster.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';

const MESSAGES = {
  not_found: 'Filme não encontrado.',
  movie_not_found: 'Filme não encontrado.',
  attendance_closed: 'O registro de presença não está aberto agora.',
  forbidden: 'Você só pode marcar a sua própria presença.',
  member_not_found: 'Membro não encontrado.',
  admin_only: 'Ação restrita a administradores.',
};
const message = (code) => MESSAGES[code] || `Erro: ${code}`;

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

  if (err) return <p className="error">{message(err)}</p>;
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
            <h1 className="movie-hero-title">
              {movie.title}
              {movie.year && <span className="movie-hero-year"> ({movie.year})</span>}
            </h1>
            {(movie.director || movie.genre || movie.runtime) && (
              <p className="movie-hero-meta">
                {movie.director && <span>dir. <strong>{movie.director}</strong></span>}
                {movie.genre && <span>{movie.genre}</span>}
                {movie.runtime && <span>{movie.runtime} min</span>}
              </p>
            )}
            <p className="movie-hero-credit">
              Apresentado por <strong>{movie.presenter_name}</strong>
              {' · '}Rodada {movie.round_number}
              {movie.event_date && ` · ${formatDay(movie.event_date)}`}
            </p>

            {movie.ratings_visible && movie.rating_count > 0 && (
              <p className="movie-hero-score">
                <span className="movie-hero-score-value">{movie.average_rating.toFixed(1).replace('.', ',')}</span>
                <span className="movie-hero-score-max">/10</span>
                <span className="muted">
                  média de {movie.rating_count} nota{movie.rating_count > 1 ? 's' : ''}
                </span>
              </p>
            )}
            {movie.ratings_visible && movie.rating_count === 0 && (
              <p className="movie-hero-note">Ninguém avaliou ainda.</p>
            )}
            {!movie.ratings_visible && (
              <p className="movie-hero-note">🔒 Notas reveladas na apresentação final</p>
            )}

            <div className="movie-hero-actions">
              {isPresenter ? (
                <span className="your-rating none">Você apresentou este filme</span>
              ) : (
                <>
                  <Link
                    to={`/movies/${id}/vote`}
                    className={`btn ${movie.your_score ? '' : 'primary'}`}
                  >
                    {movie.your_score ? 'Editar avaliação' : 'Avaliar filme'}
                  </Link>
                  {movie.your_score ? (
                    <span className="your-rating">Sua nota <strong>★ {movie.your_score}/10</strong></span>
                  ) : (
                    <span className="your-rating none">Você ainda não avaliou</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {movie.synopsis && (
        <div className="card">
          <h3 className="movie-card-title">Sinopse</h3>
          <p className="movie-synopsis">{movie.synopsis}</p>
        </div>
      )}

      {isHost && movie.vote_comments && movie.vote_comments.length > 0 && (
        <div className="card">
          <div className="movie-card-head">
            <h3 className="movie-card-title">Comentários dos membros</h3>
            <span className="movie-card-hint">Só o host vê</span>
          </div>
          <ul className="movie-comments">
            {movie.vote_comments.map((vc, i) => (
              <li key={i} className="movie-comment">
                <div className="movie-comment-head">
                  <strong>{vc.voter_name}</strong>
                  <span className="movie-comment-score">★ {vc.score}/10</span>
                </div>
                <p>{vc.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {movie.referrals.length > 0 && (
        <div className="card">
          <h3 className="movie-card-title">Indicações</h3>
          <ul className="tags">
            {movie.referrals.map((r) => (
              <li key={r.category_id} className="tag referral-tag">
                <span className="referral-tag-name">{r.category_name}</span>
                <span className="referral-tag-count">
                  {r.count} {r.count === 1 ? 'indicação' : 'indicações'}
                </span>
                {r.you_referred && (
                  <span className="movie-referral-mine" title="Você indicou" aria-label="Você indicou">✓</span>
                )}
              </li>
            ))}
          </ul>
          {!isPresenter && (
            <p className="muted movie-card-foot">
              Gerencie suas indicações na <Link to={`/movies/${id}/vote`}>página de avaliação</Link>.
            </p>
          )}
        </div>
      )}

      <AttendanceCard movie={movie} me={me} members={members} onChange={load} />

      {me.is_admin && (
        <div className="movie-admin-actions">
          <ConfirmButton
            className="btn danger"
            question={`Excluir "${movie.title}"?`}
            busy={deleting}
            busyLabel="Excluindo…"
            onConfirm={adminDelete}
          >
            Excluir filme
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}

// event_date is a calendar day (YYYY-MM-DD); going through Date would shift it by the UTC offset.
function formatDay(day) {
  return day.slice(0, 10).split('-').reverse().join('/');
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
  const count = movie.attendees.length;

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
    windowNote = `Presença aberta até ${formatBR(movie.attendance_closes_at, true)}.`;
  } else if (Date.now() < new Date(movie.attendance_opens_at).getTime()) {
    windowNote = `Presença abre em ${formatBR(movie.attendance_opens_at)}.`;
  } else {
    windowNote = 'Registro de presença encerrado.';
  }

  return (
    <div className="card" aria-busy={busy}>
      <div className="movie-card-head">
        <h3 className="movie-card-title">Presença</h3>
        <span className="movie-card-hint">
          {count} {count === 1 ? 'presente' : 'presentes'}
        </span>
      </div>

      {count > 0 ? (
        <ul className="tags">
          {movie.attendees.map((a) => (
            <li
              key={a.member_id}
              className={`tag referral-tag ${a.member_id === me.id ? 'attendee-you' : ''}`}
            >
              {a.first_name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted attendance-empty">Ninguém marcou presença ainda.</p>
      )}

      <div className="attendance-self">
        {movie.attendance_open && (
          <button
            type="button"
            className={`btn ${youAttended ? '' : 'primary'}`}
            disabled={busy}
            onClick={toggleSelf}
          >
            {youAttended ? 'Desmarcar minha presença' : 'Marcar presença'}
          </button>
        )}
        <span className={`attendance-window ${movie.attendance_open ? 'open' : ''}`}>{windowNote}</span>
      </div>

      {me.is_admin && (
        <div className="attendance-admin">
          <label className="attendance-date">
            Data da sessão
            <input
              type="date"
              value={movie.event_date ? movie.event_date.slice(0, 10) : ''}
              disabled={busy}
              onChange={(e) => saveDate(e.target.value)}
            />
          </label>
          <div>
            <p className="form-label">Marcar presença dos membros</p>
            <div className="cat-checklist attendance-checklist" role="group" aria-label="Presença dos membros">
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
        </div>
      )}

      {err && <p className="error attendance-error" role="alert">{message(err)}</p>}
    </div>
  );
}
