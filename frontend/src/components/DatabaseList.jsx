import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { api, apiErrorMessage } from '../lib/api';

const ENGINE_LABEL = { mysql: 'MySQL', mongodb: 'MongoDB' };

export default function DatabaseList({ viewPrefix = 'databases' }) {
  const { projects, loading, refresh } = useProjects();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function deleteProject(id, name) {
    if (!confirm(`Permanently delete "${name}" and all its data?`)) return;
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
    <div className="bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-3xl p-7 shadow-sm">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-4 px-4 py-3 text-base uppercase tracking-wide text-[var(--color-ink-soft)]">
        <div>Name</div>
        <div>Made on</div>
        <div>Date created</div>
        <div>No of tables</div>
        <div />
        <div />
      </div>

      {loading && <p className="text-[var(--color-ink-soft)] text-lg px-4 py-6">Loading…</p>}
      {!loading && projects.length === 0 && (
        <p className="text-[var(--color-ink-soft)] text-lg px-4 py-6">No databases yet — create your first one below.</p>
      )}
      {error && <p className="text-red-600 text-sm px-4">{error}</p>}

      <div className="space-y-3">
        {projects
          .filter((p) => p.setupStage === 'ready')
          .map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-4 items-center bg-[var(--color-cream-soft)] rounded-xl px-4 py-4"
            >
              <div className="font-semibold text-xl">{p.name}</div>
              <div className="text-[var(--color-ink-soft)] text-lg">{ENGINE_LABEL[p.engine]}</div>
              <div className="text-[var(--color-ink-soft)] text-lg">
                {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-[var(--color-ink-soft)] text-lg">{p.tableCount}</div>
              <button
                onClick={() => navigate(`/app/${viewPrefix}/${p.id}`)}
                className="border border-[var(--color-brand)] text-[var(--color-brand)] rounded-full px-5 py-2 text-base font-medium hover:bg-[var(--color-brand)] hover:text-white transition-colors"
              >
                View
              </button>
              <button
                disabled={busyId === p.id}
                onClick={() => deleteProject(p.id, p.name)}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-brand)] disabled:opacity-50"
                title="Delete database"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
      </div>

      <button
        onClick={() => navigate('/app/chat/new')}
        className="mt-6 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full px-7 py-3 text-lg font-medium"
      >
        Create New +
      </button>
    </div>
  );
}
