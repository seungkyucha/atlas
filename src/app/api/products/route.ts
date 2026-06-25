import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";
import { guard } from "@/lib/session";
import { engineMap, EngineId } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const denied = await guard("manager");
  if (denied) return denied;

  const body = (await req.json()) as Partial<{
    studio: string;
    name: string;
    genre: string;
    sourceLang: string;
    targetLangs: string[];
    engine: EngineId;
    model: string;
  }>;
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const engine: EngineId = body.engine && engineMap[body.engine] ? body.engine : "claude";
  const model =
    body.model && engineMap[engine].models.some((m) => m.id === body.model)
      ? body.model
      : engineMap[engine].models[0].id;

  const product = await prisma.product.create({
    data: {
      id: uid("prod"),
      studio: body.studio ?? "Superawesome Studio",
      name: body.name,
      genre: body.genre ?? "",
      sourceLang: body.sourceLang ?? "en",
      targetLangs: body.targetLangs ?? ["ko"],
      engine,
      model,
    } as Prisma.ProductUncheckedCreateInput,
  });
  return NextResponse.json(product);
}
