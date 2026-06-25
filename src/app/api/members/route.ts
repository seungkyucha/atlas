import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const members = await prisma.appUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ members });
}
