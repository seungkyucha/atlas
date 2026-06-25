import { NextResponse } from "next/server";
import { db, uid } from "@/lib/store";
import { GlossaryTerm } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<GlossaryTerm> & { productId: string };
  if (!body.productId || !body.source) {
    return NextResponse.json({ error: "productId and source required" }, { status: 400 });
  }
  const term: GlossaryTerm = {
    id: uid("g"),
    productId: body.productId,
    source: body.source,
    pos: body.pos ?? "",
    domain: body.domain ?? "",
    dnt: body.dnt ?? false,
    note: body.note,
    status: body.status ?? "proposed",
    targets: body.targets ?? {},
  };
  db.glossary.push(term);
  return NextResponse.json(term);
}
