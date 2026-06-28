import { Check } from 'lucide-react';
import { STATUS_META } from '../types';
import type { CheckStatus } from '../types';

export default function StatusBadge({ status }: { status: CheckStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="font-display font-medium text-[12px] uppercase tracking-[0.08em] px-3 py-1 rounded-full inline-flex items-center gap-1"
      style={{ color: meta.color, background: meta.bg }}
    >
      {status === 'ready' && <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />}
      {meta.label}
    </span>
  );
}
