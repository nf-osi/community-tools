import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { SEVERITY_META, APPROPRIATENESS_META } from '../types';
import type { FileCheckResult, GwasRole, IssueSeverity } from '../types';

const ROLE_LABEL: Record<GwasRole, string> = {
  genotype: 'Genotype',
  genotype_bim: 'Genotype (.bim)',
  genotype_fam: 'Genotype (.fam)',
  phenotype: 'Phenotype',
  covariate: 'Covariate',
  unknown: 'Unassigned',
};

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  const cls = 'w-4 h-4 flex-shrink-0 mt-0.5';
  const color = SEVERITY_META[severity].color;
  if (severity === 'error') return <AlertCircle className={cls} style={{ color }} />;
  if (severity === 'warning') return <AlertTriangle className={cls} style={{ color }} />;
  return <Info className={cls} style={{ color }} />;
}

export default function FileCheckPanel({ result }: { result: FileCheckResult }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: '#e2e2dc', background: '#fff' }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm" style={{ color: '#16181c' }}>{result.summary}</p>
        <StatusBadge status={result.status} />
      </div>

      {/* Appropriateness verdict */}
      {result.appropriateness && (
        <div
          className="mb-4 rounded-lg px-3 py-2.5"
          style={{ background: APPROPRIATENESS_META[result.appropriateness.verdict].bg }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-display text-[12px] uppercase tracking-[0.08em]" style={{ color: '#8a8f98' }}>
              Appropriateness
            </span>
            <span
              className="font-display font-medium text-[12px]"
              style={{ color: APPROPRIATENESS_META[result.appropriateness.verdict].color }}
            >
              {APPROPRIATENESS_META[result.appropriateness.verdict].label}
            </span>
          </div>
          <p className="text-[13px]" style={{ color: '#54585f' }}>
            {result.appropriateness.rationale}
          </p>
        </div>
      )}

      {/* Role assignments */}
      {result.roles.length > 0 && (
        <div className="mb-4">
          <h4 className="font-display text-[12px] uppercase tracking-[0.08em] mb-2" style={{ color: '#8a8f98' }}>
            File roles
          </h4>
          <ul className="space-y-1">
            {result.roles.map((r) => (
              <li key={r.file_id + r.assigned_role} className="flex items-baseline gap-2 text-sm">
                <span
                  className="font-display font-medium text-[12px] px-2 py-0.5 rounded"
                  style={{ background: '#f1f1ec', color: '#54585f' }}
                >
                  {ROLE_LABEL[r.assigned_role]}
                </span>
                <span className="font-medium" style={{ color: '#16181c' }}>{r.file_name}</span>
                <span className="text-[12px]" style={{ color: '#8a8f98' }}>
                  · {Math.round(r.confidence * 100)}% · {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {result.issues.length > 0 && (
        <ul className="space-y-2 mb-1">
          {result.issues.map((issue, i) => (
            <li
              key={issue.code + i}
              className="flex gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ background: SEVERITY_META[issue.severity].bg }}
            >
              <SeverityIcon severity={issue.severity} />
              <div>
                {issue.category && (
                  <span
                    className="font-display text-[10px] uppercase tracking-[0.06em] mr-1.5 px-1.5 py-0.5 rounded align-[1px]"
                    style={{ background: '#ffffffcc', color: '#54585f' }}
                  >
                    {issue.category === 'appropriateness' ? 'Fit' : 'Input'}
                  </span>
                )}
                <span style={{ color: '#16181c' }}>{issue.message}</span>
                {issue.suggestion && (
                  <span className="block text-[13px] mt-0.5" style={{ color: '#54585f' }}>
                    → {issue.suggestion}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Questions (needs_input) */}
      {result.questions.length > 0 && (
        <div className="mt-3 space-y-2">
          {result.questions.map((q) => (
            <div key={q.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: '#f6ecdc' }}>
              <p style={{ color: '#16181c' }}>{q.question}</p>
              {q.options && q.options.length > 0 && (
                <p className="text-[13px] mt-1" style={{ color: '#54585f' }}>
                  Options: {q.options.join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
