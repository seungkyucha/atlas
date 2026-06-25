import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { LqaBoard } from "@/components/LqaBoard";
import { langLabel } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function LqaPage() {
  const issues = await prisma.lqaIssue.findMany({ orderBy: { createdAt: "desc" } });
  const segIds = Array.from(new Set(issues.map((i) => i.segmentId)));
  const segs = await prisma.segment.findMany({ where: { id: { in: segIds } } });
  const segMap: Record<string, { key: string; source: string; projectId: string }> =
    Object.fromEntries(segs.map((s) => [s.id, { key: s.key, source: s.source, projectId: s.projectId }]));

  const rows = issues.map((i) => ({
    id: i.id,
    projectId: i.projectId,
    segmentId: i.segmentId,
    segKey: segMap[i.segmentId]?.key ?? "?",
    source: segMap[i.segmentId]?.source ?? "",
    lang: i.lang,
    langLabel: langLabel(i.lang),
    severity: i.severity,
    category: i.category,
    comment: i.comment,
    status: i.status,
    createdBy: i.createdBy,
  }));

  return (
    <>
      <PageHeader
        crumb="품질"
        title="LQA 이슈"
        subtitle="언어별 품질 이슈 트래킹 · 심각도 · 카테고리 · 재작업"
      />
      <main className="px-8 py-6">
        <LqaBoard rows={rows} />
      </main>
    </>
  );
}
