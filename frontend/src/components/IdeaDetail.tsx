import React, { useEffect } from 'react';
import { X, ChevronUp, Star, ExternalLink, Tag, User, DollarSign, Wrench, Dna, CalendarClock, CalendarCheck, Github } from 'lucide-react';
import type { Idea } from '../types';
import { STATUS_COLORS, FOCUS_AREA_COLORS, IDEA_TYPE_BADGE } from '../types';

const DISCUSSION_PROJECT = 'syn75279249';

interface Props {
  idea: Idea;
  voted: boolean;
  isLoggedIn: boolean;
  onVote: (id: string) => void;
  onClose: () => void;
  onRequestLogin: () => void;
}

export default function IdeaDetail({ idea, voted, isLoggedIn, onVote, onClose, onRequestLogin }: Props) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const threadUrl = idea.threadId
    ? `https://www.synapse.org/Synapse:${DISCUSSION_PROJECT}/discussion/threadId=${idea.threadId}`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-detail-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-2xl mb-8 overflow-hidden">
        {/* Idea-type accent strip */}
        <div aria-hidden="true" className={`h-1 ${idea.ideaType === 'New Data' ? 'bg-emerald-400' : 'bg-brand-500'}`} />
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b border-gray-100">
          <div className="flex-1 pr-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {idea.ideaType && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${IDEA_TYPE_BADGE[idea.ideaType]}`}>
                  <span aria-hidden="true">{idea.ideaType === 'Infrastructure' ? <Wrench className="w-3.5 h-3.5" /> : <Dna className="w-3.5 h-3.5" />}</span>
                  {idea.ideaType}
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[idea.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {idea.status}
              </span>
              {idea.focusArea && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${FOCUS_AREA_COLORS[idea.focusArea] ?? 'bg-gray-50 text-gray-600'}`}>
                  {idea.focusArea}
                </span>
              )}
              {idea.communitySubmitted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                  <Star aria-hidden="true" className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  Community Submitted
                </span>
              )}
            </div>
            <h2 id="idea-detail-title" className="font-display italic text-2xl text-gray-900 leading-snug">{idea.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 rounded p-1.5 hover:bg-gray-100 flex-shrink-0 transition-colors"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Summary</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{idea.summary}</p>
          </div>

          {/* Metadata grid */}
          <dl className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <MetaField label="Priority" value={idea.priority} />
            <MetaField label="Submitted by" value={idea.submitter} icon={<User className="w-3.5 h-3.5" />} />
            {idea.targetDate && (
              <MetaField label="Target" value={idea.targetDate} icon={<CalendarClock className="w-3.5 h-3.5" />} />
            )}
            {idea.completedDate && (
              <MetaField label="Completed" value={idea.completedDate} icon={<CalendarCheck className="w-3.5 h-3.5" />} />
            )}
            {idea.affectedUserType && (
              <MetaField label="Affected users" value={idea.affectedUserType} />
            )}
            {idea.grantTag && (
              <MetaField label="Grant / Initiative" value={idea.grantTag} icon={<Tag className="w-3.5 h-3.5" />} />
            )}
            {idea.suggestedFunding && (
              <MetaField label="Suggested funding" value={idea.suggestedFunding} icon={<DollarSign className="w-3.5 h-3.5" />} />
            )}
          </dl>

          {/* Vote + discussion */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={() => isLoggedIn ? (!voted && onVote(idea.id)) : onRequestLogin()}
              disabled={voted}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm transition-all ${
                voted
                  ? 'bg-brand-50 text-brand-500 cursor-default border border-brand-200'
                  : 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm hover:shadow'
              }`}
            >
              <ChevronUp className="w-4 h-4" />
              {voted ? `Voted (${idea.votes})` : `Upvote (${idea.votes})`}
            </button>

            {threadUrl && (
              <a
                href={threadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 hover:border-brand-400 transition-all shadow-sm"
              >
                <ExternalLink aria-hidden="true" className="w-4 h-4" />
                Discuss on Synapse
              </a>
            )}

            {idea.issueUrl && (
              <a
                href={idea.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                <Github aria-hidden="true" className="w-4 h-4" />
                {(() => {
                  const n = idea.issueUrl!.match(/\/issues\/(\d+)/)?.[1];
                  return n ? `Issue #${n}` : 'Track on GitHub';
                })()}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="flex items-center gap-1 text-sm text-gray-700">
        {icon && <span className="text-gray-400">{icon}</span>}
        {value}
      </dd>
    </div>
  );
}
