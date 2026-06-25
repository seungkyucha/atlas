import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    productId: string;
    scene: string;
    arc: string;
    note: string;
  }>;
  if (!body.productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  const note = await prisma.contextNote.create({
    data: {
      id: uid("ctx"),
      productId: body.productId,
      scene: body.scene ?? "새 씬",
      arc: body.arc ?? "",
      note: body.note ?? "",
      guides: {},
    } as Prisma.ContextNoteUncheckedCreateInput,
  });
  return NextResponse.json(note);
}
