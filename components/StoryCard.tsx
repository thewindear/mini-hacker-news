
import React, { useState, useEffect } from 'react';
import { HNItem } from '../types';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface StoryCardProps {
  story: HNItem;
  rank: number;
  onSelect: (story: HNItem) => void;
  onUserSelect: (username: string) => void;
  targetLanguage: string;
  isSelected?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ 
  story, 
  rank, 
  onSelect, 
  onUserSelect, 
  targetLanguage, 
  isSelected,
  isFavorite,
  onToggleFavorite
}) => {
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslatedTitle(null);
  }, [targetLanguage]);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedTitle) { setTranslatedTitle(null); return; }
    const originalTitle = story.title || '';
    const cached = getCachedTranslation(originalTitle, targetLanguage);
    if (cached) { setTranslatedTitle(cached); return; }
    setIsTranslating(true);
    try {
      const result = await translateText(originalTitle, targetLanguage);
      setTranslatedTitle(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(story.id);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.url) window.open(story.url, '_blank', 'noopener,noreferrer');
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.by) onUserSelect(story.by);
  };

  const timeAgo = (timestamp: number) => {
    const now = new Date().getTime() / 1000;
    const seconds = Math.floor(now - timestamp);
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

  const domain = story.url ? new URL(story.url).hostname.replace('www.', '') : null;
  const isJob = story.type === 'job';

  const TranslationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  );

  return (
    <div 
      id={`story-card-${story.id}`}
      onClick={() => onSelect(story)}
      className={`group flex items-start gap-3 p-4 transition-all cursor-pointer select-none relative border-l-[4px] ${
        isSelected 
          ? 'bg-orange-50/60 border-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.05)]' 
          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
      }`}
    >
      <div className="flex flex-col items-center justify-center min-w-[1.75rem] pt-0.5">
        <span className={`text-[10px] font-black transition-colors ${isSelected ? 'text-orange-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
          {rank.toString().padStart(2, '0')}
        </span>
        <button 
          onClick={handleToggleFavorite}
          title={isFavorite ? "Remove from saved" : "Save story"}
          className={`mt-2.5 transition-all hover:scale-125 active:scale-90 ${isFavorite ? 'text-orange-500' : 'text-gray-200 group-hover:text-gray-300'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-0.5 mb-1.5">
          <h3 className={`text-[15px] font-bold leading-tight tracking-tight transition-colors ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
            {translatedTitle || story.title}
          </h3>
          {domain && (
            <span className={`text-[10px] font-semibold italic truncate transition-colors ${isSelected ? 'text-orange-400' : 'text-gray-400'}`}>
              {domain}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase flex-nowrap overflow-hidden">
          {story.score !== undefined && (
            <>
              <span className={`font-black flex-shrink-0 transition-colors ${isSelected ? 'text-orange-600' : 'text-orange-500/70'}`}>
                {story.score} PTS
              </span>
              <span className="text-gray-200 flex-shrink-0">•</span>
            </>
          )}
          
          {story.by && (
            <>
              <span 
                onClick={handleUserClick}
                className={`truncate min-w-0 max-w-[80px] sm:max-w-none transition-colors hover:underline normal-case ${isSelected ? 'text-orange-600' : 'text-gray-900 hover:text-orange-500'}`}
              >
                {story.by}
              </span>
              <span className="text-gray-200 flex-shrink-0">•</span>
            </>
          )}
          
          <span className="flex-shrink-0">{timeAgo(story.time)}</span>
          
          <div className="flex items-center gap-1 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleTranslate}
              className={`p-1 rounded flex items-center justify-center transition-all ${
                translatedTitle 
                  ? 'bg-orange-100 text-orange-600' 
                  : 'bg-gray-100 text-gray-500 lg:bg-transparent lg:text-gray-300 hover:text-orange-500'
              }`}
            >
              {isTranslating ? (
                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <TranslationIcon />
              )}
            </button>
            {story.url && (
              <button 
                onClick={handleLinkClick} 
                className="bg-gray-100 text-gray-500 lg:bg-transparent lg:text-gray-300 hover:text-blue-500 px-1 rounded text-[8px] font-black transition-all"
              >
                LINK
              </button>
            )}
          </div>

          {!isJob && (
            <span className={`ml-auto flex items-center gap-0.5 flex-shrink-0 transition-colors ${isSelected ? 'text-orange-400' : 'text-gray-400'}`}>
              💬 {story.descendants || 0}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCard;
