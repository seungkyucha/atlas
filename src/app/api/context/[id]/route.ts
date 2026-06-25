import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ContextNote } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const note = await prisma.contextNote.findUnique({ where: { id: params.id } });
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<ContextNote>;
  const data: Prisma.ContextNoteUpdateInput = {};
  if (body.scene !== undefined) data.scene = body.scene;
  if (body.arc !== undefined) data.arc = body.arc;
  if (body.note !== undefined) data.note = body.note;
  if (body.guides) {
    data.guides = {
      ...((note.guides as unknown as Record<string, string>) ?? {}),
      ...body.guides,
    } as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.contextNote.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}
