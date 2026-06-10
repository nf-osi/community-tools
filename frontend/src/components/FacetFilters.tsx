import { useState } from 'react';
import { ALL_STATUSES, FOCUS_AREAS, FOCUS_AREA_COLOR } from '../types';
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

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-display text-[11px] font-medium uppercase tracking-[0.18em] mb-3"
      style={{ color: '#8a8f98' }}
    >
      {children}
    </div>
  );
}

function RailButton({
  active,
  onClick,
  children,
  count,
  accentColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  accentColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex justify-between items-baseline w-full text-left text-[14.5px] py-1.5 transition-all duration-100 focus:outline-none"
      style={{
        color: active ? '#16181c' : hovered ? '#16181c' : '#54585f',
        fontWeight: active ? 600 : 400,
        paddingLeft: hovered ? '5px' : '0',
      }}
    >
      <span>{children}</span>
      {count !== undefined && count > 0 && (
        <span
          className="font-display text-[12px] ml-2 flex-shrink-0"
          style={{ color: active && accentColor ? accentColor : active ? '#1f3df0' : '#8a8f98' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function FacetFilters({
  statusFilter, focusFilter, communityOnly, sortBy,
  totalCount, filteredCount, ideas,
  onStatusChange, onFocusChange, onCommunityToggle, onSortChange,
}: Props) {
  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = ideas.filter((i) => i.status === s).length;
    return acc;
  }, {});

  const focusCounts = FOCUS_AREAS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = ideas.filter((i) => i.focusArea === f).length;
    return acc;
  }, {});

  const communityCount = ideas.filter((i) => i.communitySubmitted).length;

  return (
    <aside className="w-[200px] flex-shrink-0 sticky top-6 self-start">

      {/* Sort */}
      <div className="mb-7">
        <RailLabel>Sort by</RailLabel>
        <RailButton active={sortBy === 'votes'} onClick={() => onSortChange('votes')}>
          Most votes
        </RailButton>
        <RailButton active={sortBy === 'newest'} onClick={() => onSortChange('newest')}>
          Newest
        </RailButton>
      </div>

      {/* Status */}
      <div className="mb-7">
        <RailLabel>Status</RailLabel>
        <RailButton active={statusFilter === 'All'} onClick={() => onStatusChange('All')} count={totalCount}>
          All statuses
        </RailButton>
        {ALL_STATUSES.map((s) => (
          <RailButton
            key={s}
            active={statusFilter === s}
            onClick={() => onStatusChange(s)}
            count={statusCounts[s]}
          >
            {s}
          </RailButton>
        ))}
      </div>

      {/* Focus Area */}
      <div className="mb-7">
        <RailLabel>Focus area</RailLabel>
        <RailButton active={focusFilter === 'All'} onClick={() => onFocusChange('All')} count={totalCount}>
          All areas
        </RailButton>
        {FOCUS_AREAS.map((f) => (
          <RailButton
            key={f}
            active={focusFilter === f}
            onClick={() => onFocusChange(f)}
            count={focusCounts[f]}
            accentColor={FOCUS_AREA_COLOR[f]}
          >
            {f}
          </RailButton>
        ))}
      </div>

      {/* Community */}
      <div className="pt-3.5 border-t border-[#e2e2dc]">
        <label className="flex items-center gap-2.5 cursor-pointer text-[14px]" style={{ color: '#54585f' }}>
          <input
            type="checkbox"
            checked={communityOnly}
            onChange={(e) => onCommunityToggle(e.target.checked)}
            className="w-[15px] h-[15px] rounded"
            style={{ accentColor: '#1f3df0' }}
          />
          Community only
          <span className="font-display text-[12px] ml-auto" style={{ color: '#8a8f98' }}>
            {communityCount}
          </span>
        </label>
      </div>

    </aside>
  );
}
