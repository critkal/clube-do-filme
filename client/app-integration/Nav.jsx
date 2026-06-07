import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Nav() {
  const { me, logout } = useAuth();
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Clube do Filme">
            <ClapMark size={26} />
            <span className="brand-text">Clube do <span className="brand-accent">Filme</span></span>
          </Link>
          {me && (
            <>
              {/* Desktop: inline links. Hidden on mobile, replaced by the bottom bar. */}
              <nav className="nav-desktop">
                <NavLink to="/" end>Temporadas</NavLink>
                {me.is_admin && <NavLink to="/admin">Admin</NavLink>}
                <span className="nav-divider" />
                <span className="nav-user">{me.first_name}</span>
                <span className="nav-divider" />
                <button className="link nav-logout" onClick={logout}>Sair</button>
              </nav>
              {/* Mobile: just show who is logged in. */}
              <span className="nav-user nav-user-mobile">{me.first_name}</span>
            </>
          )}
          {!me && (
            <nav className="nav-desktop">
              <NavLink to="/login">Entrar</NavLink>
            </nav>
          )}
        </div>
      </header>

      {me && <BottomNav isAdmin={me.is_admin} logout={logout} />}
    </>
  );
}

/* ── Brand mark: film clapperboard ──────────────────────── */
function ClapMark({ size = 26 }) {
  return (
    <svg className="brand-mark" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g transform="translate(50.9 49.3) rotate(-5)">
        <rect x="-32" y="-1" width="64" height="33" rx="5" fill="#f5b73d" />
        <rect x="-23" y="7" width="46" height="3.4" rx="1.7" fill="#181020" opacity="0.5" />
        <rect x="-23" y="16" width="34" height="3.4" rx="1.7" fill="#181020" opacity="0.5" />
        <g transform="translate(-32 -2) rotate(-13)">
          <g transform="translate(0 -14)">
            <defs>
              <clipPath id="cdfNavBar"><rect width="64" height="14" rx="3.1" /></clipPath>
            </defs>
            <rect width="64" height="14" rx="3.1" fill="#f5b73d" />
            <g clipPath="url(#cdfNavBar)" fill="#181020">
              <polygon points="1.28,14 6.61,14 13.61,0 8.28,0" />
              <polygon points="11.95,14 17.28,14 24.28,0 18.95,0" />
              <polygon points="22.61,14 27.95,14 34.95,0 29.61,0" />
              <polygon points="33.28,14 38.61,14 45.61,0 40.28,0" />
              <polygon points="43.95,14 49.28,14 56.28,0 50.95,0" />
              <polygon points="54.61,14 59.95,14 66.95,0 61.61,0" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

function BottomNav({ isAdmin, logout }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink to="/" end className="bottom-nav-item">
        <IconSeasons />
        <span>Temporadas</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className="bottom-nav-item">
          <IconAdmin />
          <span>Admin</span>
        </NavLink>
      )}
      <button type="button" className="bottom-nav-item" onClick={logout}>
        <IconLogout />
        <span>Sair</span>
      </button>
    </nav>
  );
}

/* ── Icons (stroke uses currentColor) ───────────────────── */
const iconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

function IconSeasons() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v5M16 4v5M8 20v-5M16 20v-5" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
