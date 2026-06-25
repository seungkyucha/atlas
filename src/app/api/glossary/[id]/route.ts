import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { GlossaryTerm } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const term = db.glossary.find((g) => g.id === params.id);
  if (!term) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<GlossaryTerm>;
  if (body.source !== undefined) term.source = body.source;
  if (body.pos !== undefined) term.pos = body.pos;
  if (body.domain !== undefined) term.domain = body.domain;
  if (body.dnt !== undefined) term.dnt = body.dnt;
  if (body.note !== undefined) term.note = body.note;
  if (body.status !== undefined) term.status = body.status;
  if (body.targets) term.targets = { ...term.targets, ...body.targets };

  return NextResponse.json(term);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const idx = db.glossary.findIndex((g) => g.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.glossary.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
