import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Plus, ExternalLink } from 'lucide-react';
import { Link } from '../router';
import { AGENTS } from './registry';
import type { AgentMeta } from './registry';

function AgentCard({ agent }: { agent: AgentMeta }) {
  const Icon = agent.icon;
  const available = agent.status === 'available' && agent.route;

  const inner = (
    <div
      className="group h-full rounded-2xl border p-6 flex flex-col transition-all"
      style={{
        borderColor: '#e2e2dc',
        background: '#fff',
        opacity: available ? 1 : 0.72,
        boxShadow: available ? '0 1px 2px rgba(22,24,28,0.04)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${agent.accent}14` }}
        >
          <Icon className="w-5 h-5" style={{ color: agent.accent }} aria-hidden="true" />
        </div>
        {available ? (
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
            style={{ color: '#8a8f98' }}
          />
        ) : (
          <span
            className="font-display text-[11px] uppercase tracking-[0.08em] px-2 py-1 rounded-full"
            style={{ background: '#f1f1ec', color: '#8a8f98' }}
          >
            Coming soon
          </span>
        )}
      </div>

      <h3 className="font-display font-semibold text-[17px] mb-1.5" style={{ color: '#16181c' }}>
        {agent.name}
      </h3>
      <p className="text-sm leading-relaxed flex-1" style={{ color: '#54585f' }}>
        {agent.blurb}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {agent.tags.map((t) => (
          <span
            key={t}
            className="font-display text-[11px] px-2 py-0.5 rounded"
            style={{ background: '#f6f6f3', color: '#54585f' }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  if (available) {
    return (
      <Link
        to={agent.route!}
        className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {inner}
      </Link>
    );
  }
  return <div aria-disabled="true">{inner}</div>;
}

function SubmitAgentCard() {
  return (
    <Link
      to="/roadmap?new=agent"
      className="group h-full min-h-[200px] rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors hover:border-[#0d6e62] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      style={{ borderColor: '#cfd0c9' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors"
        style={{ background: '#0d6e6214' }}
      >
        <Plus className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: '#0d6e62' }} />
      </div>
      <h3 className="font-display font-semibold text-[16px] mb-1" style={{ color: '#16181c' }}>
        Submit a new agent
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#54585f' }}>
        Have an idea for an agent? Propose it on the community roadmap.
      </p>
    </Link>
  );
}

export default function AgentGallery() {
  useEffect(() => { document.title = 'Agent Gallery · NF Data Portal'; }, []);

  return (
    <div className="min-h-screen" style={{ background: '#fafaf7' }}>
      <div className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: '#e2e2dc' }}>
        <header className="max-w-5xl mx-auto px-10 pt-7 pb-5">
          <div className="flex items-center justify-between text-sm mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:underline"
              style={{ color: '#8a8f98' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Home
            </Link>
            <a
              href="https://nf.synapse.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:underline"
              style={{ color: '#8a8f98' }}
            >
              NF Data Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
          <div className="font-display font-medium text-[15px] uppercase tracking-[0.18em]" style={{ color: '#8a8f98' }}>
            NF Data Portal
          </div>
          <h1 className="font-display font-semibold text-[42px] leading-[1] tracking-[-0.025em] mt-1" style={{ color: '#16181c' }}>
            Agent Gallery
          </h1>
          <p className="text-sm mt-3 max-w-2xl" style={{ color: '#54585f' }}>
            Point an agent at your Synapse data and it runs the analysis in our cloud,
            then writes annotated, provenance-linked results back to the portal.
          </p>
        </header>
      </div>

      <main className="max-w-5xl mx-auto px-10 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AGENTS.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
          <SubmitAgentCard />
        </div>
      </main>
    </div>
  );
}
