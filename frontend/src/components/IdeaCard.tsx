import { useState } from 'react';
import { Star } from 'lucide-react';
import type { Idea } from '../types';
import { STATUS_META, FOCUS_AREA_COLOR } from '../types';

interface Props {
  idea: Idea;
  voted: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onSelect: (idea: Idea) => void;
  onRequestLogin: () => void;
}

export default function IdeaCard({ idea, voted, isLoggedIn, onVote, onSelect, onRequestLogin }: Props) {
  const [hovered, setHovered] = useState(false);
  const [voteHovered, setVoteHovered] = useState(false);

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onRequestLogin(); return; }
    if (!voted) onVote(idea.id);
  }

  const focusColor = idea.focusArea ? FOCUS_AREA_COLOR[idea.focusArea] : '#8a8f98';
  const statusMeta = STATUS_META[idea.status];
  const dateLabel = idea.completedDate ?? idea.targetDate ?? 'Unscheduled';

  return (
    <div
      className="relative border-b border-[#e2e2dc] cursor-pointer overflow-hidden"
      style={{
        padding: `22px ${hovered ? '8px' : '8px'} 22px ${hovered ? '14px' : '0'}`,
        transition: 'padding 0.18s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(idea)}
    >
      {/* Accent bar */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 transition-all duration-200"
        style={{ width: hovered ? '4px' : '0', background: focusColor }}
      />

      <div className="grid items-center gap-[22px]" style={{ gridTemplateColumns: '88px 1fr auto' }}>

        {/* Vote column */}
        <button
          onClick={handleVote}
          disabled={voted}
          aria-label={voted ? `Already voted — ${idea.votes} votes` : `Upvote — ${idea.votes} votes`}
          className="text-right self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3df0] focus-visible:ring-offset-2 rounded"
          onMouseEnter={() => setVoteHovered(true)}
          onMouseLeave={() => setVoteHovered(false)}
        >
          <div className="flex justify-end mb-1" style={{ opacity: voteHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `7px solid ${voted ? '#cfd0c9' : '#1f3df0'}` }} />
          </div>
          <div
            className="font-display font-semibold text-[42px] leading-none tracking-[-0.03em]"
            style={{ color: idea.votes === 0 ? '#d4d4cf' : '#16181c' }}
          >
            {idea.votes}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] mt-1 font-display" style={{ color: '#8a8f98' }}>
            votes
          </div>
        </button>

        {/* Middle: title + description + chips */}
        <div>
          <h3
            className="font-display font-medium text-[21px] leading-[1.15] tracking-[-0.01em]"
            style={{ color: '#16181c' }}
          >
            {idea.title}
          </h3>
          <p className="text-[13.5px] leading-[1.55] mt-2 line-clamp-3" style={{ color: '#54585f', maxWidth: '62ch' }}>
            {idea.summary}
          </p>
          <div className="flex items-center gap-3.5 mt-2 flex-wrap">
            {idea.focusArea && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium font-display" style={{ color: focusColor }}>
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: focusColor }} />
                {idea.focusArea}
              </span>
            )}
            {idea.ideaType && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium font-display" style={{ color: '#8a8f98' }}>
                ⚙ {idea.ideaType}
              </span>
            )}
          </div>
        </div>

        {/* Right: status + date + community star */}
        <div className="flex flex-col items-end gap-2 text-right min-w-[118px]">
          <span
            className="inline-flex items-center gap-1.5 font-display font-medium text-[12.5px] px-3 py-[5px] rounded-full"
            style={{ background: statusMeta.bg, color: statusMeta.color }}
          >
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: statusMeta.color }} />
            {idea.status}
          </span>
          <span className="font-display text-[13px] tracking-[0.03em]" style={{ color: '#8a8f98' }}>
            {dateLabel}
          </span>
          {idea.communitySubmitted && (
            <span title="Community submitted" aria-label="Community submitted">
              <Star aria-hidden="true" className="w-3.5 h-3.5" style={{ fill: '#d8b021', color: '#d8b021' }} />
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
