import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SpeakerTone } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const speaker = await prisma.speaker.findUnique({ where: { id: params.id } });
  if (!speaker) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<{
    name: string;
    role: string;
    persona: string;
    tones: Record<string, SpeakerTone>;
  }>;

  const data: Prisma.SpeakerUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.persona !== undefined) data.persona = body.persona;
  if (body.tones) {
    data.tones = {
      ...((speaker.tones as unknown as Record<string, SpeakerTone>) ?? {}),
      ...body.tones,
    } as unknown as Prisma.InputJsonValue;
  }

  const updated = await prisma.speaker.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}
