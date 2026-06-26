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
    namespace: string;
    source: string;
    speakerId: string | null;
    scene: string;
    description: string | null;
    maxLen: number | null;
    contextId: string | null;
  }>;
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  const last = await prisma.segment.findFirst({
    where: { projectId: body.projectId },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? 0) + 1;
  const segment = await prisma.segment.create({
    data: {
      id: uid("seg"),
      projectId: body.projectId,
      key: body.key?.trim() || `KEY_${String(order).padStart(4, "0")}`,
      namespace: body.namespace ?? "",
      speakerId: body.speakerId ?? null,
      scene: body.scene ?? "",
      contextId: body.contextId ?? null,
      description: body.description ?? null,
      maxLen: body.maxLen ?? null,
      source: body.source ?? "",
      translations: {},
      order,
    } as Prisma.SegmentUncheckedCreateInput,
  });
  return NextResponse.json(segment);
}
