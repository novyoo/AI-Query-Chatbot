import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export default function HistoryView() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="flex-1 px-10 py-8 max-w-3xl mx-auto w-full">
      <h2 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-burgundy)] mb-7">Chat history</h2>
      {loading && <p className="text-[var(--color-ink-soft)] text-lg">Loading…</p>}
      {!loading && projects.length === 0 && <p className="text-[var(--color-ink-soft)] text-lg">No conversations yet.</p>}
      <div className="space-y-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/app/chat/${p.id}`)}
            className="w-full flex items-center gap-4 bg-[var(--color-card)] hover:bg-[var(--color-cream-soft)] border border-[var(--color-border-soft)] rounded-xl px-5 py-4 text-left transition-colors shadow-sm"
          >
            <MessageSquare size={20} className="text-[var(--color-brand)]" />
            <div>
              <div className="font-semibold text-xl">{p.name}</div>
              <div className="text-[var(--color-ink-soft)] text-base">
                {p.engine === 'mysql' ? 'MySQL' : 'MongoDB'} · {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
