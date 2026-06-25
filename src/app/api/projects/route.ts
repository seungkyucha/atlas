import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/repo";
import { guard } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guard("manager");
  if (denied) return denied;

  const { productId, name } = (await req.json()) as { productId: string; name: string };
  if (!productId || !name) {
    return NextResponse.json({ error: "productId and name required" }, { status: 400 });
  }
  const project = await prisma.project.create({
    data: { id: uid("proj"), productId, name },
  });
  return NextResponse.json(project);
}
