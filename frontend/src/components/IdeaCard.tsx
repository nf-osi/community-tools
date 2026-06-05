import React from 'react';
import { ChevronUp, Star, Wrench, Dna, CalendarClock, CalendarCheck } from 'lucide-react';
import type { Idea } from '../types';
import { STATUS_COLORS, FOCUS_AREA_COLORS, IDEA_TYPE_BADGE } from '../types';

interface Props {
  idea: Idea;
  voted: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onSelect: (idea: Idea) => void;
  onRequestLogin: () => void;
}

export default function IdeaCard({ idea, voted, isLoggedIn, onVote, onSelect, onRequestLogin }: Props) {
  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onRequestLogin(); return; }
    if (!voted) onVote(idea.id);
  }

  return (
    <div
      onClick={() => onSelect(idea)}
      className="bg-white shadow-sm hover:shadow-lg border border-gray-100 hover:border-brand-200 transition-all cursor-pointer overflow-hidden group flex flex-col"
    >
      <div className="flex flex-1">
        {/* Left vote column */}
        <div className="flex flex-col items-center justify-start pt-4 pb-4 px-3 border-r border-gray-100 min-w-[56px] flex-shrink-0">
          <button
            onClick={handleVote}
            disabled={voted}
            title={voted ? 'Already voted' : 'Upvote this idea'}
            className={`flex flex-col items-center gap-0.5 rounded p-1.5 transition-colors hover:bg-accent-300/60 ${
              voted ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <ChevronUp className={`w-4 h-4 transition-colors ${voted ? 'text-brand-400 group-hover:text-brand-600' : 'text-gray-300 group-hover:text-brand-300'}`} />
            <span className={`font-display text-2xl font-bold leading-none tracking-tight transition-colors ${voted ? 'text-brand-600 group-hover:text-brand-800' : 'text-gray-700'}`}>
              {idea.votes}
            </span>
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 p-4 min-w-0">
          {/* Badges + community star */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex flex-wrap gap-1.5">
              {idea.ideaType && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${IDEA_TYPE_BADGE[idea.ideaType]}`}>
                  {idea.ideaType === 'Infrastructure' ? <Wrench className="w-3 h-3" /> : <Dna className="w-3 h-3" />}
                  {idea.ideaType}
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[idea.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {idea.status}
              </span>
            </div>
            {idea.communitySubmitted && (
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm leading-snug text-gray-900 mb-1.5 line-clamp-2 group-hover:text-brand-700 transition-colors">
            {idea.title}
          </h3>

          {/* Summary */}
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {idea.summary}
          </p>
        </div>
      </div>

      {/* Footer zone */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 min-w-0 overflow-hidden">
        {idea.focusArea && (
          <span className={`text-xs font-semibold truncate ${(FOCUS_AREA_COLORS[idea.focusArea] ?? 'text-gray-500').split(' ')[1]}`}>
            {idea.focusArea}
          </span>
        )}
        {idea.completedDate && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium flex-shrink-0 ml-auto">
            <CalendarCheck className="w-3 h-3" />
            {idea.completedDate}
          </span>
        )}
        {!idea.completedDate && idea.targetDate && (
          <span className="flex items-center gap-1 text-xs text-brand-500 font-medium flex-shrink-0 ml-auto">
            <CalendarClock className="w-3 h-3" />
            {idea.targetDate}
          </span>
        )}
      </div>
    </div>
  );
}
