import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Loader2, LayoutGrid, GanttChartSquare } from 'lucide-react';
import { fetchIdeas, createIdea, voteForIdea, fetchSession, logout } from './api';
import type { Idea, IdeaFormData, Status, FocusArea, User } from './types';
import FacetFilters from './components/FacetFilters';
import IdeaCard from './components/IdeaCard';
import IdeaDetail from './components/IdeaDetail';
import IdeaForm from './components/IdeaForm';
import SubmissionConfirmation from './components/SubmissionConfirmation';
import TimelineView from './components/TimelineView';
import LoginPrompt from './components/LoginPrompt';

function loadVotedIds(): Set<string> {
  try {
    const stored = localStorage.getItem('roadmap-voted');
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveVotedIds(ids: Set<string>) {
  localStorage.setItem('roadmap-voted', JSON.stringify([...ids]));
}

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submittedIdea, setSubmittedIdea] = useState<Idea | null>(null);
  const [view, setView] = useState<'grid' | 'timeline'>('grid');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = user !== null;
  const [votedIds, setVotedIds] = useState<Set<string>>(loadVotedIds);

  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [focusFilter, setFocusFilter] = useState<FocusArea | 'All'>('All');
  const [communityOnly, setCommunityOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 6;

  async function loadIdeas() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIdeas();
      setIdeas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIdeas();
    fetchSession().then(({ user }) => setUser(user));
  }, []);

  // Handle auth errors from OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      setUser(null);
      setError(`Sign-in failed (${authError}). Please try again.`);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Reset to page 1 whenever filters or sort change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, focusFilter, communityOnly, sortBy]);

  const filteredIdeas = useMemo(() => {
    let result = ideas;
    if (statusFilter !== 'All') result = result.filter((i) => i.status === statusFilter);
    if (focusFilter !== 'All') result = result.filter((i) => i.focusArea === focusFilter);
    if (communityOnly) result = result.filter((i) => i.communitySubmitted);

    return [...result].sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes;
      const numA = parseInt(a.id.replace('syn', ''), 10);
      const numB = parseInt(b.id.replace('syn', ''), 10);
      return numB - numA;
    });
  }, [ideas, statusFilter, focusFilter, communityOnly, sortBy]);

  // Paginate the grid only when showing all statuses (filtered views are already narrow)
  const shouldPaginate = statusFilter === 'All' && view === 'grid';
  const totalPages = shouldPaginate ? Math.ceil(filteredIdeas.length / PAGE_SIZE) : 1;
  const pagedIdeas = shouldPaginate
    ? filteredIdeas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredIdeas;

  async function handleVote(id: string) {
    if (votedIds.has(id)) return;
    try {
      const { votes } = await voteForIdea(id);
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, votes } : idea)));
      setSelectedIdea((prev) => (prev?.id === id ? { ...prev, votes } : prev));
      const next = new Set(votedIds).add(id);
      setVotedIds(next);
      saveVotedIds(next);
    } catch (err) {
      console.error('Vote failed:', err);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  async function handleCreateIdea(data: IdeaFormData) {
    const newIdea = await createIdea(data);
    setShowForm(false);
    setSubmittedIdea(newIdea);
    setStatusFilter('All');
    setFocusFilter('All');
    setCommunityOnly(false);
    setSortBy('newest');
    await loadIdeas();
  }

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header className="bg-transparent sticky top-0 z-40 border-b border-brand-200/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[11px] font-semibold text-brand-500 uppercase tracking-[0.2em]">
                NF-OSI
              </span>
              <span className="text-brand-300">·</span>
              <h1 className="font-display italic text-[2rem] leading-tight text-brand-900">
                Community Roadmap
              </h1>
            </div>
            <p className="text-sm text-brand-600 hidden sm:block mt-0.5">
              Propose infrastructure improvements or new data for NF research — upvote priorities and join the discussion.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex rounded border border-brand-200 overflow-hidden">
              <button
                onClick={() => setView('grid')}
                title="Grid view"
                className={`p-2 transition-colors ${view === 'grid' ? 'bg-brand-100 text-brand-800' : 'text-brand-400 hover:text-brand-700 hover:bg-brand-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('timeline')}
                title="Timeline view"
                className={`p-2 transition-colors ${view === 'timeline' ? 'bg-brand-100 text-brand-800' : 'text-brand-400 hover:text-brand-700 hover:bg-brand-50'}`}
              >
                <GanttChartSquare className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={loadIdeas}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded text-brand-400 hover:text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-30"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {isLoggedIn ? (
              <>
                <span className="hidden sm:block text-xs text-brand-500 font-medium px-2">
                  {user!.username}
                </span>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white text-sm font-semibold rounded hover:bg-brand-800 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Submit an Idea
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a
                href={`${import.meta.env.VITE_AUTH_BASE ?? ''}/api/auth/login`}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-900 text-white text-sm font-semibold rounded hover:bg-brand-800 transition-colors shadow-sm"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-12">
          <FacetFilters
            statusFilter={statusFilter}
            focusFilter={focusFilter}
            communityOnly={communityOnly}
            sortBy={sortBy}
            totalCount={ideas.length}
            filteredCount={filteredIdeas.length}
            ideas={ideas}
            onStatusChange={setStatusFilter}
            onFocusChange={setFocusFilter}
            onCommunityToggle={setCommunityOnly}
            onSortChange={setSortBy}
          />

          <main className="flex-1 min-w-0">
            {loading && ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-brand-300">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm text-gray-400">Loading roadmap items…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24">
                <p className="text-sm font-medium text-red-500 mb-3">{error}</p>
                <button onClick={loadIdeas} className="text-sm text-brand-600 hover:text-brand-700 font-medium hover:underline">
                  Try again
                </button>
              </div>
            ) : filteredIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <p className="font-display italic text-lg text-brand-300">
                  {ideas.length === 0 ? 'No ideas yet — be the first to submit one.' : 'No ideas match the current filters.'}
                </p>
              </div>
            ) : view === 'timeline' ? (
              <TimelineView
                ideas={filteredIdeas}
                votedIds={votedIds}
                isLoggedIn={isLoggedIn}
                onVote={handleVote}
                onSelect={setSelectedIdea}
                onRequestLogin={() => setShowLoginModal(true)}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pagedIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      voted={votedIds.has(idea.id)}
                      isLoggedIn={isLoggedIn}
                      onVote={handleVote}
                      onSelect={setSelectedIdea}
                      onRequestLogin={() => setShowLoginModal(true)}
                    />
                  ))}
                </div>

                {shouldPaginate && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm rounded-md transition-colors font-medium ${
                          currentPage === page
                            ? 'bg-brand-600 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          voted={votedIds.has(selectedIdea.id)}
          isLoggedIn={isLoggedIn}
          onVote={handleVote}
          onClose={() => setSelectedIdea(null)}
          onRequestLogin={() => setShowLoginModal(true)}
        />
      )}
      {showForm && (
        <IdeaForm
          onSubmit={handleCreateIdea}
          onClose={() => setShowForm(false)}
        />
      )}
      {submittedIdea && (
        <SubmissionConfirmation
          idea={submittedIdea}
          onClose={() => setSubmittedIdea(null)}
        />
      )}
      {showLoginModal && (
        <LoginPrompt onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}
