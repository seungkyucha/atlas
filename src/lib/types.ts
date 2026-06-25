import { EngineId } from "./config";

export type SegmentStatus =
  | "untranslated"
  | "ai_draft"
  | "translating"
  | "translated"
  | "in_review"
  | "rejected"
  | "approved";

/** Per-language tone settings for a speaker. */
export interface SpeakerTone {
  tone: string; // e.g. "반말 · 단호"
  register: string; // free-form: 반말 / 존댓말 / casual / formal ...
  sampleLine?: string;
}

export interface Speaker {
  id: string;
  productId: string;
  name: string;
  role: string;
  persona: string;
  /** keyed by target language code */
  tones: Record<string, SpeakerTone>;
}

export interface GlossaryTerm {
  id: string;
  productId: string;
  source: string;
  pos: string;
  domain: string;
  dnt: boolean;
  note?: string;
  status: "proposed" | "approved";
  /** translation per target language code */
  targets: Record<string, string>;
}

export interface ContextNote {
  id: string;
  productId: string;
  scene: string;
  arc: string;
  note: string;
  /** optional tone/translation guide per target language */
  guides: Record<string, string>;
}

export interface Translation {
  text: string;
  status: SegmentStatus;
}

export interface Segment {
  id: string;
  projectId: string;
  key: string;
  speakerId: string | null;
  scene: string;
  contextId?: string | null;
  source: string;
  /** keyed by target language code */
  translations: Record<string, Translation>;
  /** per-language character limit */
  charLimits?: Record<string, number>;
}

export interface Project {
  id: string;
  productId: string;
  name: string;
  segments: Segment[];
}

export interface Product {
  id: string;
  studio: string;
  name: string;
  genre: string;
  sourceLang: string; // language code
  targetLangs: string[]; // language codes
  engine: EngineId;
  model: string;
}
