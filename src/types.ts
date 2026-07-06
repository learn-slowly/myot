// DB row / app-level shared types

export interface DbCombo {
  id: string;
  bottom: string;
  tops: string[];
  outers: string[];
  shoes: string[];
  mood: string[];
  season: string[];
  description: string;
}

export interface OotdLog {
  id: string;
  date: string;
  items: string[];
  description: string;
  image_url?: string;
  memo?: string;
}

export interface SavedCombo {
  key: string;
  combo: { bottom: string; tops: string[]; outers: string[]; shoes: string[]; mood: string[]; season: string[]; desc: string };
  savedAt: string;
}

export interface LetgoItem {
  dbId: string;
  id: string;
  reason?: string;
  addedAt: string;
  status: string;
}

export interface WishStatus {
  id: string;
  label: string;
  color: string;
}

export interface Weather {
  temp: number;
  desc: string;
  icon: string;
}
