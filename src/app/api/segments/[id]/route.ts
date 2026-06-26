import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SegmentStatus, Translation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const segment = await prisma.segment.findUnique({ where: { id: params.id } });
  if (!segment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    lang?: string;
    text?: string;
    status?: SegmentStatus;
    // metadata
    key?: string;
    source?: string;
    namespace?: string;
    description?: string | null;
    maxLen?: number | null;
    speakerId?: string | null;
    scene?: string;
  };

  // Translation cell update
  if (body.lang) {
    const translations = { ...((segment.translations as unknown as Record<string, Translation>) ?? {}) };
    const cur = translations[body.lang] ?? { text: "", status: "untranslated" as SegmentStatus };
    translations[body.lang] = {
      text: body.text !== undefined ? body.text : cur.text,
      status: body.status !== undefined ? body.status : cur.status,
    };
    await prisma.segment.update({
      where: { id: params.id },
      data: { translations: translations as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json(translations[body.lang]);
  }

  // Metadata update
  const data: Prisma.SegmentUpdateInput = {};
  if (body.key !== undefined) data.key = body.key;
  if (body.source !== undefined) data.source = body.source;
  if (body.namespace !== undefined) data.namespace = body.namespace;
  if (body.description !== undefined) data.description = body.description;
  if (body.maxLen !== undefined) data.maxLen = body.maxLen;
  if (body.scene !== undefined) data.scene = body.scene;
  if (body.speakerId !== undefined) data.speakerId = body.speakerId;
  const updated = await prisma.segment.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.segment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
