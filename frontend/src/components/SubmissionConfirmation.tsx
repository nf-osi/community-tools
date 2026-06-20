import { useEffect } from 'react';
import { CheckCircle, ExternalLink, X, Bell } from 'lucide-react';
import type { Idea } from '../types';

const DISCUSSION_PROJECT = 'syn75279249';

interface Props {
  idea: Idea;
  onClose: () => void;
}

export default function SubmissionConfirmation({ idea, onClose }: Props) {
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
      aria-labelledby="confirmation-title"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 id="confirmation-title" className="text-base font-bold text-gray-900">Idea submitted!</h2>
              <p className="text-sm text-gray-500">Thank you for contributing to the NF-OSI roadmap.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 rounded p-1.5 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Idea title */}
          <div className="bg-gray-50 rounded px-4 py-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Your idea</p>
            <p className="text-sm font-semibold text-gray-900">{idea.title}</p>
          </div>

          {/* Discussion thread section */}
          <div className="space-y-3">
            {threadUrl ? (
              <>
                <p className="text-sm text-gray-600">
                  A discussion thread has been opened on Synapse. Use it to add context, answer questions, or share supporting materials.
                </p>
                <a
                  href={threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 transition-colors shadow-sm"
                >
                  <ExternalLink aria-hidden="true" className="w-4 h-4" />
                  Open Discussion Thread on Synapse
                </a>
                {/* Subscribe tip */}
                <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded px-3 py-2.5">
                  <Bell aria-hidden="true" className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-brand-700 leading-relaxed">
                    <span className="font-semibold">Tip:</span> Synapse lets you subscribe to discussion threads. Click <span className="font-medium">Follow</span> in the thread to get email notifications when the community comments or the NF-OSI team responds.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Your idea has been recorded. The NF-OSI team will review it and open a discussion thread shortly.
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
