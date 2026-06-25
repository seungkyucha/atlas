import { NextResponse } from "next/server";
import { getProduct } from "@/lib/store";
import { EngineId, engineMap } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const product = getProduct(params.id);
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<{
    sourceLang: string;
    targetLangs: string[];
    engine: EngineId;
    model: string;
  }>;

  if (body.sourceLang) product.sourceLang = body.sourceLang;
  if (Array.isArray(body.targetLangs)) product.targetLangs = body.targetLangs;
  if (body.engine && engineMap[body.engine]) {
    product.engine = body.engine;
    // keep model valid for the engine
    if (!engineMap[body.engine].models.some((m) => m.id === product.model)) {
      product.model = engineMap[body.engine].models[0].id;
    }
  }
  if (body.model) product.model = body.model;

  return NextResponse.json(product);
}
