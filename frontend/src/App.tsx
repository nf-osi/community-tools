import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
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
      <header className="max-w-7xl mx-auto px-10 pt-8 pb-0 flex items-start gap-5">
        <div className="flex-1">
          <img src="/logo.svg" alt="NF-OSI" className="h-8 w-auto mb-3" />
          <h1
            className="font-display font-semibold text-[46px] leading-[.98] tracking-[-0.025em]"
            style={{ color: '#16181c' }}
          >
            Community<br />Roadmap
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-2 flex-shrink-0">
          <button
            onClick={loadIdeas}
            disabled={loading}
            title="Refresh"
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center border transition-colors disabled:opacity-30"
            style={{ borderColor: '#cfd0c9', color: '#54585f' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isLoggedIn ? (
            <>
              <span className="hidden sm:block text-sm font-medium px-1" style={{ color: '#54585f' }}>
                {user!.username}
              </span>
              <button
                onClick={() => setShowForm(true)}
                className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full transition-colors"
                style={{ background: '#16181c', color: '#f6f6f3' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1f3df0')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16181c')}
              >
                + Submit idea
              </button>
              <button
                onClick={handleLogout}
                className="text-sm px-3 py-2 rounded transition-colors"
                style={{ color: '#54585f' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href={`${import.meta.env.VITE_AUTH_BASE ?? ''}/api/auth/login`}
              className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full transition-colors"
              style={{ background: '#16181c', color: '#f6f6f3' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1f3df0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#16181c')}
            >
              Sign in
            </a>
          )}
        </div>
      </header>

      {/* View tabs */}
      <div className="border-b border-[#e2e2dc] mt-7">
        <div className="max-w-7xl mx-auto px-10 flex gap-[30px]">
          <button
            onClick={() => setView('grid')}
            className="font-display font-medium text-[15px] py-3.5 border-b-2 -mb-px transition-colors"
            style={{
              color: view === 'grid' ? '#16181c' : '#8a8f98',
              borderBottomColor: view === 'grid' ? '#1f3df0' : 'transparent',
            }}
          >
            Roadmap ideas
          </button>
          <button
            onClick={() => setView('timeline')}
            className="font-display font-medium text-[15px] py-3.5 border-b-2 -mb-px transition-colors"
            style={{
              color: view === 'timeline' ? '#16181c' : '#8a8f98',
              borderBottomColor: view === 'timeline' ? '#1f3df0' : 'transparent',
            }}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-10 py-8">
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
                <p className="font-display text-lg" style={{ color: '#8a8f98' }}>
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
                <div
                  className="font-display text-[13px] uppercase tracking-[0.04em] mb-0.5"
                  style={{ color: '#8a8f98' }}
                >
                  {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''} · sorted by {sortBy === 'votes' ? 'votes' : 'newest'}
                </div>
                <div className="border-t-2" style={{ borderColor: '#16181c' }}>
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
                  <div className="flex items-center justify-end gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="font-display font-medium text-sm px-3 h-10 rounded border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: '#cfd0c9', color: '#54585f' }}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className="font-display font-medium text-sm w-10 h-10 rounded border transition-colors"
                        style={currentPage === page
                          ? { background: '#16181c', color: '#f6f6f3', borderColor: '#16181c' }
                          : { borderColor: '#cfd0c9', color: '#54585f' }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="font-display font-medium text-sm px-3 h-10 rounded border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: '#cfd0c9', color: '#54585f' }}
                    >
                      Next
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
