
import React, { useState, useEffect } from 'react';
import { HNItem } from '../types';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface JobCardProps {
  job: HNItem;
  targetLanguage: string;
  onSelect: (job: HNItem) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, targetLanguage, onSelect }) => {
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslatedTitle(null);
  }, [targetLanguage]);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedTitle) { setTranslatedTitle(null); return; }
    const originalTitle = job.title || '';
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

  const domain = job.url ? new URL(job.url).hostname.replace('www.', '') : null;

  const TranslationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  );

  return (
    <div 
      onClick={() => onSelect(job)}
      className="group bg-white border border-gray-100 rounded-[2rem] p-5 sm:p-6 hover:shadow-xl hover:shadow-gray-100 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-inner border border-orange-100/50">💼</div>
        <button 
          onClick={handleTranslate}
          className={`p-1.5 rounded-lg border transition-all ${
            translatedTitle ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-300 border-gray-100 hover:bg-gray-50'
          }`}
        >
          {isTranslating ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <TranslationIcon />
          )}
        </button>
      </div>

      <div className="flex-1">
        <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight mb-2 tracking-tight group-hover:text-orange-600 transition-colors">
          {translatedTitle || job.title}
        </h3>
        {domain && (
          <div className="flex items-center gap-1.5 text-gray-400 mb-3 sm:mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3 sm:h-3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">{domain}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
        <span className="text-[9px] sm:text-[10px] font-black text-gray-300 uppercase tracking-widest">{timeAgo(job.time)}</span>
        <div className="flex items-center gap-2 text-orange-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
          Apply Now
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
