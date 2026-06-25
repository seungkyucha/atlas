import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SegmentStatus, Translation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const segment = await prisma.segment.findUnique({ where: { id: params.id } });
  if (!segment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { lang, text, status } = (await req.json()) as {
    lang: string;
    text?: string;
    status?: SegmentStatus;
  };
  if (!lang) return NextResponse.json({ error: "lang required" }, { status: 400 });

  const translations = { ...((segment.translations as unknown as Record<string, Translation>) ?? {}) };
  const cur = translations[lang] ?? { text: "", status: "untranslated" as SegmentStatus };
  translations[lang] = {
    text: text !== undefined ? text : cur.text,
    status: status !== undefined ? status : cur.status,
  };

  await prisma.segment.update({
    where: { id: params.id },
    data: { translations: translations as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(translations[lang]);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.segment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
