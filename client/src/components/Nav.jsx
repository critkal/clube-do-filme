import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Nav() {
  const { me, logout } = useAuth();
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">Clube do Filme</Link>
        <nav>
          {me && (
            <>
              <NavLink to="/" end>Temporadas</NavLink>
              {me.is_admin && <NavLink to="/admin">Admin</NavLink>}
              <span className="nav-divider" />
              <span className="nav-user">{me.first_name}</span>
              <button className="link nav-logout" onClick={logout}>Sair</button>
            </>
          )}
          {!me && <NavLink to="/login">Entrar</NavLink>}
        </nav>
      </div>
    </header>
  );
}
