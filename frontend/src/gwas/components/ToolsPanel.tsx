import { GWAS_TOOLS } from '../tools';
import type { Engine } from '../types';

const CATEGORY_COLOR: Record<string, string> = {
  'QC & structure': '#125e81',
  'Association engine': '#0d6e62',
  'Visualization': '#7b3df0',
  'Interpretation': '#c4720c',
};

export default function ToolsPanel({ engine }: { engine: Engine }) {
  return (
    <div className="rounded-xl border" style={{ borderColor: '#e2e2dc', background: '#fff' }}>
      <ul className="divide-y" style={{ borderColor: '#f1f1ec' }}>
        {GWAS_TOOLS.map((t) => {
          // Dim the association engine that isn't selected.
          const inactive = !!t.engine && t.engine !== engine;
          const active = t.engine === engine;
          return (
            <li key={t.name} className="px-5 py-4" style={{ opacity: inactive ? 0.5 : 1 }}>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-display font-semibold text-[14px]" style={{ color: '#16181c' }}>
                  {t.name}
                </span>
                <span
                  className="font-display text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded"
                  style={{ background: `${CATEGORY_COLOR[t.category]}14`, color: CATEGORY_COLOR[t.category] }}
                >
                  {t.category}
                </span>
                {active && (
                  <span
                    className="font-display text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded"
                    style={{ background: '#0d6e62', color: '#fff' }}
                  >
                    Selected
                  </span>
                )}
                {inactive && (
                  <span className="font-display text-[10px] uppercase tracking-[0.06em]" style={{ color: '#8a8f98' }}>
                    not selected
                  </span>
                )}
              </div>
              <p className="text-[13px] mb-1" style={{ color: '#54585f' }}>{t.what}</p>
              <p className="text-[13px]" style={{ color: '#54585f' }}>
                <span className="font-medium" style={{ color: '#16181c' }}>Why: </span>{t.why}
              </p>
              <p className="text-[13px]" style={{ color: '#54585f' }}>
                <span className="font-medium" style={{ color: '#16181c' }}>Good for: </span>{t.goodFor}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
