// ---- Supported languages ----
export interface Lang {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: Lang[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt-BR", label: "Portuguese (Brazil)", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
];

export const langMap: Record<string, Lang> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l])
);

export const langLabel = (code: string) =>
  langMap[code] ? `${langMap[code].native}` : code;

export const langName = (code: string) =>
  langMap[code] ? langMap[code].label : code;

// ---- Translation engines & models ----
export type EngineId = "claude" | "openai" | "google";

export interface EngineDef {
  id: EngineId;
  label: string;
  vendor: string;
  envKey: string;
  models: { id: string; label: string }[];
}

export const ENGINES: EngineDef[] = [
  {
    id: "claude",
    label: "Claude",
    vendor: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    vendor: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    ],
  },
  {
    id: "google",
    label: "Google AI",
    vendor: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
];

export const engineMap: Record<EngineId, EngineDef> = Object.fromEntries(
  ENGINES.map((e) => [e.id, e])
) as Record<EngineId, EngineDef>;

export function modelLabel(engine: EngineId, model: string): string {
  const e = engineMap[engine];
  return e?.models.find((m) => m.id === model)?.label ?? model;
}
