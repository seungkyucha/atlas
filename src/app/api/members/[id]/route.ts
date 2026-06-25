import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard, ROLE_RANK } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = await guard("admin");
  if (denied) return denied;
  const { role } = (await req.json()) as { role: string };
  if (!role || !(role in ROLE_RANK)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  try {
    const updated = await prisma.appUser.update({ where: { id: params.id }, data: { role } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
