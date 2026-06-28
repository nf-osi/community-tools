import { useEffect } from 'react';
import { X, ExternalLink, ArrowRight } from 'lucide-react';
import { GWAS_TOOLS, POST_GWAS_STEPS } from '../tools';

const CATEGORY_COLOR: Record<string, string> = {
  'QC & structure': '#125e81',
  'Association engine': '#0d6e62',
  'Visualization': '#7b3df0',
  'Interpretation': '#c4720c',
};

export default function ToolsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tools-modal-title"
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mb-10">
        <div className="sticky top-0 bg-white flex items-start justify-between gap-4 p-6 border-b rounded-t-xl" style={{ borderColor: '#e2e2dc' }}>
          <div>
            <h2 id="tools-modal-title" className="font-display font-semibold text-[20px]" style={{ color: '#16181c' }}>
              Tools &amp; post-GWAS next steps
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#8a8f98' }}>
              The tools the agent runs in our cloud, and why.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-gray-100" style={{ color: '#8a8f98' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pipeline tools */}
          <section>
            <h3 className="font-display font-semibold text-[13px] uppercase tracking-[0.08em] mb-1" style={{ color: '#8a8f98' }}>
              Tools the agent runs
            </h3>
            <p className="text-[13px] mb-3" style={{ color: '#54585f' }}>
              The two association engines are marked <span style={{ color: '#0d6e62' }}>agent-selected</span> — the
              agent picks one automatically based on case/control balance, sample relatedness, and sample size.
            </p>
            <div className="space-y-4">
              {GWAS_TOOLS.map((t) => (
                <div key={t.name} className="rounded-lg border p-4" style={{ borderColor: '#e2e2dc' }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-display font-semibold text-[14px]" style={{ color: '#16181c' }}>{t.name}</span>
                    <span
                      className="font-display text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded"
                      style={{ background: `${CATEGORY_COLOR[t.category]}14`, color: CATEGORY_COLOR[t.category] }}
                    >
                      {t.category}
                    </span>
                    {t.engine && (
                      <span className="font-display text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded" style={{ background: '#0d6e6214', color: '#0d6e62' }}>
                        agent-selected
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] mb-2" style={{ color: '#16181c' }}>{t.details}</p>
                  <p className="text-[13px]" style={{ color: '#54585f' }}>
                    <span className="font-medium" style={{ color: '#16181c' }}>Good for: </span>{t.goodFor}
                  </p>
                  {t.link && (
                    <a href={t.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] mt-2 hover:underline" style={{ color: '#125e81' }}>
                      Documentation <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Post-GWAS recommendations */}
          <section>
            <h3 className="font-display font-semibold text-[13px] uppercase tracking-[0.08em] mb-1" style={{ color: '#8a8f98' }}>
              Post-GWAS interpretation — recommended next steps
            </h3>
            <p className="text-[13px] mb-3" style={{ color: '#54585f' }}>
              The agent currently runs association, plots, and a first-pass narrative. It doesn't
              <span className="font-medium" style={{ color: '#16181c' }}> yet </span>
              orchestrate the steps below — recommended follow-ups, and good candidates for
              future agent steps.
            </p>
            <div className="space-y-3">
              {POST_GWAS_STEPS.map((s) => (
                <div key={s.name} className="rounded-lg p-4" style={{ background: '#f6f6f3' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="w-4 h-4" style={{ color: '#0d6e62' }} />
                    <span className="font-display font-semibold text-[14px]" style={{ color: '#16181c' }}>{s.name}</span>
                  </div>
                  <p className="text-[13px]" style={{ color: '#54585f' }}>{s.what}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#54585f' }}>
                    <span className="font-medium" style={{ color: '#16181c' }}>Why: </span>{s.why}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-display text-[11px] px-2 py-0.5 rounded" style={{ background: '#fff', color: '#54585f' }}>
                      {s.tools}
                    </span>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] hover:underline" style={{ color: '#125e81' }}>
                        Learn more <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
