import { NextResponse } from "next/server";
import { runEngine, EngineInput } from "@/lib/engines";
import { prisma } from "@/lib/prisma";
import { EngineId } from "@/lib/config";
import { SpeakerTone } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { projectId, segmentId, targetLangs } = (await req.json()) as {
      projectId: string;
      segmentId: string;
      targetLangs?: string[];
    };

    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment || segment.projectId !== projectId) {
      return NextResponse.json({ error: "segment not found" }, { status: 404 });
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const product = project
      ? await prisma.product.findUnique({ where: { id: project.productId } })
      : null;
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const langs = (targetLangs?.length ? targetLangs : product.targetLangs).filter((l) =>
      product.targetLangs.includes(l)
    );

    const speaker = segment.speakerId
      ? await prisma.speaker.findUnique({ where: { id: segment.speakerId } })
      : null;
    const context = segment.contextId
      ? await prisma.contextNote.findUnique({ where: { id: segment.contextId } })
      : null;
    const glossary = await prisma.glossaryTerm.findMany({ where: { productId: product.id } });
    const matched = glossary.filter((g) =>
      new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(segment.source.toLowerCase())
    );

    const tones = (speaker?.tones as unknown as Record<string, SpeakerTone>) ?? {};
    const guides = (context?.guides as unknown as Record<string, string>) ?? {};

    const results: Record<string, { translation: string; demo: boolean; engine: string; error?: string }> = {};
    await Promise.all(
      langs.map(async (lang) => {
        const input: EngineInput = {
          source: segment.source,
          sourceLang: product.sourceLang,
          targetLang: lang,
          speaker: speaker
            ? {
                name: speaker.name,
                persona: speaker.persona,
                tone: tones[lang]?.tone ?? "",
                register: tones[lang]?.register ?? "",
              }
            : null,
          scene: segment.scene,
          contextGuide: guides[lang],
          glossary: matched
            .map((g) => ({
              source: g.source,
              target: ((g.targets as unknown as Record<string, string>) ?? {})[lang] ?? "",
              dnt: g.dnt,
            }))
            .filter((g) => g.target || g.dnt),
        };
        results[lang] = await runEngine(product.engine as EngineId, product.model, input);
      })
    );

    return NextResponse.json({ results, engine: product.engine, model: product.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
