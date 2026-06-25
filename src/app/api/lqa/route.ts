import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const segmentId = searchParams.get("segmentId") ?? undefined;
  const issues = await prisma.lqaIssue.findMany({
    where: { projectId, segmentId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ issues });
}

export async function POST(req: Request) {
  const user = await currentUser();
  const body = (await req.json()) as Partial<{
    projectId: string;
    segmentId: string;
    lang: string;
    severity: string;
    category: string;
    comment: string;
  }>;
  if (!body.projectId || !body.segmentId || !body.lang || !body.comment) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const issue = await prisma.lqaIssue.create({
    data: {
      projectId: body.projectId,
      segmentId: body.segmentId,
      lang: body.lang,
      severity: body.severity ?? "major",
      category: body.category ?? "accuracy",
      comment: body.comment,
      createdBy: user?.name ?? user?.email ?? null,
    },
  });
  return NextResponse.json(issue);
}
