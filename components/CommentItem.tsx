
import React, { useState, useEffect } from 'react';
import { HNItem } from '../types';
import { fetchItem } from '../services/hnApi';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface CommentItemProps {
  id: number;
  depth: number;
  targetLanguage: string;
  onUserSelect: (username: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ id, depth, targetLanguage, onUserSelect }) => {
  const [comment, setComment] = useState<HNItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);
    
    fetchItem(id)
      .then(data => {
        if (isMounted) {
          if (data) {
            setComment(data);
            if (data.text) {
              const cached = getCachedTranslation(data.text, targetLanguage);
              if (cached) setTranslatedText(cached);
            }
          } else {
            setError(true);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
      
    return () => { isMounted = false; };
  }, [id, targetLanguage]);

  const handleTranslate = async () => {
    if (!comment?.text || isTranslating) return;
    if (translatedText) { setTranslatedText(null); return; }
    const original = comment.text;
    const cached = getCachedTranslation(original, targetLanguage);
    if (cached) { setTranslatedText(cached); return; }
    setIsTranslating(true);
    try {
      const result = await translateText(original, targetLanguage);
      setTranslatedText(result);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (comment?.by) onUserSelect(comment.by);
  };

  const timeAgo = (timestamp: number) => {
    const now = new Date().getTime() / 1000;
    const seconds = Math.floor(now - timestamp);
    if (seconds > 30 * 86400) {
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    }
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const TranslationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  );

  if (loading) return <div className={`py-3 ${depth > 0 ? 'ml-1 pl-3 border-l border-gray-50' : ''}`}><div className="h-2 bg-gray-100 rounded w-16 mb-2 animate-pulse" /><div className="h-3 bg-gray-50 rounded w-full animate-pulse" /></div>;
  if (error || !comment || comment.deleted || comment.dead) return null;

  return (
    <div className={depth === 0 ? "mt-4 first:mt-1" : `mt-2 pl-3 border-l border-gray-100 ${depth < 6 ? 'ml-1.5' : 'ml-0'}`}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2 py-0.5 pr-4">
          <div className={`w-1 h-1 rounded-full ${depth === 0 ? 'bg-orange-400' : 'bg-gray-200'}`} />
          <span onClick={handleUserClick} className="text-[10px] font-black text-gray-900 tracking-tight cursor-pointer hover:underline hover:text-orange-500 transition-colors normal-case">{comment.by}</span>
          <span onClick={() => setIsCollapsed(!isCollapsed)} className="text-[9px] text-gray-400 font-medium cursor-pointer select-none">{timeAgo(comment.time)}</span>
          {isCollapsed && <span onClick={() => setIsCollapsed(false)} className="text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter cursor-pointer">+{comment.kids?.length || 0} exp</span>}
        </div>
        {!isCollapsed && comment.text && (
          <button 
            onClick={handleTranslate}
            title={translatedText ? 'Show Original' : 'Translate'}
            className={`p-1 rounded-md transition-all active:scale-90 ${translatedText ? 'bg-orange-100 text-orange-700' : 'text-gray-300 hover:text-orange-500 hover:bg-gray-50'}`}
          >
            {isTranslating ? (
              <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <TranslationIcon />
            )}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <>
          <div className={`leading-relaxed text-gray-700 break-words prose-comment ${depth > 2 ? 'text-[13px]' : 'text-[14px]'}`} dangerouslySetInnerHTML={{ __html: translatedText || comment.text || '' }} />
          {comment.kids && comment.kids.length > 0 && <div className="mt-1">{comment.kids.map(childId => <CommentItem key={childId} id={childId} depth={depth + 1} targetLanguage={targetLanguage} onUserSelect={onUserSelect} />)}</div>}
        </>
      )}
    </div>
  );
};

export default CommentItem;
