import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-[var(--font-display)] font-bold text-5xl leading-tight text-[var(--color-burgundy)] text-center mb-4">
          AI Query
          <br />
          Chatbot
        </h1>
        <h2 className="font-[var(--font-display)] text-3xl text-center text-[var(--color-ink)] mb-8">Log in</h2>
        <form onSubmit={onSubmit} className="bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-2xl p-8 space-y-6 shadow-sm">
          <div>
            <label className="text-base text-[var(--color-ink-soft)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-white border border-[var(--color-border-soft)] rounded-lg px-4 py-3.5 text-lg outline-none focus:border-[var(--color-brand)]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-base text-[var(--color-ink-soft)]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-white border border-[var(--color-border-soft)] rounded-lg px-4 py-3.5 text-lg outline-none focus:border-[var(--color-brand)]"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-base">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white font-medium rounded-full py-3.5 text-lg disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-center text-[var(--color-ink-soft)] text-lg mt-6">
          No account?{' '}
          <Link to="/register" className="text-[var(--color-brand)] font-medium underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
