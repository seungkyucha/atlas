import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { EngineId, engineMap } from "@/lib/config";
import { guard } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Partial<{
    sourceLang: string;
    targetLangs: string[];
    engine: EngineId;
    model: string;
  }>;

  const data: Prisma.ProductUpdateInput = {};
  if (body.sourceLang) data.sourceLang = body.sourceLang;
  if (Array.isArray(body.targetLangs)) data.targetLangs = body.targetLangs;
  let model = body.model ?? product.model;
  if (body.engine && engineMap[body.engine]) {
    data.engine = body.engine;
    if (!engineMap[body.engine].models.some((m) => m.id === model)) {
      model = engineMap[body.engine].models[0].id;
    }
  }
  data.model = model;

  const updated = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const denied = await guard("admin");
  if (denied) return denied;
  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

