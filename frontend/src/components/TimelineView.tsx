import { useState } from 'react';
import { Star } from 'lucide-react';
import type { Idea } from '../types';
import { STATUS_META, FOCUS_AREA_COLOR } from '../types';

interface Props {
  ideas: Idea[];
  votedIds: Set<string>;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onSelect: (idea: Idea) => void;
  onRequestLogin: () => void;
}

function quarterToSortKey(q: string): number {
  const [quarter, year] = q.split(' ');
  return parseInt(year) * 10 + parseInt(quarter[1]);
}

function effectiveQuarter(idea: Idea): string | null {
  return idea.completedDate ?? idea.targetDate ?? null;
}

export default function TimelineView({ ideas, votedIds, isLoggedIn, onVote, onSelect, onRequestLogin }: Props) {
  // Only scheduled ideas reach the timeline; unscheduled ones live on the ideas tab.
  const dated = ideas.filter((i) => effectiveQuarter(i) !== null);

  const groups = new Map<string, Idea[]>();
  for (const idea of dated) {
    const q = effectiveQuarter(idea)!;
    if (!groups.has(q)) groups.set(q, []);
    groups.get(q)!.push(idea);
  }

  const sortedQuarters = [...groups.keys()].sort(
    (a, b) => quarterToSortKey(a) - quarterToSortKey(b)
  );

  const now = new Date();
  const currentQuarterKey = now.getFullYear() * 10 + Math.ceil((now.getMonth() + 1) / 3);

  function isPast(q: string) {
    return quarterToSortKey(q) < currentQuarterKey;
  }

  const allGroups: Array<{ key: string; label: string; past: boolean; ideas: Idea[] }> =
    sortedQuarters.map((q) => ({
      key: q,
      label: q,
      past: isPast(q),
      ideas: groups.get(q)!,
    }));

  return (
    <div className="max-w-2xl">
      {allGroups.map((group, idx) => {
        const isLast = idx === allGroups.length - 1;
        return (
          <div key={group.key} className="flex gap-6">
            {/* Spine */}
            <div className="flex flex-col items-center w-6 flex-shrink-0 pt-[3px]">
              {group.past ? (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: '#16181c' }}
                />
              ) : (
                <div
                  className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: '#16181c', background: 'transparent' }}
                />
              )}
              {!isLast && (
                <div className="w-px flex-1 mt-1.5" style={{ background: '#e2e2dc' }} />
              )}
            </div>

            {/* Quarter group */}
            <div className="pb-10 flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-display font-medium text-[15px] uppercase tracking-[0.1em]"
                  style={{ color: group.past ? '#8a8f98' : '#16181c' }}
                >
                  {group.label}
                </span>
                {group.past && (
                  <span className="font-display text-[11px] uppercase tracking-[0.14em]" style={{ color: '#8a8f98' }}>
                    completed
                  </span>
                )}
              </div>

              <div className="border-t" style={{ borderColor: '#e2e2dc' }}>
                {group.ideas.map((idea) => (
                  <TimelineRow
                    key={idea.id}
                    idea={idea}
                    voted={votedIds.has(idea.id)}
                    isLoggedIn={isLoggedIn}
                    onVote={onVote}
                    onSelect={onSelect}
                    onRequestLogin={onRequestLogin}
                    muted={group.past}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineRow({ idea, voted, isLoggedIn, onVote, onSelect, onRequestLogin, muted }: {
  idea: Idea;
  voted: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onSelect: (idea: Idea) => void;
  onRequestLogin: () => void;
  muted: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [voteHovered, setVoteHovered] = useState(false);

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onRequestLogin(); return; }
    if (!voted) onVote(idea.id);
  }

  const focusColor = idea.focusArea ? FOCUS_AREA_COLOR[idea.focusArea] : '#8a8f98';
  const statusMeta = STATUS_META[idea.status];

  return (
    <div
      className="relative border-b cursor-pointer overflow-hidden"
      style={{
        borderColor: '#e2e2dc',
        padding: `16px ${hovered ? '8px' : '8px'} 16px ${hovered ? '12px' : '0'}`,
        transition: 'padding 0.18s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(idea)}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-200"
        style={{ width: hovered ? '3px' : '0', background: focusColor }}
      />

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: '56px 1fr auto' }}>

        {/* Vote */}
        <button
          onClick={handleVote}
          disabled={voted}
          title={voted ? 'Already voted' : 'Upvote'}
          className="text-right focus:outline-none"
          onMouseEnter={() => setVoteHovered(true)}
          onMouseLeave={() => setVoteHovered(false)}
        >
          <div className="flex justify-end mb-1" style={{ opacity: voteHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `6px solid ${voted ? '#cfd0c9' : '#1f3df0'}` }} />
          </div>
          <div
            className="font-display font-semibold text-[28px] leading-none tracking-[-0.03em]"
            style={{ color: idea.votes === 0 ? '#d4d4cf' : muted ? '#8a8f98' : '#16181c' }}
          >
            {idea.votes}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] mt-0.5 font-display" style={{ color: '#8a8f98' }}>
            votes
          </div>
        </button>

        {/* Title + chips */}
        <div>
          <h3
            className="font-display font-medium text-[16px] leading-snug tracking-[-0.01em]"
            style={{ color: muted ? '#54585f' : '#16181c' }}
          >
            {idea.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {idea.focusArea && (
              <span className="flex items-center gap-1.5 text-[12px] font-medium font-display" style={{ color: focusColor }}>
                <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: focusColor }} />
                {idea.focusArea}
              </span>
            )}
            {idea.communitySubmitted && (
              <Star className="w-3 h-3 flex-shrink-0" style={{ fill: '#d8b021', color: '#d8b021' }} />
            )}
          </div>
        </div>

        {/* Status */}
        <span
          className="inline-flex items-center gap-1.5 font-display font-medium text-[12px] px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: statusMeta.bg, color: statusMeta.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusMeta.color }} />
          {idea.status}
        </span>

      </div>
    </div>
  );
}
