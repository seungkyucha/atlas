import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { SpeakerTone } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const speaker = db.speakers.find((s) => s.id === params.id);
  if (!speaker) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<{
    name: string;
    role: string;
    persona: string;
    tones: Record<string, SpeakerTone>;
  }>;

  if (body.name !== undefined) speaker.name = body.name;
  if (body.role !== undefined) speaker.role = body.role;
  if (body.persona !== undefined) speaker.persona = body.persona;
  if (body.tones) speaker.tones = { ...speaker.tones, ...body.tones };

  return NextResponse.json(speaker);
}
