import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SYNAPSE_LOGIN_URL = 'https://www.synapse.org/';

export default function LoginPrompt({ onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded p-1 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-base font-bold text-brand-900 mb-1">Sign in to upvote</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your vote signals priority to the NF-OSI team and helps funders understand what the community needs most.
          </p>
        </div>

        <a
          href={SYNAPSE_LOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full px-4 py-2.5 bg-brand-900 text-white text-sm font-semibold rounded hover:bg-brand-800 transition-colors shadow-sm"
        >
          Sign in with Synapse
        </a>
      </div>
    </div>
  );
}
