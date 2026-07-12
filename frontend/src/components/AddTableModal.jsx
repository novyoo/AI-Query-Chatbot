import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';

const MYSQL_TYPES = ['INT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'FLOAT'];

export default function AddTableModal({ projectId, engine, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState([
    { name: '', type: 'VARCHAR(255)', isPrimaryKey: false },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateCol(i, patch) {
    setColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addCol() {
    setColumns((cols) => [...cols, { name: '', type: 'VARCHAR(255)', isPrimaryKey: false }]);
  }

  function removeCol(i) {
    setColumns((cols) => cols.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Give the table a name');
    const cleanCols = columns.filter((c) => c.name.trim());
    if (!cleanCols.length) return setError('Add at least one column');
    setSaving(true);
    try {
      await api.post(`/tables/${projectId}`, { name: name.trim(), columns: cleanCols });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-[var(--font-display)] text-xl font-semibold">
            New {engine === 'mysql' ? 'table' : 'collection'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-[var(--color-ink-soft)]">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-white border border-[var(--color-border-soft)] rounded-lg px-3 py-2.5 text-base outline-none focus:border-[var(--color-brand)]"
              placeholder="students"
            />
          </div>

          {engine === 'mysql' && (
            <div className="space-y-2">
              <label className="text-sm text-[var(--color-ink-soft)]">Columns</label>
              {columns.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => updateCol(i, { name: e.target.value })}
                    placeholder="column_name"
                    className="flex-1 bg-white border border-[var(--color-border-soft)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
                  />
                  <select
                    value={c.type}
                    onChange={(e) => updateCol(i, { type: e.target.value })}
                    className="bg-white border border-[var(--color-border-soft)] rounded-lg px-2 py-2 text-sm outline-none"
                  >
                    {MYSQL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-[var(--color-ink-soft)] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={c.isPrimaryKey}
                      onChange={(e) => updateCol(i, { isPrimaryKey: e.target.checked })}
                    />
                    key
                  </label>
                  <button type="button" onClick={() => removeCol(i)} className="text-[var(--color-ink-soft)] hover:text-[var(--color-brand)]">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCol}
                className="flex items-center gap-1 text-sm text-[var(--color-brand)] font-medium mt-1"
              >
                <Plus size={16} /> Add column
              </button>
            </div>
          )}

          {engine === 'mongodb' && (
            <p className="text-sm text-[var(--color-ink-soft)]">
              MongoDB collections don't need predefined columns, you can add fields freely once it's created.
            </p>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            disabled={saving}
            className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full py-2.5 text-base font-medium disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
