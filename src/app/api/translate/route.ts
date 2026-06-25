import { NextResponse } from "next/server";
import { runEngine, EngineInput } from "@/lib/engines";
import {
  getProject,
  getProduct,
  getSpeaker,
  productGlossary,
  db,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { projectId, segmentId, targetLangs } = (await req.json()) as {
      projectId: string;
      segmentId: string;
      targetLangs?: string[];
    };

    const project = getProject(projectId);
    const segment = project?.segments.find((s) => s.id === segmentId);
    if (!project || !segment) {
      return NextResponse.json({ error: "segment not found" }, { status: 404 });
    }
    const product = getProduct(project.productId);
    if (!product) {
      return NextResponse.json({ error: "product not found" }, { status: 404 });
    }

    const langs = (targetLangs && targetLangs.length
      ? targetLangs
      : product.targetLangs
    ).filter((l) => product.targetLangs.includes(l));

    const speaker = getSpeaker(segment.speakerId);
    const context = segment.contextId
      ? db.contexts.find((c) => c.id === segment.contextId)
      : undefined;

    const matched = productGlossary(product.id).filter((g) =>
      new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(segment.source.toLowerCase())
    );

    const results: Record<
      string,
      { translation: string; demo: boolean; engine: string; error?: string }
    > = {};

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
                tone: speaker.tones[lang]?.tone ?? "",
                register: speaker.tones[lang]?.register ?? "",
              }
            : null,
          scene: segment.scene,
          contextGuide: context?.guides[lang],
          glossary: matched
            .map((g) => ({
              source: g.source,
              target: g.targets[lang] ?? "",
              dnt: g.dnt,
            }))
            .filter((g) => g.target || g.dnt),
        };
        results[lang] = await runEngine(product.engine, product.model, input);
      })
    );

    return NextResponse.json({ results, engine: product.engine, model: product.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
