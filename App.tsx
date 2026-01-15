import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HNItem, FeedType } from './types';
import { fetchFeedIds, fetchItemsByIds, searchItemsByUser, fetchItem, fetchJobsAlgolia } from './services/hnApi';
import StoryCard from './components/StoryCard';
import StoryDetail from './components/StoryDetail';
import UserDetail from './components/UserDetail';
import JobCard from './components/JobCard';
import JobDetail from './components/JobDetail';

const ITEMS_PER_PAGE = 20;

export const LANGUAGES = [
  { code: 'Chinese', label: '中文' },
  { code: 'English', label: 'English' },
  { code: 'French', label: 'Français' },
  { code: 'German', label: 'Deutsch' },
  { code: 'Japanese', label: '日本語' },
  { code: 'Korean', label: '한국어' },
];

const FEED_CONFIG: { id: FeedType | 'favorites'; icon: string; label: string }[] = [
  { id: 'top', icon: '🔥', label: 'Top' },
  { id: 'new', icon: '✨', label: 'New' },
  { id: 'best', icon: '🏆', label: 'Best' },
  { id: 'show', icon: '🚀', label: 'Show' },
  { id: 'ask', icon: '💬', label: 'Ask' },
  { id: 'job', icon: '💼', label: 'Jobs' },
  { id: 'favorites', icon: '🔖', label: 'Saved' },
];

