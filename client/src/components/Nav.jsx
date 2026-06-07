import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Nav() {
  const { me, logout } = useAuth();
  const { pathname } = useLocation();
  // "/" redirects, so highlight Início across the whole season/movie flow.
  const homeActive = pathname === '/' || pathname.startsWith('/seasons') || pathname.startsWith('/movies');
  const adminActive = pathname.startsWith('/admin');

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand">Clube do Filme</Link>
          {me && (
            <>
              {/* Desktop: inline links. Hidden on mobile, replaced by the bottom bar. */}
              <nav className="nav-desktop">
                <Link to="/" className={homeActive ? 'active' : ''}>Início</Link>
                {me.is_admin && <Link to="/admin" className={adminActive ? 'active' : ''}>Admin</Link>}
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

      {me && (
        <BottomNav
          isAdmin={me.is_admin}
          logout={logout}
          homeActive={homeActive}
          adminActive={adminActive}
        />
      )}
    </>
  );
}

function BottomNav({ isAdmin, logout, homeActive, adminActive }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <Link to="/" className={`bottom-nav-item ${homeActive ? 'active' : ''}`}>
        <IconHome />
        <span>Início</span>
      </Link>
      {isAdmin && (
        <Link to="/admin" className={`bottom-nav-item ${adminActive ? 'active' : ''}`}>
          <IconAdmin />
          <span>Admin</span>
        </Link>
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

function IconHome() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 20v-6h5v6" />
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
