import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { ContextNote } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const note = db.contexts.find((c) => c.id === params.id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<ContextNote>;
  if (body.scene !== undefined) note.scene = body.scene;
  if (body.arc !== undefined) note.arc = body.arc;
  if (body.note !== undefined) note.note = body.note;
  if (body.guides) note.guides = { ...note.guides, ...body.guides };

  return NextResponse.json(note);
}
