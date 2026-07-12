import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ChevronDown, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import TopTabs from '../components/TopTabs';
import DatabaseList from '../components/DatabaseList';
import AddTableModal from '../components/AddTableModal';

const BLANK_ROWS = 6;

function makeBlankRow() {
  return { __id: `blank-${Math.random().toString(36).slice(2)}`, __blank: true };
}

export default function TableView() {
  const { projectId } = useParams();
  const location = useLocation();
  const hasProject = projectId && projectId !== 'new';

  const [project, setProject] = useState(null);
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState(location.state?.tableName || null);
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState(null);
  // gridRows: real rows (with __id = their primary key / _id value) followed by blank rows (__blank: true)
  const [gridRows, setGridRows] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [showAddTable, setShowAddTable] = useState(false);

  async function loadProject() {
    const { data: pData } = await api.get(`/projects/${projectId}`);
    setProject(pData.project);
    setTables(pData.project.tables || []);
    return pData.project.tables || [];
  }

  useEffect(() => {
    if (!hasProject) return;
    (async () => {
      try {
        const t = await loadProject();
        if (!activeTable && t.length) setActiveTable(t[0].name);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hasProject]);

  async function loadRows() {
    if (!hasProject || !activeTable) return;
    try {
      const { data } = await api.get(`/tables/${projectId}/${activeTable}`);
      setColumns(data.columns);
      setPrimaryKey(data.primaryKey);
      const real = data.rows.map((r) => ({ ...r, __id: String(r[data.primaryKey] ?? r._id) }));
      const blanks = Array.from({ length: BLANK_ROWS }, makeBlankRow);
      setGridRows([...real, ...blanks]);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTable, hasProject]);

  function updateCell(id, colName, value) {
    setGridRows((prev) => prev.map((r) => (r.__id === id ? { ...r, [colName]: value, __blank: false } : r)));
  }

  async function saveChanges() {
    setSaving(true);
    setError('');
    try {
      const rowsToSave = gridRows
        .filter((r) => !r.__blank)
        .map((r) => {
          const { __id, __blank, ...rest } = r;
          return rest;
        });
      await api.post(`/tables/${projectId}/${activeTable}/save`, { rows: rowsToSave });
      await loadRows();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id) {
    if (!confirm('Delete this row?')) return;
    try {
      await api.delete(`/tables/${projectId}/${activeTable}/rows/${encodeURIComponent(id)}`);
      loadRows();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function deleteTable(tableName) {
    if (!confirm(`Permanently delete table "${tableName}"?`)) return;
    try {
      await api.delete(`/tables/${projectId}/${tableName}`);
      if (activeTable === tableName) setActiveTable(null);
      loadProject();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!hasProject) {
    return (
      <div className="flex-1 px-10 py-8 max-w-6xl mx-auto w-full">
        <TopTabs active="table" projectId={null} />
        <DatabaseList viewPrefix="table" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-10 py-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="w-28" />
        <TopTabs active="table" projectId={projectId} />
        <button
          onClick={saveChanges}
          disabled={saving || !activeTable}
          className="h-fit bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full px-6 py-2.5 text-base font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {showAddTable && (
        <AddTableModal
          projectId={projectId}
          engine={project?.engine}
          onClose={() => setShowAddTable(false)}
          onCreated={loadProject}
        />
      )}

      <div className="flex-1 bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-3xl flex overflow-hidden shadow-sm">
        <div className="w-64 shrink-0 border-r border-[var(--color-border-soft)] p-5">
          <button onClick={() => setTreeOpen((o) => !o)} className="flex items-center gap-1 font-semibold text-lg mb-3">
            <ChevronDown size={18} className={treeOpen ? '' : '-rotate-90'} /> {project?.name}
          </button>
          {treeOpen && (
            <div className="space-y-2 ml-2">
              {tables.map((t) => (
                <div key={t.name} className="flex items-center justify-between group">
                  <button
                    onClick={() => setActiveTable(t.name)}
                    className={`flex items-center gap-1.5 text-lg py-0.5 ${
                      activeTable === t.name ? 'text-[var(--color-brand)] font-medium' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <ArrowRight size={16} /> {t.name}
                  </button>
                  <button
                    onClick={() => deleteTable(t.name)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-ink-soft)] hover:text-[var(--color-brand)] transition-opacity"
                    title="Delete table"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {tables.length === 0 && <p className="text-[var(--color-ink-soft)] text-base">No tables yet</p>}
              <button
                onClick={() => setShowAddTable(true)}
                className="flex items-center gap-1.5 text-[var(--color-brand)] text-lg font-medium mt-3"
              >
                <Plus size={18} /> Add table
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {error && <p className="text-red-600 text-base px-5 pt-4">{error}</p>}
          {activeTable ? (
            <table className="text-lg border-collapse w-full">
              <thead className="sticky top-0 bg-[var(--color-cream-soft)]">
                <tr>
                  <th className="w-12 border border-[var(--color-border-soft)] text-[var(--color-ink-soft)] font-normal">#</th>
                  {columns.map((c) => (
                    <th key={c.name} className="border border-[var(--color-border-soft)] px-4 py-3 text-left font-semibold">
                      {c.name}
                      {c.isPrimaryKey && <span className="text-[var(--color-ink-soft)] font-normal text-sm"> (key)</span>}
                    </th>
                  ))}
                  <th className="w-12 border border-[var(--color-border-soft)]" />
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row, rowIdx) => (
                  <tr key={row.__id}>
                    <td className="border border-[var(--color-border-soft)] text-center text-[var(--color-ink-soft)]">{rowIdx + 1}</td>
                    {columns.map((c) => (
                      <td key={c.name} className="border border-[var(--color-border-soft)] p-0">
                        <input
                          value={row[c.name] ?? ''}
                          disabled={c.isPrimaryKey && !row.__blank}
                          onChange={(e) => updateCell(row.__id, c.name, e.target.value)}
                          className="w-full bg-transparent px-4 py-3 outline-none focus:bg-[var(--color-brand-soft)] disabled:text-[var(--color-ink-soft)]"
                        />
                      </td>
                    ))}
                    <td className="border border-[var(--color-border-soft)] text-center">
                      {!row.__blank && (
                        <button onClick={() => deleteRow(row.__id)} className="text-[var(--color-ink-soft)] hover:text-[var(--color-brand)]">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-ink-soft)] text-lg gap-3">
              <p>No table selected yet.</p>
              <p className="max-w-xs text-center">
                Create one below, or from the AI bot tab e.g. "make a students table with name, email and age".
              </p>
              <button
                onClick={() => setShowAddTable(true)}
                className="flex items-center gap-1.5 text-[var(--color-brand)] font-medium mt-1"
              >
                <Plus size={18} /> Add table
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
