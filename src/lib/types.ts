export type SegmentStatus =
  | "untranslated"
  | "ai_draft"
  | "translating"
  | "translated"
  | "in_review"
  | "rejected"
  | "approved";

export interface Speaker {
  id: string;
  name: string;
  role: string;
  persona: string;
  /** e.g. "반말 · 단호", "하게체 · 능청" */
  tone: string;
  /** honorific register: casual / polite / formal */
  register: "반말" | "존댓말" | "하게체" | "나레이션";
  sampleLine?: string;
}

export interface GlossaryTerm {
  id: string;
  source: string;
  target: string;
  pos: string; // part of speech / category
  domain: string;
  dnt: boolean; // do-not-translate (keep as-is / proper noun)
  note?: string;
  status: "proposed" | "approved";
}

export interface Segment {
  id: string;
  key: string; // string id like #0142
  speakerId: string | null; // null = narration
  scene: string;
  source: string;
  target: string;
  status: SegmentStatus;
  charLimit?: number;
}

export interface Project {
  id: string;
  productId: string;
  name: string;
  sourceLang: string;
  targetLang: string;
  segments: Segment[];
}

export interface Product {
  id: string;
  studio: string;
  name: string;
  genre: string;
}
