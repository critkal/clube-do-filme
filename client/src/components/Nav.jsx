import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Nav() {
  const { me, logout } = useAuth();
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">Clube do Filme</Link>
        <nav>
          {me && (
            <>
              <NavLink to="/" end>Temporadas</NavLink>
              {me.is_admin && <NavLink to="/admin">Admin</NavLink>}
              <span className="nav-user">Olá, {me.first_name}</span>
              <button className="link" onClick={logout}>Sair</button>
            </>
          )}
          {!me && <NavLink to="/login">Entrar</NavLink>}
        </nav>
      </div>
    </header>
  );
}
