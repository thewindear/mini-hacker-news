
import { GoogleGenAI } from "@google/genai";
import { HNItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global In-memory Cache
const translationCache = new Map<string, string>();
const summaryCache = new Map<string, string>();

/**
 * Get cached translation if exists
 */
export const getCachedTranslation = (text: string, targetLanguage: string): string | undefined => {
  return translationCache.get(`${targetLanguage}:${text}`);
};

/**
 * Get cached summary if exists
 */
export const getCachedSummary = (storyId: number, targetLanguage: string): string | undefined => {
  return summaryCache.get(`${targetLanguage}:${storyId}`);
};

export const summarizeStory = async (story: HNItem, targetLanguage: string): Promise<string> => {
  // Check cache first
  const cacheKey = `${targetLanguage}:${story.id}`;
  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey)!;
  }

  const prompt = `
    You are an expert tech curator. Summarize the following Hacker News story in a concise, bulleted format.
    Title: ${story.title}
    URL: ${story.url || 'N/A'}
    Points: ${story.score}
    
    IMPORTANT: Provide the summary entirely in ${targetLanguage}.
    Format the output as 3-4 clean Markdown bullet points. 
    Focus on key takeaways and why this is interesting to the tech community.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const result = response.text || "Could not generate summary.";
    if (response.text) summaryCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Error generating summary in ${targetLanguage}. Please try again later.`;
  }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  // Check cache first
  const cacheKey = `${targetLanguage}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const prompt = `Translate the following text into ${targetLanguage}. 
  Maintain the original tone and formatting (if it's HTML, keep the structure but translate the content).
  Only return the translated text, nothing else.
  Text: ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const result = response.text || text;
    if (response.text) translationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};
