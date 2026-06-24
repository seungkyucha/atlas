import { NextResponse } from "next/server";
import { translate, TranslateInput } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranslateInput;
    if (!body?.source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }
    const result = await translate(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
