import { useState } from 'react';
import { ALL_STATUSES, FOCUS_AREAS, STATUS_COLORS, FOCUS_AREA_COLORS } from '../types';
import type { FocusArea, Idea, Status } from '../types';

interface Props {
  statusFilter: Status | 'All';
  focusFilter: FocusArea | 'All';
  communityOnly: boolean;
  sortBy: 'votes' | 'newest';
  totalCount: number;
  filteredCount: number;
  ideas: Idea[];
  onStatusChange: (v: Status | 'All') => void;
  onFocusChange: (v: FocusArea | 'All') => void;
  onCommunityToggle: (v: boolean) => void;
  onSortChange: (v: 'votes' | 'newest') => void;
}

function Section({ label, children, first = false }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`py-4 ${!first ? 'border-t border-brand-200/60' : ''}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 block mb-2 px-2">
        {label}
      </span>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="text-xs tabular-nums text-brand-400 font-normal">{n}</span>;
}

const baseBtn = 'w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between gap-2';

export default function FacetFilters({
  statusFilter, focusFilter, communityOnly, sortBy,
  totalCount, filteredCount, ideas,
  onStatusChange, onFocusChange, onCommunityToggle, onSortChange,
}: Props) {
  const [hoveredStatus, setHoveredStatus] = useState<Status | null>(null);
  const [hoveredFocus, setHoveredFocus] = useState<FocusArea | null>(null);

  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = ideas.filter((i) => i.status === s).length;
    return acc;
  }, {});

  const focusCounts = FOCUS_AREAS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = ideas.filter((i) => i.focusArea === f).length;
    return acc;
  }, {});

  return (
    <aside className="w-52 flex-shrink-0">
      <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest px-2 pt-1">
        {filteredCount === totalCount ? `${totalCount} items` : `${filteredCount} of ${totalCount}`}
      </p>

      {/* Sort */}
      <Section label="Sort by" first>
        {(['votes', 'newest'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onSortChange(opt)}
            className={`${baseBtn} ${
              sortBy === opt
                ? 'bg-white/70 text-brand-800 font-medium'
                : 'text-brand-700 hover:bg-white/50 hover:text-brand-900'
            }`}
          >
            <span>{opt === 'votes' ? 'Most votes' : 'Newest'}</span>
          </button>
        ))}
      </Section>

      {/* Status */}
      <Section label="Status">
        <button
          onClick={() => onStatusChange('All')}
          className={`${baseBtn} ${
            statusFilter === 'All'
              ? 'bg-white/70 text-brand-800 font-medium'
              : 'text-brand-700 hover:bg-white/50 hover:text-brand-900'
          }`}
        >
          <span>All statuses</span>
          <Count n={totalCount} />
        </button>
        {ALL_STATUSES.map((s) => {
          const isActive = statusFilter === s;
          const isHovered = hoveredStatus === s;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              onMouseEnter={() => setHoveredStatus(s)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`${baseBtn} ${
                isActive ? `${STATUS_COLORS[s]} font-medium`
                : isHovered ? STATUS_COLORS[s]
                : 'text-brand-700'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  STATUS_COLORS[s].split(' ')[0].replace('100', '400').replace('50', '400')
                }`} />
                <span className="truncate">{s}</span>
              </span>
              <Count n={statusCounts[s]} />
            </button>
          );
        })}
      </Section>

      {/* Focus Area */}
      <Section label="Focus Area">
        <button
          onClick={() => onFocusChange('All')}
          className={`${baseBtn} ${
            focusFilter === 'All'
              ? 'bg-white/70 text-brand-800 font-medium'
              : 'text-brand-700 hover:bg-white/50 hover:text-brand-900'
          }`}
        >
          <span>All areas</span>
          <Count n={totalCount} />
        </button>
        {FOCUS_AREAS.map((f) => {
          const isActive = focusFilter === f;
          const isHovered = hoveredFocus === f;
          return (
            <button
              key={f}
              onClick={() => onFocusChange(f)}
              onMouseEnter={() => setHoveredFocus(f)}
              onMouseLeave={() => setHoveredFocus(null)}
              className={`${baseBtn} ${
                isActive ? `${FOCUS_AREA_COLORS[f]} font-medium`
                : isHovered ? FOCUS_AREA_COLORS[f]
                : 'text-brand-700'
              }`}
            >
              <span className="truncate">{f}</span>
              <Count n={focusCounts[f]} />
            </button>
          );
        })}
      </Section>

      {/* Community */}
      <div className="border-t border-brand-200/60 py-4 px-2">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={communityOnly}
              onChange={(e) => onCommunityToggle(e.target.checked)}
              className="w-4 h-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
            />
            <span className="text-sm text-brand-700 group-hover:text-brand-900 transition-colors">
              Community only
            </span>
          </span>
          <Count n={ideas.filter((i) => i.communitySubmitted).length} />
        </label>
      </div>
    </aside>
  );
}
