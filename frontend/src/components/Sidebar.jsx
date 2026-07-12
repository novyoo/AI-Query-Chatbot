import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquarePlus, History, Database, Settings, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const linkBase =
  'flex items-center gap-3 text-lg font-medium tracking-wide text-[var(--color-burgundy)] hover:text-[var(--color-burgundy-dark)] transition-colors';
const linkActive = 'underline underline-offset-4 decoration-2';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 flex flex-col justify-between py-10 px-8 border-r-4 border-[var(--color-burgundy)]">
      <div>
        <h1
          className="font-[var(--font-display)] font-bold text-3xl leading-tight text-[var(--color-burgundy)] mb-16 cursor-pointer"
          onClick={() => navigate('/app')}
        >
          AI Query
          <br />
          Chatbot
        </h1>

        <nav className="flex flex-col gap-8">
          <button onClick={() => navigate('/app/chat/new')} className={linkBase}>
            <MessageSquarePlus size={22} /> New Chat
          </button>
          <NavLink to="/app/history" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}>
            <History size={22} /> History
          </NavLink>
          <NavLink to="/app/databases" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}>
            <Database size={22} /> Databases
          </NavLink>
          <NavLink to="/app/settings" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : ''}`}>
            <Settings size={22} /> Settings
          </NavLink>
        </nav>
      </div>

      <div className="relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-16 left-0 bg-[var(--color-card)] border border-[var(--color-border-soft)] shadow-lg rounded-xl text-base w-52 overflow-hidden">
            <div className="px-4 py-3 text-[var(--color-ink-soft)] truncate border-b border-[var(--color-border-soft)]">
              {user?.email}
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 hover:bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
            >
              Log out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 text-[var(--color-burgundy)] hover:text-[var(--color-burgundy-dark)] text-lg font-medium"
        >
          <UserCircle2 size={28} />
          <span className="truncate max-w-[160px] font-[var(--font-display)]">{user?.name}</span>
        </button>
      </div>
    </aside>
  );
}
