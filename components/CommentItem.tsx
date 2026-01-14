
import React, { useState, useEffect } from 'react';
import { HNItem } from '../types';
import { fetchItem } from '../services/hnApi';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface CommentItemProps {
  id: number;
  depth: number;
  targetLanguage: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ id, depth, targetLanguage }) => {
  const [comment, setComment] = useState<HNItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchItem(id).then(data => {
      if (isMounted) {
        setComment(data);
        if (data.text) {
          const cached = getCachedTranslation(data.text, targetLanguage);
          if (cached) setTranslatedText(cached);
        }
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
    const result = await translateText(original, targetLanguage);
    setTranslatedText(result);
    setIsTranslating(false);
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((new Date().getTime() / 1000) - timestamp);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (loading) return <div className={`py-3 ${depth > 0 ? 'ml-1 pl-3 border-l border-gray-50' : ''}`}><div className="h-2 bg-gray-100 rounded w-16 mb-2 animate-pulse" /><div className="h-3 bg-gray-50 rounded w-full animate-pulse" /></div>;
  if (!comment || comment.deleted || comment.dead) return null;

  return (
    <div className={depth === 0 ? "mt-8 first:mt-2" : `mt-3 pl-3 border-l border-gray-100 ${depth < 6 ? 'ml-1.5' : 'ml-0'}`}>
      <div className="flex items-center justify-between mb-1">
        <div onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-2 cursor-pointer select-none py-1 pr-4">
          <div className={`w-1.5 h-1.5 rounded-full ${depth === 0 ? 'bg-orange-400' : 'bg-gray-200'}`} />
          <span className="text-[11px] font-black text-gray-900 tracking-tight">{comment.by}</span>
          <span className="text-[10px] text-gray-400 font-medium">{timeAgo(comment.time)}</span>
          {isCollapsed && <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">+{comment.kids?.length || 0} exp</span>}
        </div>
        {!isCollapsed && comment.text && (
          <button 
            onClick={handleTranslate}
            title={translatedText ? 'Show Original' : 'Translate'}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${translatedText ? 'bg-orange-100 text-orange-700' : 'text-gray-300 hover:text-orange-500 hover:bg-gray-50'}`}
          >
            {isTranslating ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : translatedText ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            )}
          </button>
        )}
      </div>
      {!isCollapsed && (
        <>
          <div className={`leading-relaxed text-gray-700 break-words prose-comment ${depth > 2 ? 'text-[13px]' : 'text-[14px]'}`} dangerouslySetInnerHTML={{ __html: translatedText || comment.text || '' }} />
          {comment.kids && comment.kids.length > 0 && <div className="mt-1">{comment.kids.map(childId => <CommentItem key={childId} id={childId} depth={depth + 1} targetLanguage={targetLanguage} />)}</div>}
        </>
      )}
    </div>
  );
};

export default CommentItem;
