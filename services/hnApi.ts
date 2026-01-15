
import { HNItem, FeedType, HNUser } from '../types';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_BASE_URL = 'https://hn.algolia.com/api/v1';

async function fetchWithRetry(url: string, retries = 3, backoff = 300): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status >= 500 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, retries - 1, backoff * 2);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export const fetchFeedIds = async (type: FeedType): Promise<number[]> => {
  if (type === 'user' || type === 'job') return []; // Handled by Algolia for Jobs
  const response = await fetchWithRetry(`${BASE_URL}/${type}stories.json`);
  return response.json();
};

export const fetchJobsAlgolia = async (page: number = 0): Promise<HNItem[]> => {
  try {
    const response = await fetchWithRetry(`${ALGOLIA_BASE_URL}/search_by_date?tags=job&hitsPerPage=20&page=${page}`);
    const data = await response.json();
    
    return data.hits.map((hit: any) => ({
      id: parseInt(hit.objectID),
      title: hit.title,
      url: hit.url,
      by: hit.author,
      score: hit.points,
      time: hit.created_at_i,
      text: hit.comment_text || hit.story_text,
      descendants: hit.num_comments,
      type: 'job'
    }));
  } catch (err) {
    console.error(`Algolia Jobs fetch failed:`, err);
    return [];
  }
};

export const fetchItem = async (id: number): Promise<HNItem | null> => {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/item/${id}.json`);
    return response.json();
  } catch (err) {
    console.error(`Failed to fetch item ${id}:`, err);
    return null;
  }
};

export const fetchUser = async (id: string): Promise<HNUser | null> => {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/user/${id}.json`);
    return response.json();
  } catch (err) {
    console.error(`Failed to fetch user ${id}:`, err);
    return null;
  }
};

export const fetchItemsByIds = async (ids: number[]): Promise<HNItem[]> => {
  const promises = ids.map(id => fetchItem(id));
  const results = await Promise.all(promises);
  return results.filter((item): item is HNItem => item !== null && !item.deleted && !item.dead);
};

export const searchItemsByUser = async (username: string, type: 'story' | 'comment' = 'story'): Promise<HNItem[]> => {
  try {
    const response = await fetchWithRetry(`${ALGOLIA_BASE_URL}/search?tags=${type},author_${username}&hitsPerPage=50`);
    const data = await response.json();
    
    return data.hits.map((hit: any) => ({
      id: parseInt(hit.objectID),
      title: hit.title || hit.story_title,
      url: hit.url,
      by: hit.author,
      score: hit.points,
      time: hit.created_at_i,
      text: hit.comment_text || hit.story_text,
      descendants: hit.num_comments,
      type: type,
      story_id: hit.story_id,
      story_title: hit.story_title
    }));
  } catch (err) {
    console.error(`Search failed for user ${username} type ${type}:`, err);
    return [];
  }
};
