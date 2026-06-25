import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    projectId: string;
    key: string;
    source: string;
    speakerId: string | null;
    scene: string;
    contextId: string | null;
  }>;
  if (!body.projectId || !body.source) {
    return NextResponse.json({ error: "projectId and source required" }, { status: 400 });
  }
  const last = await prisma.segment.findFirst({
    where: { projectId: body.projectId },
    orderBy: { order: "desc" },
  });
  const segment = await prisma.segment.create({
    data: {
      id: uid("seg"),
      projectId: body.projectId,
      key: body.key ?? `#${String((last?.order ?? 0) + 1).padStart(4, "0")}`,
      speakerId: body.speakerId ?? null,
      scene: body.scene ?? "",
      contextId: body.contextId ?? null,
      source: body.source,
      translations: {},
      order: (last?.order ?? 0) + 1,
    } as Prisma.SegmentUncheckedCreateInput,
  });
  return NextResponse.json(segment);
}
