import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import TopTabs from '../components/TopTabs';
import DatabaseList from '../components/DatabaseList';
import AddTableModal from '../components/AddTableModal';

export default function QueryView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const hasProject = projectId && projectId !== 'new';

  const [project, setProject] = useState(null);
  const [tables, setTables] = useState([]);
  const [text, setText] = useState('');
  const [rows, setRows] = useState(null);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [showAddTable, setShowAddTable] = useState(false);

  async function loadProject() {
    const { data: pData } = await api.get(`/projects/${projectId}`);
    setProject(pData.project);
    setTables(pData.project.tables || []);
  }

  useEffect(() => {
    if (!hasProject) return;
    (async () => {
      try {
        await loadProject();
        const { data: qData } = await api.get(`/query/${projectId}`);
        setText(qData.text || '');
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    })();

  }, [projectId, hasProject]);

  async function run() {
    setRunning(true);
    setError('');
    try {
      const { data } = await api.post(`/query/${projectId}/run`, { query: text });
      if (data.tables) setTables(data.tables);
      const firstResult = Array.isArray(data.results?.[0]) ? data.results[0] : data.results?.[0];
      if (Array.isArray(firstResult)) {
        setRows(firstResult);
        setFields(firstResult.length ? Object.keys(firstResult[0]) : []);
      } else {
        setRows(null);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  async function deleteTable(tableName) {
    if (!confirm(`Permanently delete table "${tableName}"?`)) return;
    try {
      await api.delete(`/tables/${projectId}/${tableName}`);
      loadProject();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!hasProject) {
    return (
      <div className="flex-1 px-10 py-8 max-w-6xl mx-auto w-full">
        <TopTabs active="query" projectId={null} />
        <DatabaseList viewPrefix="query" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-10 py-8 max-w-6xl mx-auto w-full">
      <TopTabs active="query" projectId={projectId} />

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
            <ChevronDown size={16} className={treeOpen ? '' : '-rotate-90'} /> {project?.name}
          </button>
          {treeOpen && (
            <div className="space-y-1.5 ml-2">
              {tables.map((t) => (
                <div key={t.name} className="flex items-center justify-between group">
                  <button
                    onClick={() => navigate(`/app/table/${projectId}`, { state: { tableName: t.name } })}
                    className="flex items-center gap-1.5 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] text-lg py-0.5"
                  >
                    <ArrowRight size={14} /> {t.name}
                  </button>
                  <button
                    onClick={() => deleteTable(t.name)}
                    className="text-[var(--color-ink-soft)]/0 group-hover:text-[var(--color-brand)] transition-colors"
                    title="Delete table"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {tables.length === 0 && <p className="text-[var(--color-ink-soft)] text-base">No tables yet</p>}
              <button
                onClick={() => setShowAddTable(true)}
                className="flex items-center gap-1.5 text-[var(--color-brand)] text-lg font-medium mt-3"
              >
                <Plus size={16} /> Add table
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent p-6 text-lg font-[var(--font-mono)] text-[var(--color-ink)] outline-none resize-none min-h-[240px]"
            placeholder={project?.engine === 'mysql' ? 'CREATE TABLE students (\n  ...\n);' : 'db.students.find({})'}
          />
          <div className="px-6 pb-4 flex items-center justify-between">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={run}
              disabled={running}
              className="ml-auto bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full px-7 py-2.5 text-lg font-medium disabled:opacity-50"
            >
              {running ? 'Running…' : 'Run'}
            </button>
          </div>

          {rows && (
            <div className="border-t border-[var(--color-border-soft)] overflow-auto max-h-72">
              <table className="w-full text-lg">
                <thead>
                  <tr className="bg-[var(--color-cream-soft)] text-[var(--color-ink-soft)]">
                    <th className="px-4 py-2.5 text-left">Sl no</th>
                    {fields.map((f) => (
                      <th key={f} className="px-4 py-2.5 text-left">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--color-border-soft)]">
                      <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">{i + 1}</td>
                      {fields.map((f) => (
                        <td key={f} className="px-4 py-2.5">
                          {String(r[f] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
