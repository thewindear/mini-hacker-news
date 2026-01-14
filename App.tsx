
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HNItem, FeedType } from './types';
import { fetchFeedIds, fetchItemsByIds } from './services/hnApi';
import StoryCard from './components/StoryCard';
import StoryDetail from './components/StoryDetail';

const ITEMS_PER_PAGE = 20;

export const LANGUAGES = [
  { code: 'Chinese', label: '中文' },
  { code: 'English', label: 'English' },
  { code: 'French', label: 'Français' },
  { code: 'German', label: 'Deutsch' },
  { code: 'Japanese', label: '日本語' },
  { code: 'Korean', label: '한국어' },
];

const FEED_CONFIG: { id: FeedType; icon: string; label: string }[] = [
  { id: 'top', icon: '🔥', label: 'Top' },
  { id: 'new', icon: '✨', label: 'New' },
  { id: 'best', icon: '🏆', label: 'Best' },
  { id: 'show', icon: '🚀', label: 'Show' },
  { id: 'ask', icon: '💬', label: 'Ask' },
];

const App: React.FC = () => {
  const [feed, setFeed] = useState<FeedType>('top');
  const [items, setItems] = useState<HNItem[]>([]);
  const [allIds, setAllIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedStory, setSelectedStory] = useState<HNItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSelectedVisible, setIsSelectedVisible] = useState(true);
  
  const [targetLanguage, setTargetLanguage] = useState(() => {
    return localStorage.getItem('hn_target_lang') || 'Chinese';
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTrigger = useRef<HTMLDivElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('hn_target_lang', targetLanguage);
  }, [targetLanguage]);

  const loadInitialFeed = useCallback(async (type: FeedType) => {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const ids = await fetchFeedIds(type);
      setAllIds(ids);
      const initialBatch = ids.slice(0, ITEMS_PER_PAGE);
      const data = await fetchItemsByIds(initialBatch);
      setItems(data);
      // On desktop, auto-select first story
      if (window.innerWidth >= 1024 && data.length > 0) {
        setSelectedStory(data[0]);
      }
    } catch (err) {
      setError('Connection failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= allIds.length || items.length === 0) return;
    
    setLoadingMore(true);
    try {
      const nextBatchIds = allIds.slice(items.length, items.length + ITEMS_PER_PAGE);
      const nextBatchItems = await fetchItemsByIds(nextBatchIds);
      setItems(prev => [...prev, ...nextBatchItems]);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [allIds, items.length, loadingMore]);

  useEffect(() => {
    loadInitialFeed(feed);
  }, [feed, loadInitialFeed]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (loading) return;
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
  }, [loading, loadMore]);

  // Selected Item Visibility Observer
  useEffect(() => {
    if (!selectedStory || !sidebarScrollRef.current) {
      setIsSelectedVisible(true);
      return;
    }

    if (visibilityObserverRef.current) {
      visibilityObserverRef.current.disconnect();
    }

    visibilityObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsSelectedVisible(entry.isIntersecting);
      },
      {
        root: sidebarScrollRef.current,
        threshold: 0.2,
      }
    );

    const element = document.getElementById(`story-card-${selectedStory.id}`);
    if (element) {
      visibilityObserverRef.current.observe(element);
    }

    return () => {
      if (visibilityObserverRef.current) visibilityObserverRef.current.disconnect();
    };
  }, [selectedStory, items]);

  const scrollToSelected = () => {
    if (!selectedStory) return;
    const element = document.getElementById(`story-card-${selectedStory.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const Skeleton = () => (
    <div className="space-y-0">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex gap-4 p-5 border-b border-gray-100 animate-pulse">
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 z-50 w-full bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-5 h-14 flex items-center justify-between">
          
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm">H</div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Hacker News</h1>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {FEED_CONFIG.map((f) => (
              <button
                key={f.id}
                onClick={() => setFeed(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  feed === f.id ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm leading-none opacity-80">{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center justify-end gap-4">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1">
              <span className="text-[9px] font-black text-gray-400 mr-1.5">TL</span>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none appearance-none text-orange-600 cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Sidebar / List View */}
        <section className={`relative flex-shrink-0 w-full lg:w-[420px] bg-white border-r border-gray-100 flex flex-col overflow-hidden transition-transform duration-300 ${selectedStory ? 'hidden lg:flex' : 'flex'}`}>
          <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            {loading ? (
              <Skeleton />
            ) : error ? (
              <div className="p-20 text-center">
                <p className="text-gray-500 text-sm mb-6">{error}</p>
                <button onClick={() => loadInitialFeed(feed)} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase">Retry</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((item, index) => (
                  <StoryCard 
                    key={item.id} 
                    story={item} 
                    rank={index + 1}
                    onSelect={setSelectedStory}
                    targetLanguage={targetLanguage}
                    isSelected={selectedStory?.id === item.id}
                  />
                ))}
                <div ref={loadMoreTrigger} className="p-10 text-center">
                  {loadingMore && <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />}
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Button for Location - Smaller and Only visible when item is off-screen */}
          {selectedStory && items.length > 5 && !isSelectedVisible && (
            <button 
              onClick={scrollToSelected}
              title="Locate selected"
              className="absolute bottom-6 right-6 w-9 h-9 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 animate-in fade-in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3"/></svg>
            </button>
          )}
        </section>

        {/* Detail View Container */}
        <section className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedStory ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
          {selectedStory ? (
            <StoryDetail 
              story={selectedStory} 
              onClose={() => setSelectedStory(null)} 
              targetLanguage={targetLanguage}
              isInline={true}
            />
          ) : (
            <div className="text-center p-10 max-sm">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">🗞️</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Select a story</h2>
              <p className="text-sm text-gray-400 font-medium">Read the latest from the Hacker News community with AI-powered summaries.</p>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Navigation */}
      <nav className="lg:hidden flex-shrink-0 bg-white border-t border-gray-100 px-4 py-4 pb-[calc(1rem+var(--sab))] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {FEED_CONFIG.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFeed(f.id); setSelectedStory(null); }}
              className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all active:scale-95 ${
                feed === f.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl leading-none">{f.icon}</span>
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                feed === f.id ? 'text-white' : 'text-gray-400'
              }`}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
