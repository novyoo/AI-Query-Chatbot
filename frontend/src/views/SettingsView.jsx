import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { api, apiErrorMessage } from '../lib/api';

export default function SettingsView() {
  const { user, logout } = useAuth();
  const { projects, refresh } = useProjects();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function deleteProject(id) {
    if (!confirm('This permanently deletes the database and all its data. Continue?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.delete(`/projects/${id}`);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex-1 px-10 py-8 max-w-2xl mx-auto w-full">
      <h2 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-burgundy)] mb-7">Settings</h2>

      <div className="bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-2xl p-6 mb-6 shadow-sm">
        <p className="text-sm text-[var(--color-ink-soft)] mb-1">Account</p>
        <p className="text-xl font-medium">{user?.name}</p>
        <p className="text-lg text-[var(--color-ink-soft)]">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-4 text-sm text-[var(--color-brand)] border border-[var(--color-brand)] rounded-full px-5 py-2 hover:bg-[var(--color-brand)] hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">Manage databases</p>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-base">
              <span>{p.name}</span>
              <button
                disabled={busyId === p.id}
                onClick={() => deleteProject(p.id)}
                className="text-sm text-[var(--color-brand)] hover:underline disabled:opacity-50"
              >
                {busyId === p.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
          {projects.length === 0 && <p className="text-[var(--color-ink-soft)] text-sm">Nothing here yet.</p>}
        </div>
      </div>
    </div>
  );
}
