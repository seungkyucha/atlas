import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { similarity } from "@/lib/similarity";
import { Translation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Translation memory: fuzzy-match the source against approved/translated
// segments across the whole product, return best target renderings.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const source = searchParams.get("source") ?? "";
  const lang = searchParams.get("lang") ?? "";
  const excludeId = searchParams.get("excludeId") ?? "";
  if (!productId || !source || !lang) {
    return NextResponse.json({ matches: [] });
  }

  const projects = await prisma.project.findMany({
    where: { productId },
    select: { id: true },
  });
  const segs = await prisma.segment.findMany({
    where: { projectId: { in: projects.map((p) => p.id) } },
  });

  const matches = segs
    .filter((s) => s.id !== excludeId)
    .map((s) => {
      const t = (s.translations as unknown as Record<string, Translation>)?.[lang];
      return { segment: s, t };
    })
    .filter(({ t }) => t && t.text && (t.status === "approved" || t.status === "translated"))
    .map(({ segment, t }) => ({
      source: segment.source,
      target: t!.text,
      score: Math.round(similarity(source, segment.source) * 100),
      status: t!.status,
    }))
    .filter((m) => m.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return NextResponse.json({ matches });
}
