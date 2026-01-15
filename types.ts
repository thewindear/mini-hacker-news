
export interface HNItem {
  id: number;
  deleted?: boolean;
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  time: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
  // 仅在搜索/关联结果中存在
  story_id?: number;
  story_title?: string;
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export type FeedType = 'top' | 'new' | 'best' | 'show' | 'ask' | 'job' | 'user';

export interface AppState {
  items: HNItem[];
  loading: boolean;
  error: string | null;
  selectedItem: HNItem | null;
  feed: FeedType;
}
