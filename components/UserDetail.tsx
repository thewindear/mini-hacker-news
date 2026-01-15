
import React, { useState, useEffect } from 'react';
import { HNUser, HNItem } from '../types';
import { fetchUser, searchItemsByUser, fetchItem } from '../services/hnApi';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface UserDetailProps {
  username: string;
  onClose: () => void;
  onStorySelect: (story: HNItem) => void;
  hasActiveStory?: boolean;
  favoriteIds: number[];
  onToggleFavorite: (id: number) => void;
}

interface UserActivityItemProps {
  item: HNItem;
  index: number;
  targetLanguage: string;
  onSelect: (item: HNItem) => void;
  navigatingId: number | null;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}

const UserActivityItem: React.FC<UserActivityItemProps> = ({ 
  item, 
  index, 
  targetLanguage, 
  onSelect, 
  navigatingId,
  isFavorite,
  onToggleFavorite
}) => {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslatedContent(null);
  }, [targetLanguage]);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedContent) { setTranslatedContent(null); return; }
    
    const textToTranslate = item.title || item.text || '';
    if (!textToTranslate) return;

    const cached = getCachedTranslation(textToTranslate, targetLanguage);
    if (cached) { setTranslatedContent(cached); return; }

    setIsTranslating(true);
    try {
      const result = await translateText(textToTranslate, targetLanguage);
      setTranslatedContent(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(item.id);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const timeAgo = (timestamp: number) => {
    const now = new Date().getTime() / 1000;
    const seconds = Math.floor(now - timestamp);
    
    // If more than 30 days, show YYYY-MM-DD
    if (seconds > 30 * 86400) {
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    }
    
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "now";
  };

  const domain = item.url ? new URL(item.url).hostname.replace('www.', '') : null;
  const isNavigating = navigatingId === item.id;

  return (
    <div 
      onClick={() => onSelect(item)}
      className={`group flex items-start gap-3 p-4 transition-all cursor-pointer select-none relative border-l-[4px] border-transparent hover:bg-gray-50 hover:border-gray-200 ${isNavigating ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col items-center justify-center min-w-[1.75rem] pt-0.5">
        <span className="text-[10px] font-black text-gray-300 group-hover:text-gray-400 transition-colors">
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <button 
          onClick={handleToggleFavorite}
          className={`mt-2 transition-all hover:scale-125 active:scale-90 ${isFavorite ? 'text-orange-500' : 'text-gray-200 group-hover:text-gray-300'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {item.type === 'comment' && item.story_title && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black text-orange-500 uppercase tracking-widest opacity-80">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            ON: <span className="truncate max-w-[220px] normal-case font-bold">{item.story_title}</span>
          </div>
        )}

        <div className="flex flex-col gap-0.5 mb-1.5">
          <h3 className="text-[15px] font-bold leading-tight tracking-tight text-gray-900 group-hover:text-orange-900 transition-colors">
            {translatedContent || item.title || (item.text ? <span className="italic text-gray-500 font-medium line-clamp-2" dangerouslySetInnerHTML={{ __html: item.text }} /> : `Item #${item.id}`)}
          </h3>
          {domain && (
            <span className="text-[10px] font-semibold italic truncate text-gray-400">
              {domain}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase flex-nowrap overflow-hidden">
          {item.score !== undefined && (
            <>
              <span className="font-black flex-shrink-0 text-orange-500/70">
                {item.score} PTS
              </span>
              <span className="text-gray-200 flex-shrink-0">•</span>
            </>
          )}
          
          <span className="flex-shrink-0 uppercase bg-gray-100 px-1.5 py-0.5 rounded text-[8px] text-gray-500 leading-none">
            {item.type}
          </span>
          
          <span className="text-gray-200 flex-shrink-0">•</span>
          <span className="flex-shrink-0">{timeAgo(item.time)}</span>

          <div className="flex items-center gap-1 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleTranslate}
              className={`px-1 rounded flex items-center gap-1 transition-all ${
                translatedContent 
                  ? 'bg-orange-100 text-orange-600' 
                  : 'bg-gray-100 text-gray-500 lg:bg-transparent lg:text-gray-300 hover:text-orange-500'
              }`}
            >
              {isTranslating ? (
                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[8px] font-black">{translatedContent ? 'ORIG' : 'TL'}</span>
              )}
            </button>
            {item.url && (
              <button 
                onClick={handleLinkClick} 
                className="bg-gray-100 text-gray-500 lg:bg-transparent lg:text-gray-300 hover:text-blue-500 px-1 rounded text-[8px] font-black transition-all"
              >
                LINK
              </button>
            )}
          </div>

          {item.descendants !== undefined && (
            <span className="ml-auto flex items-center gap-0.5 flex-shrink-0 text-gray-400">
              💬 {item.descendants}
            </span>
          )}

          {isNavigating && (
            <div className="ml-2 w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};

const UserDetail: React.FC<UserDetailProps> = ({ 
  username, 
  onClose, 
  onStorySelect, 
  hasActiveStory,
  favoriteIds,
  onToggleFavorite
}) => {
  const [user, setUser] = useState<HNUser | null>(null);
  const [items, setItems] = useState<HNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'stories' | 'comments'>('stories');

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      const userData = await fetchUser(username);
      setUser(userData);
      const userStories = await searchItemsByUser(username, 'story');
      setItems(userStories);
      setLoading(false);
    };
    loadUserData();
  }, [username]);

  useEffect(() => {
    const switchTab = async () => {
      setLoading(true);
      const results = await searchItemsByUser(username, activeTab === 'stories' ? 'story' : 'comment');
      setItems(results);
      setLoading(false);
    };
    if (user) switchTab();
  }, [activeTab, username, user]);

  const handleItemClick = async (item: HNItem) => {
    if (item.type === 'story') {
      onStorySelect(item);
    } else if (item.type === 'comment' && item.story_id) {
      setNavigatingId(item.id);
      try {
        const fullStory = await fetchItem(item.story_id);
        if (fullStory) {
          onStorySelect(fullStory);
        }
      } catch (err) {
        console.error("Failed to navigate to parent story:", err);
      } finally {
        setNavigatingId(null);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in slide-in-from-bottom duration-300 overflow-hidden">
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
            title="Close profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h2 className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Member Profile</h2>
          </div>
        </div>

        {hasActiveStory && (
          <button 
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all"
          >
            Back
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
          <section className="mb-6 flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[1.75rem] sm:rounded-[2.25rem] flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-orange-200/50 flex-shrink-0">👤</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-1 tracking-tight normal-case truncate">{username}</h1>
              <div className="flex items-center gap-2 mb-1 overflow-x-auto scrollbar-hide whitespace-nowrap">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100 shadow-sm flex-shrink-0">Karma: {user?.karma || 0}</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-100 flex-shrink-0">Since {user ? formatDate(user.created) : '...'}</span>
              </div>
            </div>
          </section>

          {user?.about && (
            <div className="mb-6">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Biography</h3>
              <div 
                className="bg-gray-50/50 border border-gray-100 p-6 sm:p-8 rounded-[2rem] text-[15px] leading-relaxed text-gray-700 prose-comment shadow-sm"
                dangerouslySetInnerHTML={{ __html: user.about }}
              />
            </div>
          )}

          <div className="sticky top-0 bg-white z-10 pt-2 pb-4 mb-2 flex gap-1 border-b border-gray-50 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('stories')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'stories' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              Submissions
            </button>
            <button 
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'comments' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              Comments
            </button>
          </div>

          <div className="divide-y divide-gray-50 pb-12">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-5 animate-pulse">
                  <div className="w-8 h-4 bg-gray-100 rounded" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : items.length > 0 ? (
              items.map((item, index) => (
                <UserActivityItem 
                  key={item.id} 
                  item={item} 
                  index={index} 
                  targetLanguage={'Chinese'}
                  onSelect={handleItemClick}
                  navigatingId={navigatingId}
                  isFavorite={favoriteIds.includes(item.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))
            ) : (
              <div className="text-center py-20">
                <div className="text-4xl mb-4 opacity-20">📭</div>
                <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">No activity recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
