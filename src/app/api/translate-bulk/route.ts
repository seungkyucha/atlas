import { NextResponse } from "next/server";
import { runEngine, EngineInput } from "@/lib/engines";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { EngineId } from "@/lib/config";
import { SpeakerTone, Translation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Translate a batch of segments into the requested languages and persist.
// mode "empty" = only fill blank cells; "all" = (re)translate every requested cell.
export async function POST(req: Request) {
  try {
    const { projectId, segmentIds, targetLangs, mode } = (await req.json()) as {
      projectId: string;
      segmentIds: string[];
      targetLangs?: string[];
      mode?: "empty" | "all";
    };
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }
    if (Array.isArray(segmentIds) && segmentIds.length > 40) {
      return NextResponse.json({ error: "batch too large (max 40)" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const product = project ? await prisma.product.findUnique({ where: { id: project.productId } }) : null;
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const langs = (targetLangs?.length ? targetLangs : product.targetLangs).filter((l) =>
      product.targetLangs.includes(l)
    );

    const [speakers, glossary, contexts, segments] = await Promise.all([
      prisma.speaker.findMany({ where: { productId: product.id } }),
      prisma.glossaryTerm.findMany({ where: { productId: product.id } }),
      prisma.contextNote.findMany({ where: { productId: product.id } }),
      Array.isArray(segmentIds) && segmentIds.length
        ? prisma.segment.findMany({ where: { id: { in: segmentIds }, projectId } })
        : prisma.segment.findMany({ where: { projectId }, orderBy: { order: "asc" }, take: 40 }),
    ]);
    const speakerById = Object.fromEntries(speakers.map((s) => [s.id, s]));
    const contextById = Object.fromEntries(contexts.map((c) => [c.id, c]));

    let filled = 0;
    let demo = false;
    const onlyEmpty = (mode ?? "empty") === "empty";
    const updated: Record<string, Record<string, Translation>> = {};

    await Promise.all(
      segments.map(async (seg) => {
        const translations = { ...((seg.translations as unknown as Record<string, Translation>) ?? {}) };
        const speaker = seg.speakerId ? speakerById[seg.speakerId] : undefined;
        const tones = (speaker?.tones as unknown as Record<string, SpeakerTone>) ?? {};
        const context = seg.contextId ? contextById[seg.contextId] : undefined;
        const guides = (context?.guides as unknown as Record<string, string>) ?? {};
        const matched = glossary.filter((g) =>
          new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(seg.source.toLowerCase())
        );

        const toDo = langs.filter((l) => {
          const cur = translations[l]?.text ?? "";
          return onlyEmpty ? cur.trim() === "" : true;
        });
        if (toDo.length === 0) return;

        await Promise.all(
          toDo.map(async (lang) => {
            const input: EngineInput = {
              source: seg.source,
              sourceLang: product.sourceLang,
              targetLang: lang,
              speaker: speaker
                ? { name: speaker.name, persona: speaker.persona, tone: tones[lang]?.tone ?? "", register: tones[lang]?.register ?? "" }
                : null,
              scene: seg.scene,
              contextGuide: guides[lang],
              glossary: matched
                .map((g) => ({ source: g.source, target: ((g.targets as unknown as Record<string, string>) ?? {})[lang] ?? "", dnt: g.dnt }))
                .filter((g) => g.target || g.dnt),
            };
            const r = await runEngine(product.engine as EngineId, product.model, input);
            if (r.demo) demo = true;
            translations[lang] = { text: r.translation, status: "ai_draft" };
            filled++;
          })
        );

        await prisma.segment.update({
          where: { id: seg.id },
          data: { translations: translations as unknown as Prisma.InputJsonValue },
        });
        updated[seg.id] = translations;
      })
    );

    return NextResponse.json({ ok: true, filled, demo, updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bulk failed" }, { status: 500 });
  }
}
