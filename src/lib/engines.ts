import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EngineId, langName } from "./config";

export interface EngineInput {
  source: string;
  sourceLang: string; // code
  targetLang: string; // code
  speaker?: { name: string; persona: string; tone: string; register: string } | null;
  scene?: string;
  contextGuide?: string;
  glossary?: { source: string; target: string; dnt: boolean }[];
}

export function buildSystem(input: EngineInput): string {
  const src = langName(input.sourceLang);
  const tgt = langName(input.targetLang);
  const lines: string[] = [
    `You are a professional game localization translator working in ATLAS.`,
    `Translate the user's source text from ${src} to ${tgt}.`,
    `Return ONLY the translated line in ${tgt} — no quotes, no notes, no explanation.`,
  ];
  if (input.speaker) {
    lines.push(
      ``,
      `Speaker: ${input.speaker.name} — ${input.speaker.persona}.`,
      `Voice/tone to preserve in ${tgt}: ${input.speaker.tone} (register: ${input.speaker.register}).`,
      `Match this character's speech register and personality faithfully.`
    );
  }
  if (input.scene) lines.push(``, `Scene: ${input.scene}.`);
  if (input.contextGuide) lines.push(`Translation guide: ${input.contextGuide}.`);
  if (input.glossary && input.glossary.length) {
    lines.push(``, `Glossary — you MUST use these renderings in ${tgt}:`);
    for (const g of input.glossary) {
      lines.push(
        g.dnt
          ? `- "${g.source}" → keep/transliterate as "${g.target}"`
          : `- "${g.source}" → "${g.target}"`
      );
    }
  }
  return lines.join("\n");
}

function demoTranslate(input: EngineInput): string {
  let t = input.source;
  for (const g of input.glossary ?? []) {
    if (g.target) t = t.replace(new RegExp(`\\b${g.source}\\b`, "gi"), g.target);
  }
  return `〔demo:${input.targetLang}〕 ${t}`;
}

async function viaClaude(input: EngineInput, model: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    system: buildSystem(input),
    messages: [{ role: "user", content: input.source }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function viaOpenAI(input: EngineInput, model: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const res = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: buildSystem(input) },
      { role: "user", content: input.source },
    ],
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

async function viaGoogle(input: EngineInput, model: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const m = genAI.getGenerativeModel({
    model,
    systemInstruction: buildSystem(input),
  });
  const res = await m.generateContent(input.source);
  return res.response.text().trim();
}

export interface EngineResult {
  translation: string;
  demo: boolean;
  engine: EngineId;
  error?: string;
}

const hasKey: Record<EngineId, () => boolean> = {
  claude: () => !!process.env.ANTHROPIC_API_KEY,
  openai: () => !!process.env.OPENAI_API_KEY,
  google: () => !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
};

// ---- document analysis (speaker classification + term extraction) ----
export interface AnalysisResult {
  speaker: string | null; // speaker name or null/"narration"
  terms: string[];
  demo: boolean;
}

function demoAnalysis(source: string): AnalysisResult {
  const isDialogue = /["'“”‘’].+["'“”‘’]/.test(source) || /^["'“”]/.test(source.trim());
  const terms = Array.from(
    new Set(
      (source.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? []).filter(
        (w, i) => !(i === 0 && source.startsWith(w))
      )
    )
  ).slice(0, 5);
  return { speaker: isDialogue ? null : "Narration", terms, demo: true };
}

function analysisSystem(speakerNames: string[]): string {
  return [
    "You analyze a single line from a game script.",
    `Choose the most likely speaker from this list (or "Narration" if it is narration / stage direction): ${["Narration", ...speakerNames].join(", ")}.`,
    "Also extract 0-5 candidate glossary terms (proper nouns, items, places, special vocabulary) from the line.",
    'Respond ONLY with compact JSON: {"speaker": string, "terms": string[]}.',
  ].join("\n");
}

function parseAnalysis(text: string): { speaker: string | null; terms: string[] } {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : text);
    return {
      speaker: typeof obj.speaker === "string" ? obj.speaker : null,
      terms: Array.isArray(obj.terms) ? obj.terms.filter((t: unknown) => typeof t === "string").slice(0, 5) : [],
    };
  } catch {
    return { speaker: null, terms: [] };
  }
}

export async function runAnalysis(
  engine: EngineId,
  model: string,
  source: string,
  speakerNames: string[]
): Promise<AnalysisResult> {
  if (!hasKey[engine]()) return demoAnalysis(source);
  try {
    const system = analysisSystem(speakerNames);
    let raw = "";
    if (engine === "claude") {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: source }],
      });
      raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    } else if (engine === "openai") {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const res = await client.chat.completions.create({
        model,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: source },
        ],
      });
      raw = res.choices[0]?.message?.content ?? "";
    } else {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
      const m = genAI.getGenerativeModel({ model, systemInstruction: system });
      const res = await m.generateContent(source);
      raw = res.response.text();
    }
    const parsed = parseAnalysis(raw);
    return { ...parsed, demo: false };
  } catch {
    return demoAnalysis(source);
  }
}

export async function runEngine(
  engine: EngineId,
  model: string,
  input: EngineInput
): Promise<EngineResult> {
  if (!hasKey[engine]()) {
    return { translation: demoTranslate(input), demo: true, engine };
  }
  try {
    let translation = "";
    if (engine === "claude") translation = await viaClaude(input, model);
    else if (engine === "openai") translation = await viaOpenAI(input, model);
    else if (engine === "google") translation = await viaGoogle(input, model);
    return { translation, demo: false, engine };
  } catch (err) {
    return {
      translation: demoTranslate(input),
      demo: true,
      engine,
      error: err instanceof Error ? err.message : "engine error",
    };
  }
}
