import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUp, Copy, Check } from 'lucide-react';
import { api, apiErrorMessage } from '../lib/api';
import { useProjects } from '../context/ProjectContext';
import TopTabs from '../components/TopTabs';

function StatementCard({ statements, tableName, projectId, navigate }) {
  const [copied, setCopied] = useState(false);
  const text = (statements || []).join(';\n\n');

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-[var(--color-cream-soft)] border border-[var(--color-border-soft)] rounded-2xl p-6 mt-3 text-left">
      <div className="flex justify-end mb-2">
        <button onClick={copy} className="flex items-center gap-1 text-base text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-base text-[var(--color-ink)] whitespace-pre-wrap font-[var(--font-mono)] overflow-x-auto">
        {text}
      </pre>
      <div className="flex gap-3 justify-center mt-5">
        <button
          onClick={() => navigate(`/app/query/${projectId}`)}
          className="border border-[var(--color-brand)] text-[var(--color-brand)] rounded-full px-6 py-2 text-base font-medium hover:bg-[var(--color-brand)] hover:text-white transition-colors"
        >
          View Query
        </button>
        <button
          onClick={() => navigate(`/app/table/${projectId}`, { state: { tableName } })}
          className="border border-[var(--color-brand)] text-[var(--color-brand)] rounded-full px-6 py-2 text-base font-medium hover:bg-[var(--color-brand)] hover:text-white transition-colors"
        >
          View Table
        </button>
      </div>
    </div>
  );
}

function ResultsTable({ results }) {
  if (!results?.length) return null;
  return (
    <div className="space-y-3 mt-3">
      {results.map((r, i) => (
        <div key={i} className="bg-[var(--color-cream-soft)] border border-[var(--color-border-soft)] rounded-2xl overflow-hidden text-left">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-[var(--color-border-soft)]/40">
                {r.columns.map((c) => (
                  <th key={c} className="px-4 py-2.5 text-left font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-[var(--color-border-soft)]">
                  {r.columns.map((c) => (
                    <td key={c} className="px-4 py-2.5">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function AiBotView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { refresh } = useProjects();
  const isNew = projectId === 'new';

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [engine, setEngine] = useState('mysql');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isNew) {
      setProject(null);
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const { data: pData } = await api.get(`/projects/${projectId}`);
        setProject(pData.project);
        if (pData.project.setupStage === 'ready') {
          const { data: mData } = await api.get(`/chat/${projectId}`);
          setMessages(mData.messages);
        }
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    })();
  }, [projectId, isNew]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, project]);

  async function chooseEngine() {
    setError('');
    try {
      const { data } = await api.post('/projects', { engine });
      navigate(`/app/chat/${data.project._id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function send() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setError('');
    setSending(true);
    try {
      if (project?.setupStage === 'name_db') {
        const { data } = await api.post(`/projects/${projectId}/name`, { name: text });
        setProject(data.project);
        const { data: mData } = await api.get(`/chat/${projectId}`);
        setMessages(mData.messages);
        refresh();
      } else {
        setMessages((m) => [...m, { role: 'user', content: text, _local: true }]);
        const { data } = await api.post(`/chat/${projectId}`, { message: text });
        setMessages((m) => [...m, data.message]);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex-1 flex flex-col px-10 py-8 max-w-5xl mx-auto w-full">
      <TopTabs active="chat" projectId={isNew ? null : projectId} />

      <div className="flex-1 bg-[var(--color-card)] border border-[var(--color-border-soft)] rounded-3xl flex flex-col overflow-hidden shadow-sm">
        <div className="px-7 py-5 text-lg text-[var(--color-ink-soft)] border-b border-[var(--color-border-soft)] font-medium">
          {project ? project.name : isNew ? 'New database' : '...'}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-7 py-8 space-y-6">
          {isNew && (
            <div className="text-center max-w-md mx-auto pt-6">
              <p className="font-[var(--font-display)] font-bold text-3xl text-[var(--color-burgundy)] mb-2">Greetings :)</p>
              <p className="text-[var(--color-ink-soft)] text-lg mb-7">Let's configure your backend. Choose where your data will live.</p>
              <div className="bg-[var(--color-cream-soft)] border border-[var(--color-border-soft)] rounded-2xl p-6 inline-block text-left w-80">
                {[
                  { v: 'mongodb', label: 'MongoDB' },
                  { v: 'mysql', label: 'MySQL' },
                ].map((opt) => (
                  <label key={opt.v} className="flex items-center gap-3 py-3 border-b border-[var(--color-border-soft)] last:border-b-0 cursor-pointer text-lg">
                    <input
                      type="radio"
                      checked={engine === opt.v}
                      onChange={() => setEngine(opt.v)}
                      className="accent-[var(--color-brand)] w-5 h-5"
                    />
                    {opt.label}
                  </label>
                ))}
                <button
                  onClick={chooseEngine}
                  className="w-full mt-5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full py-2.5 text-lg font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {project?.setupStage === 'name_db' && (
            <p className="text-center text-[var(--color-ink-soft)] text-lg max-w-md mx-auto">
              Got it! You've chosen {project.engine === 'mysql' ? 'MySQL' : 'MongoDB'}. Now give your database a
              name! Just type it in the chat.
            </p>
          )}

          {messages.map((m, i) => (
            <div key={m._id || i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={m.role === 'user' ? 'max-w-md' : 'max-w-xl mx-auto text-center'}>
                {m.role === 'user' ? (
                  <div className="bg-[var(--color-brand)] text-white rounded-2xl px-5 py-3 text-lg inline-block text-left">
                    {m.content}
                  </div>
                ) : (
                  <div>
                    <p className="text-[var(--color-ink)] text-lg whitespace-pre-wrap">{m.content}</p>
                    {m.statements?.length > 0 && (
                      <StatementCard
                        statements={m.statements}
                        tableName={m.tableName}
                        projectId={projectId}
                        navigate={navigate}
                      />
                    )}
                    <ResultsTable results={m.results} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && <p className="text-center text-[var(--color-ink-soft)] text-base">Thinking…</p>}
          {error && <p className="text-center text-red-600 text-base">{error}</p>}
        </div>

        {!isNew && (
          <div className="p-5 border-t border-[var(--color-border-soft)] flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={project?.setupStage === 'name_db' ? 'Type a database name…' : 'Chat here'}
              className="flex-1 bg-white border border-[var(--color-border-soft)] rounded-full px-6 py-4 text-lg outline-none focus:border-[var(--color-brand)]"
            />
            <button
              onClick={send}
              disabled={sending}
              className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white rounded-full p-4 disabled:opacity-50"
            >
              <ArrowUp size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
