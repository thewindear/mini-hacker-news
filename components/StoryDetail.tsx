
import React, { useState, useEffect, useRef } from 'react';
import { HNItem } from '../types';
import { summarizeStory, translateText, getCachedTranslation, getCachedSummary } from '../services/geminiService';
import CommentItem from './CommentItem';

interface StoryDetailProps {
  story: HNItem | null;
  onClose: () => void;
  onUserSelect: (username: string) => void;
  targetLanguage: string;
  isInline?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

const StoryDetail: React.FC<StoryDetailProps> = ({ 
  story, 
  onClose, 
  onUserSelect, 
  targetLanguage, 
  isInline,
  isFavorite,
  onToggleFavorite
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [isTranslatingBody, setIsTranslatingBody] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [story?.id]);

  useEffect(() => {
    if (!story) {
      setSummary(null);
      setTranslatedTitle(null);
      setTranslatedBody(null);
      setShowSummary(false);
      return;
    }
    setTranslatedTitle(getCachedTranslation(story.title || '', targetLanguage) || null);
    if (story.text) setTranslatedBody(getCachedTranslation(story.text, targetLanguage) || null);
    setSummary(getCachedSummary(story.id, targetLanguage) || null);
    setShowSummary(false);
  }, [story, targetLanguage]);

  if (!story) return null;

  const handleSummarize = async () => {
    setShowSummary(true);
    if (summary) return;
    
    const cached = getCachedSummary(story.id, targetLanguage);
    if (cached) { setSummary(cached); return; }
    
    setLoadingSummary(true);
    const res = await summarizeStory(story, targetLanguage);
    setSummary(res);
    setLoadingSummary(false);
  };

  const handleTranslateTitle = async () => {
    if (translatedTitle) { setTranslatedTitle(null); return; }
    const original = story.title || '';
    const cached = getCachedTranslation(original, targetLanguage);
    if (cached) { setTranslatedTitle(cached); return; }
    setIsTranslatingTitle(true);
    const res = await translateText(original, targetLanguage);
    setTranslatedTitle(res);
    setIsTranslatingTitle(false);
  };

  const handleTranslateBody = async () => {
    if (!story.text) return;
    if (translatedBody) { setTranslatedBody(null); return; }
    const original = story.text;
    const cached = getCachedTranslation(original, targetLanguage);
    if (cached) { setTranslatedBody(cached); return; }
    setIsTranslatingBody(true);
    const res = await translateText(original, targetLanguage);
    setTranslatedBody(res);
    setIsTranslatingBody(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(story.id);
  };

  const timeAgo = (timestamp: number) => {
    const now = new Date().getTime() / 1000;
    const seconds = Math.floor(now - timestamp);
    if (seconds > 30 * 86400) {
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    }
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
  };

  const TranslationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  );

  return (
    <div className={`${isInline ? 'relative h-full w-full' : 'fixed inset-0 z-[60]'} flex flex-col bg-white animate-in fade-in slide-in-from-bottom duration-300 overflow-hidden`}>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-5 h-14 flex lg:hidden items-center justify-between gap-4">
        <button onClick={onClose} className="lg:hidden w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center">
           <span className="text-[13px] font-bold text-gray-900 truncate text-center w-full">{translatedTitle || story.title}</span>
        </div>
        <button onClick={handleToggleFavorite} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${isFavorite ? 'text-orange-500' : 'text-gray-300'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
        </button>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 pt-4 sm:pt-10 scroll-smooth">
        <div className="max-w-4xl lg:max-w-5xl mx-auto">
          <section className="mb-6">
            <div className="flex justify-between items-start gap-6 mb-2 sm:mb-4">
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 leading-[1.2] tracking-tight flex-1">
                {translatedTitle || story.title}
              </h1>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button 
                  onClick={handleTranslateTitle}
                  title={translatedTitle ? 'Show Original' : 'Translate'}
                  className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border transition-all ${translatedTitle ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                >
                  {isTranslatingTitle ? (
                    <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TranslationIcon />
                  )}
                </button>
                <button 
                  onClick={handleToggleFavorite}
                  title={isFavorite ? "Remove from saved" : "Save story"}
                  className={`hidden lg:flex flex-shrink-0 w-6 h-6 rounded-md items-center justify-center border transition-all ${isFavorite ? 'bg-orange-50 text-orange-500 border-orange-200' : 'bg-white text-gray-300 border-gray-100 hover:bg-gray-50'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-4 text-[9px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-[0.1em] text-gray-400 flex-nowrap overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-orange-600 flex-shrink-0">{story.score} PTS</span>
              <span className="flex-shrink-0">•</span>
              <button onClick={() => story.by && onUserSelect(story.by)} className="truncate max-w-[60px] sm:max-w-none flex-shrink-0 hover:underline hover:text-orange-500 transition-colors normal-case flex items-center gap-1">
                <span className="uppercase">BY</span> <span className="text-gray-900">{story.by}</span>
              </button>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">{timeAgo(story.time)}</span>
              <span className="flex-shrink-0">•</span>
              <span className="text-gray-900 flex-shrink-0 whitespace-nowrap">💬 {story.descendants || 0}</span>
              {story.url && (
                <a href={story.url} target="_blank" rel="noreferrer" className="bg-gray-100 text-blue-600 px-2 py-1 rounded transition-colors font-black flex items-center gap-1 flex-shrink-0">
                  <span>LINK</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                </a>
              )}
              <button onClick={handleSummarize} className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-black flex-shrink-0 ${showSummary ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                AI
              </button>
            </div>
          </section>

          {showSummary && (
            <section className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-[2.5rem] p-8 mb-12 relative overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom duration-500">
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">AI</div>
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Gemini Insight</h2>
                    <p className="text-[9px] text-indigo-300 font-bold uppercase">Deep context analysis</p>
                  </div>
                </div>
                <button onClick={() => setShowSummary(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-indigo-300 hover:text-indigo-600 hover:bg-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {loadingSummary ? (
                <div className="space-y-3 relative z-10"><div className="h-3 bg-indigo-100/50 rounded-full w-full animate-pulse" /><div className="h-3 bg-indigo-100/50 rounded-full w-[90%] animate-pulse" /></div>
              ) : summary ? (
                <div className="text-indigo-900 text-[16px] leading-relaxed space-y-4 font-medium relative z-10">
                  {summary.split('\n').filter(l => l.trim()).map((line, i) => (
                    <p key={i} className="flex gap-4"><span className="text-indigo-300 mt-1.5">•</span>{line.replace(/^[-*]\s*/, '')}</p>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {story.text && (
            <div className="mb-8 sm:mb-12">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Context</h3>
                <button 
                  onClick={handleTranslateBody}
                  title={translatedBody ? 'Show Original' : 'Translate'}
                  className={`w-6 h-6 rounded-md border transition-all flex items-center justify-center ${
                    translatedBody ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {isTranslatingBody ? (
                    <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TranslationIcon />
                  )}
                </button>
              </div>
              <div className="prose-comment text-gray-800 bg-gray-50/80 p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-gray-100 text-[15px] sm:text-[16px] leading-relaxed" dangerouslySetInnerHTML={{ __html: translatedBody || story.text }} />
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 sm:pt-6">
             <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Discussion</h3>
             {story.kids ? (
               <div className="divide-y divide-gray-50">
                 {story.kids.map(kidId => <CommentItem key={kidId} id={kidId} depth={0} targetLanguage={targetLanguage} onUserSelect={onUserSelect} />)}
               </div>
             ) : (
               <p className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-[10px]">Ghost Town</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDetail;
