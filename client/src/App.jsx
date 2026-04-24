import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { api } from './api.js';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Season from './pages/Season.jsx';
import Movie from './pages/Movie.jsx';
import Admin from './pages/Admin.jsx';
import FinalVoting from './pages/FinalVoting.jsx';
import Results from './pages/Results.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.me();
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  if (loading) return <div className="container"><p>Carregando…</p></div>;

  const logout = async () => {
    try { await api.logout(); } catch {}
    setMe(null);
  };

  return (
    <AuthCtx.Provider value={{ me, setMe, refreshMe, logout }}>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/login" element={me ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protected me={me}><Home /></Protected>} />
          <Route path="/seasons/:id" element={<Protected me={me}><Season /></Protected>} />
          <Route path="/seasons/:id/final-voting" element={<Protected me={me}><FinalVoting /></Protected>} />
          <Route path="/seasons/:id/results" element={<Protected me={me}><Results /></Protected>} />
          <Route path="/movies/:id" element={<Protected me={me}><Movie /></Protected>} />
          <Route path="/admin" element={<Protected me={me} admin><Admin /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </AuthCtx.Provider>
  );
}

function Protected({ me, admin, children }) {
  if (!me) return <Navigate to="/login" replace />;
  if (admin && !me.is_admin) return <p>Acesso restrito a administradores.</p>;
  return children;
}

function NotFound() {
  return (
    <div>
      <h2>Página não encontrada</h2>
      <Link to="/">Voltar</Link>
    </div>
  );
}
