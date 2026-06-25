import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { SegmentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const segment = db.projects
    .flatMap((p) => p.segments)
    .find((s) => s.id === params.id);
  if (!segment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { lang, text, status } = (await req.json()) as {
    lang: string;
    text?: string;
    status?: SegmentStatus;
  };
  if (!lang) return NextResponse.json({ error: "lang required" }, { status: 400 });

  const cur = segment.translations[lang] ?? { text: "", status: "untranslated" };
  segment.translations[lang] = {
    text: text !== undefined ? text : cur.text,
    status: status !== undefined ? status : cur.status,
  };
  return NextResponse.json(segment.translations[lang]);
}