const App: React.FC = () => {
  const [feed, setFeed] = useState<FeedType | 'favorites'>('top');
  const [items, setItems] = useState<HNItem[]>([]);
  const [allIds, setAllIds] = useState<number[]>([]);
  const [page, setPage] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedStory, setSelectedStory] = useState<HNItem | null>(null);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSelectedVisible, setIsSelectedVisible] = useState(true);
  const [searchUser, setSearchUser] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('hn_local_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [targetLanguage, setTargetLanguage] = useState(() => {
    return localStorage.getItem('hn_target_lang') || 'Chinese';
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTrigger = useRef<HTMLDivElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('hn_local_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem('hn_target_lang', targetLanguage);
  }, [targetLanguage]);

  const feedRef = useRef(feed);
  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  const toggleFavorite = useCallback((id: number) => {
    setFavoriteIds(prev => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter(fid => fid !== id) : [...prev, id];
      if (isRemoving && feedRef.current === 'favorites') {
        setItems(currentItems => currentItems.filter(item => item.id !== id));
      }
      return next;
    });
  }, []);

  const loadInitialFeed = useCallback(async (type: FeedType | 'favorites', username?: string) => {
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(0);
    setHasMore(true);

    try {
      if (username) {
        const data = await searchItemsByUser(username, 'story');
        setItems(data);
        setAllIds([]); 
        setFeed('user');
      } else if (type === 'favorites') {
        const currentSaved = localStorage.getItem('hn_local_favorites');
        const ids = currentSaved ? JSON.parse(currentSaved) : [];
        const data = await fetchItemsByIds(ids);
        setItems([...data].reverse());
        setAllIds([]);
      } else if (type === 'job') {
        const data = await fetchJobsAlgolia(0);
        setItems(data);
        setAllIds([]);
        setHasMore(data.length > 0);
      } else {
        const ids = await fetchFeedIds(type as FeedType);
        setAllIds(ids);
        const initialBatch = ids.slice(0, ITEMS_PER_PAGE);
        const data = await fetchItemsByIds(initialBatch);
        setItems(data);
        setHasMore(data.length < ids.length);
      }
    } catch (err) {
      setError('Connection failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || feed === 'user' || feed === 'favorites') return;
    
    setLoadingMore(true);
    try {
      if (feed === 'job') {
        const nextPage = page + 1;
        const nextBatchItems = await fetchJobsAlgolia(nextPage);
        if (nextBatchItems.length === 0) {
          setHasMore(false);
        } else {
          setItems(prev => [...prev, ...nextBatchItems]);
          setPage(nextPage);
        }
      } else {
        const nextBatchIds = allIds.slice(items.length, items.length + ITEMS_PER_PAGE);
        if (nextBatchIds.length === 0) {
          setHasMore(false);
        } else {
          const nextBatchItems = await fetchItemsByIds(nextBatchIds);
          setItems(prev => [...prev, ...nextBatchItems]);
          setHasMore(items.length + nextBatchIds.length < allIds.length);
        }
      }
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [allIds, items.length, loadingMore, feed, page, hasMore]);

  useEffect(() => {
    if (searchUser) {
      loadInitialFeed('user', searchUser);
    } else {
      loadInitialFeed(feed);
    }
  }, [feed, searchUser, loadInitialFeed]);

  useEffect(() => {
    if (loading || feed === 'user' || feed === 'favorites' || !hasMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 0.1 });
    
    if (loadMoreTrigger.current) {
      observerRef.current.observe(loadMoreTrigger.current);
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadMore, feed, hasMore]);

  useEffect(() => {
    if (!selectedStory || !sidebarScrollRef.current) {
      setIsSelectedVisible(true);
      return;
    }
    if (visibilityObserverRef.current) visibilityObserverRef.current.disconnect();
    visibilityObserverRef.current = new IntersectionObserver(
      ([entry]) => setIsSelectedVisible(entry.isIntersecting),
      { root: sidebarScrollRef.current, threshold: 0.2 }
    );
    const element = document.getElementById(`story-card-${selectedStory.id}`);
    if (element) visibilityObserverRef.current.observe(element);
    return () => visibilityObserverRef.current?.disconnect();
  }, [selectedStory, items]);

  const handleStorySelect = async (story: HNItem) => {
    if (story.type === 'job') {
      const hasJobContent = (story.job_text && story.job_text.trim().length > 0) || (story.text && story.text.trim().length > 0);
      if (hasJobContent) {
        setActiveUsername(null);
        setSelectedStory(story);
        return;
      }
      if (story.url) {
        window.open(story.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    
    setActiveUsername(null);
    setSelectedStory(story);
    if (!story.kids && (story.descendants ?? 0) > 0) {
      try {
        const fullStory = await fetchItem(story.id);
        if (fullStory && fullStory.id === story.id) setSelectedStory(fullStory);
      } catch (err) { console.error(err); }
    }
  };

  const handleUserSelect = (username: string) => setActiveUsername(username);
  
  const handleNavClick = (id: FeedType | 'favorites') => {
    setSearchUser(null);
    setFeed(id);
    
    if (window.innerWidth < 1024) {
      setSelectedStory(null);
      setActiveUsername(null);
    }
  };

  const clearUserSearch = () => { setSearchUser(null); setFeed('top'); };
  
  const scrollToSelected = () => {
    if (!selectedStory) return;
    const element = document.getElementById(`story-card-${selectedStory.id}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const isJobFeed = feed === 'job';

  const Skeleton = () => (
    <div className={isJobFeed ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6" : "space-y-0"}>
      {[...Array(10)].map((_, i) => (
        <div key={i} className={`animate-pulse ${isJobFeed ? 'h-48 bg-gray-100 rounded-[2rem]' : 'flex gap-4 p-5 border-b border-gray-100'}`}>
          {!isJobFeed && (
            <>
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  const MoreLoader = () => (
    <div className="flex items-center justify-center py-6 gap-3">
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 border-2 border-orange-100 rounded-full" />
        <div className="absolute inset-0 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Loading More</span>
    </div>
  );

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 z-50 w-full bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm">H</div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Hacker News</h1>
            </div>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1.5">
            {FEED_CONFIG.map((f) => (
              <button
                key={f.id}
                onClick={() => handleNavClick(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  feed === f.id && !searchUser ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <span className="text-[15px] leading-none opacity-80">{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 flex items-center justify-end gap-4">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1 gap-2">
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none appearance-none text-orange-600 cursor-pointer"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Sidebar / List Section */}
        <section className={`relative flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 bg-white ${isJobFeed ? 'w-full' : 'w-full lg:w-[380px] border-r border-gray-100'} ${(selectedStory || activeUsername) && !isJobFeed ? 'hidden lg:flex' : 'flex'}`}>
          {searchUser && (
            <div className="bg-orange-50/50 border-b border-orange-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-orange-900 tracking-tight">{searchUser}</span>
              </div>
              <button onClick={clearUserSearch} className="text-[10px] font-black text-orange-500 hover:text-orange-700 bg-white px-2 py-1 rounded-lg border border-orange-100">CLOSE</button>
            </div>
          )}
          <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            {loading ? <Skeleton /> : error ? (
              <div className="p-20 text-center">
                <p className="text-gray-500 text-sm mb-6">{error}</p>
                <button onClick={() => searchUser ? loadInitialFeed('user', searchUser) : loadInitialFeed(feed)} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase">Retry</button>
              </div>
            ) : (
              <div className={isJobFeed ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 pb-20" : "divide-y divide-gray-50"}>
                {items.length === 0 ? (
                  <div className="col-span-full p-20 text-center">
                    <p className="text-gray-400 text-sm font-medium">No items found</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    isJobFeed ? (
                      <JobCard key={`${item.id}-${index}`} job={item} targetLanguage={targetLanguage} onSelect={handleStorySelect} />
                    ) : (
                      <StoryCard 
                        key={`${item.id}-${index}`} 
                        story={item} 
                        rank={index + 1}
                        onSelect={handleStorySelect}
                        onUserSelect={handleUserSelect}
                        targetLanguage={targetLanguage}
                        isSelected={selectedStory?.id === item.id}
                        isFavorite={favoriteIds.includes(item.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    )
                  ))
                )}
                {hasMore && (
                  <div ref={loadMoreTrigger} className="col-span-full">
                    {loadingMore && <MoreLoader />}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedStory && items.length > 5 && !isSelectedVisible && !isJobFeed && (
            <button onClick={scrollToSelected} title="Locate selected" className="absolute bottom-6 right-6 w-9 h-9 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 animate-in fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3"/></svg>
            </button>
          )}
        </section>
        
        {/* Preview Pane Section (ONLY for standard feeds) */}
        {!isJobFeed && (
          <section className={`flex-1 relative bg-white overflow-hidden ${(!selectedStory && !activeUsername) ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
            {!selectedStory && !activeUsername && (
              <div className="text-center p-10 max-w-sm animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-orange-50 rounded-[2.5rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-inner border border-orange-100/50">🗞️</div>
                <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Select a story</h2>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] leading-relaxed">Select a topic you're interested in</p>
              </div>
            )}
            <div className={`absolute inset-0 z-10 bg-white transition-opacity duration-200 ${selectedStory && selectedStory.type !== 'job' && !activeUsername ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              {selectedStory && selectedStory.type !== 'job' && (
                <StoryDetail story={selectedStory} onClose={() => setSelectedStory(null)} onUserSelect={handleUserSelect} targetLanguage={targetLanguage} isInline={true} isFavorite={favoriteIds.includes(selectedStory.id)} onToggleFavorite={toggleFavorite} />
              )}
            </div>
            <div className={`absolute inset-0 z-20 bg-white transition-transform duration-300 ease-out ${activeUsername ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
              {activeUsername && <UserDetail username={activeUsername} onClose={() => setActiveUsername(null)} onStorySelect={handleStorySelect} hasActiveStory={!!selectedStory} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />}
            </div>
          </section>
        )}

        {/* Global Modal Layer (For Jobs or User details in specific contexts) */}
        {((selectedStory && selectedStory.type === 'job') || (activeUsername && isJobFeed)) && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10 transition-opacity duration-300">
             <div className="w-full h-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-gray-100 animate-in fade-in zoom-in duration-300">
               {selectedStory && selectedStory.type === 'job' && (
                 <JobDetail job={selectedStory} onClose={() => setSelectedStory(null)} targetLanguage={targetLanguage} />
               )}
               {activeUsername && isJobFeed && (
                 <UserDetail username={activeUsername} onClose={() => setActiveUsername(null)} onStorySelect={handleStorySelect} hasActiveStory={!!selectedStory} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />
               )}
             </div>
          </div>
        )}
      </main>

      <nav className="lg:hidden flex-shrink-0 bg-white border-t border-gray-100 px-2 py-4 pb-[calc(1rem+var(--sab))] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-6 w-full items-center gap-0.5">
          {FEED_CONFIG.filter(f => f.id !== 'favorites').map((f) => (
            <button
              key={f.id}
              onClick={() => handleNavClick(f.id)}
              className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                feed === f.id && !searchUser ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{f.icon}</span>
              <span className={`text-[8.5px] font-black uppercase tracking-tight ${feed === f.id && !searchUser ? 'text-white' : 'text-gray-400'}`}>{f.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
