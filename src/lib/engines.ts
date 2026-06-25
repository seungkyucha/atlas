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
