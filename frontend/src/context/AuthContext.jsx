import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
