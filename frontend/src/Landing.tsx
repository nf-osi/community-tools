import { useEffect, useState } from 'react';
import { Map, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from './router';
import { fetchSession, logout } from './api';
import type { User } from './types';

const LOGIN_URL = `${import.meta.env.VITE_AUTH_BASE ?? ''}/api/auth/login`;

function PortalLogo() {
  return (
    <svg viewBox="0 0 40 40" className="w-12 h-12" aria-hidden="true">
      <circle cx="15" cy="17" r="9.5" fill="#0d6e62" opacity=".82" />
      <circle cx="25" cy="14" r="7" fill="#2c6fb0" opacity=".82" />
      <circle cx="20" cy="26" r="7.5" fill="#6a4fb0" opacity=".82" />
      <circle cx="28" cy="25" r="4.5" fill="#c98a18" opacity=".9" />
    </svg>
  );
}

interface OptionProps {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Map;
  accent: string;
}

function OptionCard({ to, eyebrow, title, description, icon: Icon, accent }: OptionProps) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border p-8 transition-all hover:-translate-y-0.5"
      style={{ borderColor: '#e2e2dc', background: '#fff', boxShadow: '0 1px 2px rgba(22,24,28,0.04)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
        style={{ background: `${accent}14` }}
      >
        <Icon className="w-6 h-6" style={{ color: accent }} aria-hidden="true" />
      </div>
      <div className="font-display text-[12px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8a8f98' }}>
        {eyebrow}
      </div>
      <h2 className="font-display font-semibold text-[26px] tracking-[-0.02em] mb-2 flex items-center gap-2" style={{ color: '#16181c' }}>
        {title}
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: '#8a8f98' }} />
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: '#54585f' }}>
        {description}
      </p>
    </Link>
  );
}

function AuthControl({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm font-medium" style={{ color: '#54585f' }}>
          {user.username}
        </span>
        <button
          onClick={onLogout}
          className="text-sm px-3 py-2 rounded transition-colors"
          style={{ color: '#54585f' }}
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <a
      href={LOGIN_URL}
      className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full transition-colors"
      style={{ background: '#16181c', color: '#f6f6f3' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#1b7eab')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#16181c')}
    >
      Log in with Synapse
    </a>
  );
}

export default function Landing() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    document.title = 'NF Data Portal · Community Tools';
    fetchSession().then(({ user }) => setUser(user)).catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fafaf7' }}>
      <header className="max-w-4xl w-full mx-auto px-10 pt-6 flex items-center justify-end">
        <AuthControl user={user} onLogout={handleLogout} />
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-10 flex flex-col justify-center py-12">
        <div className="flex items-center gap-4 mb-3">
          <PortalLogo />
          <span className="font-display font-medium text-[15px] uppercase tracking-[0.18em]" style={{ color: '#8a8f98' }}>
            NF Data Portal
          </span>
        </div>
        <h1 className="font-display font-semibold text-[52px] leading-[1] tracking-[-0.03em] mb-4" style={{ color: '#16181c' }}>
          Community Tools
        </h1>
        <p className="text-base max-w-xl mb-12" style={{ color: '#54585f' }}>
          Shape what the portal builds next, and run analyses on portal data — all in one place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <OptionCard
            to="/roadmap"
            eyebrow="Plan"
            title="Community Roadmap"
            description="Browse infrastructure and new-data proposals, upvote priorities, and join Synapse discussions."
            icon={Map}
            accent="#1b7eab"
          />
          <OptionCard
            to="/agents"
            eyebrow="Analyze"
            title="Agent Gallery"
            description="Point an agent at your Synapse files; it runs the analysis and writes results back with provenance."
            icon={Sparkles}
            accent="#0d6e62"
          />
        </div>
      </main>
    </div>
  );
}
