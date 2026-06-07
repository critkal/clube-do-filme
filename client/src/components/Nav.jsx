import { useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
          <Link to="/" className="brand" aria-label="Clube do Filme">
            <ClapMark size={26} />
            <span className="brand-text">Clube do <span className="brand-accent">Filme</span></span>
          </Link>
          {/* Navigation lives in the sidebar (desktop) / bottom bar (mobile).
              The header only carries the brand + who is logged in. */}
          {me && <span className="nav-user nav-user-mobile">{me.first_name}</span>}
        </div>
      </header>

      {me && (
        <aside className="sidebar">
          <Link to="/" className="brand sidebar-brand" aria-label="Clube do Filme">
            <ClapMark size={30} />
            <span className="brand-text">Clube do <span className="brand-accent">Filme</span></span>
          </Link>
          <nav className="sidebar-nav" aria-label="Navegação principal">
            <Link to="/" className={`sidebar-item ${homeActive ? 'active' : ''}`}>
              <IconHome /><span>Início</span>
            </Link>
            {me.is_admin && (
              <Link to="/admin" className={`sidebar-item ${adminActive ? 'active' : ''}`}>
                <IconAdmin /><span>Admin</span>
              </Link>
            )}
          </nav>
          <div className="sidebar-footer">
            <span className="nav-user">{me.first_name}</span>
            <button type="button" className="sidebar-item sidebar-logout" onClick={logout}>
              <IconLogout /><span>Sair</span>
            </button>
          </div>
        </aside>
      )}

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

/* ── Brand mark: film clapperboard ──────────────────────── */
function ClapMark({ size = 26 }) {
  const clipId = useId();
  return (
    <svg className="brand-mark" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g transform="translate(50.9 49.3) rotate(-5)">
        <rect x="-32" y="-1" width="64" height="33" rx="5" fill="#f5b73d" />
        <rect x="-23" y="7" width="46" height="3.4" rx="1.7" fill="#181020" opacity="0.5" />
        <rect x="-23" y="16" width="34" height="3.4" rx="1.7" fill="#181020" opacity="0.5" />
        <g transform="translate(-32 -2) rotate(-13)">
          <g transform="translate(0 -14)">
            <defs>
              <clipPath id={clipId}><rect width="64" height="14" rx="3.1" /></clipPath>
            </defs>
            <rect width="64" height="14" rx="3.1" fill="#f5b73d" />
            <g clipPath={`url(#${clipId})`} fill="#181020">
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
