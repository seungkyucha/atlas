import Anthropic from "@anthropic-ai/sdk";

export interface TranslateInput {
  source: string;
  sourceLang: string;
  targetLang: string;
  speaker?: { name: string; tone: string; register: string; persona: string } | null;
  scene?: string;
  glossary?: { source: string; target: string; dnt: boolean }[];
}

export interface TranslateResult {
  translation: string;
  alternative?: string;
  demo: boolean;
}

const MODEL = "claude-opus-4-8";

function buildSystem(input: TranslateInput): string {
  const lines: string[] = [
    `You are a professional game localization translator working in ATLAS.`,
    `Translate the user's source text from ${input.sourceLang} to ${input.targetLang}.`,
    `Return ONLY the translated line — no quotes, no notes, no explanation.`,
  ];

  if (input.speaker) {
    lines.push(
      ``,
      `Speaker: ${input.speaker.name} — ${input.speaker.persona}.`,
      `Voice/tone to preserve: ${input.speaker.tone} (register: ${input.speaker.register}).`,
      `Match this character's speech register and personality faithfully.`
    );
  }
  if (input.scene) {
    lines.push(``, `Narrative context (scene): ${input.scene}.`);
  }
  if (input.glossary && input.glossary.length) {
    lines.push(``, `Glossary — you MUST use these renderings:`);
    for (const g of input.glossary) {
      lines.push(
        g.dnt
          ? `- "${g.source}" → keep / transliterate as "${g.target}" (do not translate literally)`
          : `- "${g.source}" → "${g.target}"`
      );
    }
  }
  return lines.join("\n");
}

/** Deterministic demo fallback used when no API key is configured. */
function demoTranslate(input: TranslateInput): string {
  let t = input.source;
  for (const g of input.glossary ?? []) {
    t = t.replace(new RegExp(`\\b${g.source}\\b`, "gi"), g.target);
  }
  return `〔데모번역〕 ${t}`;
}

export async function translate(input: TranslateInput): Promise<TranslateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { translation: demoTranslate(input), demo: true };
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystem(input),
    messages: [{ role: "user", content: input.source }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { translation: text, demo: false };
}
