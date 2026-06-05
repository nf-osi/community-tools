import React from 'react';
import { ChevronUp, CalendarCheck, CalendarClock, Wrench, Dna, Star } from 'lucide-react';
import type { Idea } from '../types';
import { STATUS_COLORS, IDEA_TYPE_BADGE } from '../types';

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
  const dated = ideas.filter((i) => effectiveQuarter(i) !== null);
  const undated = ideas.filter((i) => effectiveQuarter(i) === null);

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
  const currentQuarterKey = (now.getFullYear() * 10) + Math.ceil((now.getMonth() + 1) / 3);

  function isPast(q: string) {
    return quarterToSortKey(q) < currentQuarterKey;
  }

  return (
    <div className="max-w-2xl">
      {sortedQuarters.map((quarter, idx) => {
        const done = isPast(quarter);
        const isLast = idx === sortedQuarters.length - 1 && undated.length === 0;
        return (
          <div key={quarter} className="flex gap-5">
            {/* Spine */}
            <div className="flex flex-col items-center w-10 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5 ${
                done
                  ? 'bg-green-500 shadow-green-200'
                  : 'bg-white border-2 border-brand-400'
              }`}>
                {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              {!isLast && (
                <div className={`w-px flex-1 mt-1 ${done ? 'bg-green-200' : 'bg-brand-100'}`} />
              )}
            </div>

            {/* Quarter group */}
            <div className="pb-10 flex-1 min-w-0">
              <div className="flex items-baseline gap-2.5 mb-3">
                <h3 className={`font-display italic text-xl leading-none ${done ? 'text-green-700' : 'text-brand-700'}`}>
                  {quarter}
                </h3>
                <div className="flex items-center gap-1.5">
                  {done
                    ? <><CalendarCheck className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-green-500 font-medium">completed</span></>
                    : <><CalendarClock className="w-3.5 h-3.5 text-brand-300" /><span className="text-xs text-brand-400 font-medium">target</span></>
                  }
                </div>
              </div>

              <div className="space-y-2">
                {groups.get(quarter)!.map((idea) => (
                  <TimelineCard
                    key={idea.id}
                    idea={idea}
                    voted={votedIds.has(idea.id)}
                    isLoggedIn={isLoggedIn}
                    onVote={onVote}
                    onSelect={onSelect}
                    onRequestLogin={onRequestLogin}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Undated */}
      {undated.length > 0 && (
        <div className="flex gap-5">
          <div className="flex flex-col items-center w-10 flex-shrink-0">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 bg-white flex-shrink-0 mt-0.5" />
          </div>
          <div className="pb-8 flex-1 min-w-0">
            <h3 className="font-display italic text-xl text-gray-300 mb-3">Unscheduled</h3>
            <div className="space-y-2">
              {undated.map((idea) => (
                <TimelineCard
                  key={idea.id}
                  idea={idea}
                  voted={votedIds.has(idea.id)}
                  isLoggedIn={isLoggedIn}
                  onVote={onVote}
                  onSelect={onSelect}
                  onRequestLogin={onRequestLogin}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineCard({ idea, voted, isLoggedIn, onVote, onSelect, onRequestLogin }: {
  idea: Idea;
  voted: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onSelect: (idea: Idea) => void;
  onRequestLogin: () => void;
}) {
  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onRequestLogin(); return; }
    if (!voted) onVote(idea.id);
  }

  return (
    <div
      onClick={() => onSelect(idea)}
      className="flex items-center gap-3 bg-white border border-gray-200 overflow-hidden hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* Type accent */}
      <div className={`w-1 self-stretch flex-shrink-0 ${
        idea.ideaType === 'New Data' ? 'bg-emerald-400' :
        idea.ideaType === 'Infrastructure' ? 'bg-brand-400' : 'bg-gray-200'
      }`} />

      {/* Vote */}
      <button
        onClick={handleVote}
        disabled={voted}
        className={`flex items-center gap-1 rounded-md px-2 py-2 flex-shrink-0 transition-colors ${
          voted ? 'cursor-default' : 'hover:bg-brand-50'
        }`}
      >
        <ChevronUp className={`w-3.5 h-3.5 ${voted ? 'text-brand-400' : 'text-gray-300'}`} />
        <span className={`font-display font-bold text-base leading-none ${voted ? 'text-brand-600' : 'text-gray-500'}`}>
          {idea.votes}
        </span>
      </button>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {idea.ideaType && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${IDEA_TYPE_BADGE[idea.ideaType]}`}>
            {idea.ideaType === 'Infrastructure' ? <Wrench className="w-3 h-3" /> : <Dna className="w-3 h-3" />}
          </span>
        )}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[idea.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {idea.status}
        </span>
      </div>

      {/* Title */}
      <span className="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate group-hover:text-brand-700 transition-colors py-2.5 pr-3">
        {idea.title}
      </span>

      {/* Focus + community */}
      <div className="flex items-center gap-2 flex-shrink-0 pr-3">
        {idea.focusArea && (
          <span className="text-xs text-gray-400 hidden sm:block">{idea.focusArea}</span>
        )}
        {idea.communitySubmitted && (
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        )}
      </div>
    </div>
  );
}
