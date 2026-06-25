import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { GlossaryTerm } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const term = await prisma.glossaryTerm.findUnique({ where: { id: params.id } });
  if (!term) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<GlossaryTerm>;
  const data: Prisma.GlossaryTermUpdateInput = {};
  if (body.source !== undefined) data.source = body.source;
  if (body.pos !== undefined) data.pos = body.pos;
  if (body.domain !== undefined) data.domain = body.domain;
  if (body.dnt !== undefined) data.dnt = body.dnt;
  if (body.note !== undefined) data.note = body.note;
  if (body.status !== undefined) data.status = body.status;
  if (body.targets) {
    data.targets = {
      ...((term.targets as unknown as Record<string, string>) ?? {}),
      ...body.targets,
    } as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.glossaryTerm.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.glossaryTerm.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
