import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { LqaBoard } from "@/components/LqaBoard";
import { langLabel } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function LqaPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const projects = await prisma.project.findMany({
    where: { productId: product.id },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const issues = await prisma.lqaIssue.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "desc" },
  });
  const segIds = Array.from(new Set(issues.map((i) => i.segmentId)));
  const segs = await prisma.segment.findMany({ where: { id: { in: segIds } } });
  const segMap: Record<string, { key: string; source: string }> = Object.fromEntries(
    segs.map((s) => [s.id, { key: s.key, source: s.source }])
  );

  const rows = issues.map((i) => ({
    id: i.id,
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
        crumb={`${product.name} · 품질`}
        title="LQA 이슈"
        subtitle="언어별 품질 이슈 트래킹 · 심각도 · 카테고리 · 재작업"
      />
      <main className="px-8 py-6">
        <LqaBoard rows={rows} />
      </main>
    </>
  );
}
