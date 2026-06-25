import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { runAnalysis } from "@/lib/engines";
import { uid } from "@/lib/repo";
import { EngineId } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI auto-analysis of an imported project: classify speaker per segment and
// extract candidate glossary terms (added as "proposed").
export async function POST(req: Request) {
  try {
    const { projectId, limit } = (await req.json()) as { projectId: string; limit?: number };
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });
    const product = await prisma.product.findUnique({ where: { id: project.productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    const speakers = await prisma.speaker.findMany({ where: { productId: product.id } });
    const byName: Record<string, string> = Object.fromEntries(
      speakers.map((s) => [s.name.toLowerCase(), s.id])
    );
    const segs = await prisma.segment.findMany({
      where: { projectId, speakerId: null },
      orderBy: { order: "asc" },
      take: Math.min(limit ?? 40, 60),
    });

    const existingTerms = new Set(
      (await prisma.glossaryTerm.findMany({ where: { productId: product.id } })).map((g) =>
        g.source.toLowerCase()
      )
    );

    let speakersAssigned = 0;
    const newTerms = new Map<string, true>();
    let demo = false;

    await Promise.all(
      segs.map(async (s) => {
        const a = await runAnalysis(
          product.engine as EngineId,
          product.model,
          s.source,
          speakers.map((sp) => sp.name)
        );
        if (a.demo) demo = true;
        if (a.speaker && byName[a.speaker.toLowerCase()]) {
          await prisma.segment.update({
            where: { id: s.id },
            data: { speakerId: byName[a.speaker.toLowerCase()] },
          });
          speakersAssigned++;
        }
        for (const t of a.terms) {
          const key = t.trim().toLowerCase();
          if (key && !existingTerms.has(key)) newTerms.set(t.trim(), true);
        }
      })
    );

    let termsAdded = 0;
    for (const term of newTerms.keys()) {
      await prisma.glossaryTerm.create({
        data: {
          id: uid("g"),
          productId: product.id,
          source: term,
          pos: "",
          domain: "자동추출",
          dnt: false,
          status: "proposed",
          targets: {} as Prisma.InputJsonValue,
        } as Prisma.GlossaryTermUncheckedCreateInput,
      });
      termsAdded++;
    }

    return NextResponse.json({
      ok: true,
      analyzed: segs.length,
      speakersAssigned,
      termsAdded,
      demo,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "analysis failed" },
      { status: 500 }
    );
  }
}
