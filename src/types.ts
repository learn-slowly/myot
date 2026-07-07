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

export interface CompareCandidate {
  name: string;
  price?: string;
  note?: string;
  imageUrl?: string;
}

export interface CompareVerdictRow {
  name: string;
  verdict: string; // "살" | "고민" | "말"
  reason: string;
}

export interface CompareResult {
  items: CompareVerdictRow[];
  topPick: string; // 살/고민 중 하나만 산다면 이것 (전부 말이면 빈 문자열)
  summary: string;
}
