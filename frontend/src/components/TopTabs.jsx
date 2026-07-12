import { useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'chat', label: 'AI bot' },
  { key: 'query', label: 'Query' },
  { key: 'table', label: 'Table' },
];

export default function TopTabs({ active, projectId }) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-fit flex items-center bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-full p-1.5 mb-8 shadow-sm">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const disabled = !projectId && t.key !== 'chat';
        return (
          <button
            key={t.key}
            disabled={disabled}
            onClick={() => navigate(`/app/${t.key}/${projectId || 'new'}`)}
            className={`px-8 py-3 rounded-full text-lg font-medium transition-colors ${
              isActive
                ? 'bg-[var(--color-brand)] text-white'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
