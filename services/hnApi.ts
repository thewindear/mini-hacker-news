
import { HNItem, FeedType } from '../types';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export const fetchFeedIds = async (type: FeedType): Promise<number[]> => {
  const response = await fetch(`${BASE_URL}/${type}stories.json`);
  if (!response.ok) throw new Error('Failed to fetch feed IDs');
  return response.json();
};

export const fetchItem = async (id: number): Promise<HNItem> => {
  const response = await fetch(`${BASE_URL}/item/${id}.json`);
  if (!response.ok) throw new Error(`Failed to fetch item ${id}`);
  return response.json();
};

export const fetchItemsByIds = async (ids: number[]): Promise<HNItem[]> => {
  const items = await Promise.all(ids.map(id => fetchItem(id)));
  return items.filter(item => item !== null && !item.deleted);
};

export const fetchFullFeed = async (type: FeedType, limit: number = 30): Promise<HNItem[]> => {
  const ids = await fetchFeedIds(type);
  const slicedIds = ids.slice(0, limit);
  return fetchItemsByIds(slicedIds);
};
