import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Loader2, Lightbulb, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from './router';
import { loginUrl } from './loginUrl';
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
  const [formInitialTitle, setFormInitialTitle] = useState('');
  const [submittedIdea, setSubmittedIdea] = useState<Idea | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  // Set when arriving from the gallery's "Submit a new agent" card (/roadmap?new=agent).
  const [pendingNewAgent, setPendingNewAgent] = useState(
    () => new URLSearchParams(window.location.search).get('new') === 'agent'
  );
  const [view, setView] = useState<'grid' | 'timeline'>('grid');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = user !== null;
  const [votedIds, setVotedIds] = useState<Set<string>>(loadVotedIds);

  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [focusFilter, setFocusFilter] = useState<FocusArea | 'All'>('All');
  const [communityOnly, setCommunityOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 15;
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeaderHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    fetchSession()
      .then(({ user }) => setUser(user))
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  // "Submit a new agent" intent from the gallery: open the form prefilled once
  // we know the auth state (or prompt login if signed out). Clean the URL.
  useEffect(() => {
    if (pendingNewAgent) window.history.replaceState({}, '', '/roadmap');
  }, [pendingNewAgent]);
  useEffect(() => {
    if (!pendingNewAgent || !sessionChecked) return;
    if (user) {
      setFormInitialTitle('New agent: ');
      setShowForm(true);
    } else {
      setShowLoginModal(true);
    }
    setPendingNewAgent(false);
  }, [pendingNewAgent, sessionChecked, user]);

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
  useEffect(() => { setCurrentPage(1); }, [statusFilter, focusFilter, communityOnly, sortBy, dateFrom, dateTo]);

  function quarterKey(q: string): number {
    const [quarter, year] = q.split(' ');
    return parseInt(year) * 10 + parseInt(quarter[1]);
  }

  const filteredIdeas = useMemo(() => {
    // The Roadmap ideas tab shows every idea; the Timeline is restricted to
    // scheduled ideas (those with a target or completed quarter).
    const isScheduled = (i: Idea) => Boolean(i.targetDate || i.completedDate);
    let result = view === 'timeline' ? ideas.filter(isScheduled) : [...ideas];
    if (statusFilter !== 'All') result = result.filter((i) => i.status === statusFilter);
    if (focusFilter !== 'All') result = result.filter((i) => i.focusArea === focusFilter);
    if (communityOnly) result = result.filter((i) => i.communitySubmitted);
    if (dateFrom || dateTo) {
      result = result.filter((i) => {
        const d = i.completedDate ?? i.targetDate;
        if (!d) return false;
        const key = quarterKey(d);
        if (dateFrom && key < quarterKey(dateFrom)) return false;
        if (dateTo && key > quarterKey(dateTo)) return false;
        return true;
      });
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes;
      const numA = parseInt(a.id.replace('syn', ''), 10);
      const numB = parseInt(b.id.replace('syn', ''), 10);
      return numB - numA;
    });
  }, [ideas, view, statusFilter, focusFilter, communityOnly, sortBy, dateFrom, dateTo]);

  // Paginate the grid only when showing all statuses (filtered views are already narrow)
  const shouldPaginate = statusFilter === 'All' && view === 'grid';
  const totalPages = shouldPaginate ? Math.ceil(filteredIdeas.length / PAGE_SIZE) : 1;
  const pagedIdeas = shouldPaginate
    ? filteredIdeas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredIdeas;

  const [voteError, setVoteError] = useState<string | null>(null);

  async function handleVote(id: string) {
    if (votedIds.has(id)) return;
    setVoteError(null);
    try {
      const { votes } = await voteForIdea(id);
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, votes } : idea)));
      setSelectedIdea((prev) => (prev?.id === id ? { ...prev, votes } : prev));
      const next = new Set(votedIds).add(id);
      setVotedIds(next);
      saveVotedIds(next);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : 'Vote failed. Please try again.');
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
      <div ref={headerRef} className="sticky top-0 z-40 bg-white border-b border-[#e2e2dc]">
      <div className="max-w-7xl mx-auto px-10 pt-3 flex items-center justify-between text-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: '#8a8f98' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Home
        </Link>
        <a
          href="https://nf.synapse.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:underline"
          style={{ color: '#8a8f98' }}
        >
          NF Data Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
      <header className="max-w-7xl mx-auto px-10 pt-5 flex items-end gap-5">
        <div className="flex items-start gap-5 flex-shrink-0 pb-px">
          <svg viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0 mt-1" aria-hidden="true">
            <circle cx="15" cy="17" r="9.5" fill="#0d6e62" opacity=".82"/>
            <circle cx="25" cy="14" r="7"   fill="#2c6fb0" opacity=".82"/>
            <circle cx="20" cy="26" r="7.5" fill="#6a4fb0" opacity=".82"/>
            <circle cx="28" cy="25" r="4.5" fill="#c98a18" opacity=".9"/>
          </svg>
          <div>
            <div className="font-display font-medium text-[15px] uppercase tracking-[0.18em]" style={{ color: '#8a8f98' }}>
              NF Data Portal
            </div>
            <h1
              className="font-display font-semibold text-[46px] leading-[.98] tracking-[-0.025em] mt-1"
              style={{ color: '#16181c' }}
            >
              Community<br />Roadmap
            </h1>
          </div>
        </div>

        {/* Tabs — centered in the blank header space */}
        <div role="tablist" aria-label="View" className="flex-1 flex justify-center gap-[30px]">
          <button
            role="tab"
            aria-selected={view === 'grid'}
            onClick={() => setView('grid')}
            className="font-display font-medium text-[15px] py-3.5 border-b-2 -mb-px transition-colors"
            style={{
              color: view === 'grid' ? '#16181c' : '#8a8f98',
              borderBottomColor: view === 'grid' ? '#1b7eab' : 'transparent',
            }}
          >
            Roadmap ideas
          </button>
          <button
            role="tab"
            aria-selected={view === 'timeline'}
            onClick={() => setView('timeline')}
            className="font-display font-medium text-[15px] py-3.5 border-b-2 -mb-px transition-colors"
            style={{
              color: view === 'timeline' ? '#16181c' : '#8a8f98',
              borderBottomColor: view === 'timeline' ? '#1b7eab' : 'transparent',
            }}
          >
            Timeline
          </button>
        </div>

        <div className="flex items-center gap-3 pb-3 flex-shrink-0">
          <button
            onClick={loadIdeas}
            disabled={loading}
            aria-label="Refresh ideas"
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center border transition-colors disabled:opacity-30"
            style={{ borderColor: '#cfd0c9', color: '#54585f' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>

          {isLoggedIn ? (
            <>
              <span className="hidden sm:block text-sm font-medium px-1" style={{ color: '#54585f' }}>
                {user!.username}
              </span>
              <button
                onClick={() => { setFormInitialTitle(''); setShowForm(true); }}
                className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full transition-colors"
                style={{ background: '#16181c', color: '#f6f6f3' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1b7eab')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16181c')}
              >
                <Lightbulb className="w-4 h-4 inline-block mr-1.5" />Submit idea
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
              href={loginUrl()}
              className="font-display font-medium text-sm px-[22px] py-[11px] rounded-full transition-colors"
              style={{ background: '#16181c', color: '#f6f6f3' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1b7eab')}
              onMouseLeave={e => (e.currentTarget.style.background = '#16181c')}
            >
              Log in
            </a>
          )}
        </div>
      </header>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-10 pt-8 pb-16">
        <div className="flex gap-12">
          <FacetFilters
            statusFilter={statusFilter}
            focusFilter={focusFilter}
            communityOnly={communityOnly}
            sortBy={sortBy}
            dateFrom={dateFrom}
            dateTo={dateTo}
            totalCount={ideas.length}
            filteredCount={filteredIdeas.length}
            ideas={ideas}
            stickyTop={headerHeight + 24}
            onStatusChange={setStatusFilter}
            onFocusChange={setFocusFilter}
            onCommunityToggle={setCommunityOnly}
            onSortChange={setSortBy}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />

          <main className="flex-1 min-w-0">
            {voteError && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                <span>{voteError}</span>
                <button onClick={() => setVoteError(null)} aria-label="Dismiss" className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
              </div>
            )}
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
              <div className="pl-16 h-[80vh] overflow-y-auto pr-4 timeline-scroll">
                <TimelineView
                  ideas={filteredIdeas}
                  votedIds={votedIds}
                  isLoggedIn={isLoggedIn}
                  onVote={handleVote}
                  onSelect={setSelectedIdea}
                  onRequestLogin={() => setShowLoginModal(true)}
                />
              </div>
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
                  <nav aria-label="Pagination" className="mt-10 flex flex-col items-center gap-2.5">
                    <p className="font-display text-[12px] uppercase tracking-[0.12em]" style={{ color: '#8a8f98' }}>
                      Page {currentPage} of {totalPages}
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-3.5"
                      style={{ background: '#fff', border: '1px solid #e2e2dc', boxShadow: '0 4px 24px rgba(22,24,28,0.10), 0 1px 4px rgba(22,24,28,0.06)' }}
                    >
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        className="font-display font-medium text-sm px-4 h-9 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ borderColor: '#cfd0c9', color: '#54585f' }}
                      >
                        ← Prev
                      </button>
                      <div className="flex items-center gap-1 mx-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            aria-label={`Page ${page}`}
                            aria-current={currentPage === page ? 'page' : undefined}
                            className="font-display font-semibold text-sm w-9 h-9 rounded-lg border transition-all"
                            style={currentPage === page
                              ? { background: '#16181c', color: '#f6f6f3', borderColor: '#16181c', boxShadow: '0 2px 8px rgba(22,24,28,0.18)' }
                              : { borderColor: '#e2e2dc', color: '#54585f', background: 'transparent' }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        className="font-display font-medium text-sm px-4 h-9 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ borderColor: '#cfd0c9', color: '#54585f' }}
                      >
                        Next →
                      </button>
                    </div>
                  </nav>
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
          initialTitle={formInitialTitle}
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
