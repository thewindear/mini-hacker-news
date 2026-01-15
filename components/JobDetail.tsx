
import React, { useState, useEffect } from 'react';
import { HNItem } from '../types';
import { translateText, getCachedTranslation } from '../services/geminiService';

interface JobDetailProps {
  job: HNItem;
  onClose: () => void;
  targetLanguage: string;
}

const JobDetail: React.FC<JobDetailProps> = ({ job, onClose, targetLanguage }) => {
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [isTranslatingText, setIsTranslatingText] = useState(false);

  useEffect(() => {
    setTranslatedTitle(getCachedTranslation(job.title || '', targetLanguage) || null);
    const content = job.job_text || job.text;
    if (content) setTranslatedText(getCachedTranslation(content, targetLanguage) || null);
  }, [job, targetLanguage]);

  const handleTranslateTitle = async () => {
    if (translatedTitle) { setTranslatedTitle(null); return; }
    const original = job.title || '';
    setIsTranslatingTitle(true);
    const res = await translateText(original, targetLanguage);
    setTranslatedTitle(res);
    setIsTranslatingTitle(false);
  };

  const handleTranslateText = async () => {
    const original = job.job_text || job.text;
    if (!original) return;
    if (translatedText) { setTranslatedText(null); return; }
    setIsTranslatingText(true);
    const res = await translateText(original, targetLanguage);
    setTranslatedText(res);
    setIsTranslatingText(false);
  };

  const timeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const seconds = Math.floor(now - timestamp);
    if (seconds > 7 * 86400) {
      return new Date(timestamp * 1000).toISOString().split('T')[0];
    }
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ago`;
    return "Just now";
  };

  const TranslationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
  );

  const displayContent = translatedText || job.job_text || job.text || '';

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden shadow-2xl">
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 leading-none mb-1">Job Detail</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">{job.by}</span>
          </div>
        </div>
        {job.url && (
          <a 
            href={job.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-gray-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-md flex items-center gap-2"
          >
            Apply Externally
          </a>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start gap-6 mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight flex-1">
                {translatedTitle || job.title}
              </h1>
              <button 
                onClick={handleTranslateTitle}
                className={`p-2 rounded-xl border transition-all flex-shrink-0 ${translatedTitle ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
              >
                {isTranslatingTitle ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <TranslationIcon />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 border-y border-gray-50 py-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Author</span>
                <span className="text-[12px] font-bold text-gray-900">{job.by}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Published</span>
                <span className="text-[12px] font-bold text-gray-900">{timeAgo(job.time)}</span>
              </div>
              {job.score !== undefined && (
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Points</span>
                  <span className="text-[12px] font-bold text-orange-600">{job.score}</span>
                </div>
              )}
            </div>
          </div>

          {(job.job_text || job.text) && (
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Hiring Context</h2>
                <button 
                  onClick={handleTranslateText}
                  className={`p-1.5 rounded-lg border transition-all ${translatedText ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-300 border-gray-100 hover:bg-gray-50'}`}
                >
                  {isTranslatingText ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <TranslationIcon />}
                </button>
              </div>
              <div 
                className="prose-comment text-gray-800 bg-orange-50/10 p-6 sm:p-8 rounded-[2rem] border border-orange-100/30 text-base sm:text-[17px] leading-relaxed shadow-sm selection:bg-orange-100" 
                dangerouslySetInnerHTML={{ __html: displayContent }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
