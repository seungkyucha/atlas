import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    productId: string;
    name: string;
    role: string;
    persona: string;
  }>;
  if (!body.productId || !body.name) {
    return NextResponse.json({ error: "productId and name required" }, { status: 400 });
  }
  const speaker = await prisma.speaker.create({
    data: {
      id: uid("spk"),
      productId: body.productId,
      name: body.name,
      role: body.role ?? "",
      persona: body.persona ?? "",
      tones: {},
    } as Prisma.SpeakerUncheckedCreateInput,
  });
  return NextResponse.json(speaker);
}
