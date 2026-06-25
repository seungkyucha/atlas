import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getProduct, productProjects } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { langLabel, modelLabel, engineMap } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ProductOverview({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const projects = await productProjects(product.id);
  const [glossaryCount, speakerCount, contextCount] = await Promise.all([
    prisma.glossaryTerm.count({ where: { productId: product.id } }),
    prisma.speaker.count({ where: { productId: product.id } }),
    prisma.contextNote.count({ where: { productId: product.id } }),
  ]);

  const segs = projects.flatMap((p) => p.segments);
  const cells = segs.length * product.targetLangs.length;
  let approved = 0;
  for (const s of segs)
    for (const l of product.targetLangs) if (s.translations[l]?.status === "approved") approved++;
  const pct = cells ? Math.round((approved / cells) * 100) : 0;

  const kpis = [
    { label: "세그먼트", value: segs.length },
    { label: "번역 셀", value: cells },
    { label: "승인", value: `${pct}%` },
    { label: "용어 · 화자 · 맥락", value: `${glossaryCount}·${speakerCount}·${contextCount}` },
  ];

  const tiles = [
    { href: `/products/${product.id}/glossary`, label: "용어집", icon: "▤" },
    { href: `/products/${product.id}/speakers`, label: "화자 · 어투", icon: "◑" },
    { href: `/products/${product.id}/context`, label: "내러티브 맥락", icon: "❏" },
    { href: `/products/${product.id}/lqa`, label: "LQA 이슈", icon: "⚑" },
    { href: `/products/${product.id}/import`, label: "문서 가져오기", icon: "↥" },
    { href: `/products/${product.id}/settings`, label: "프로덕트 설정", icon: "⚙" },
  ];

  return (
    <>
      <PageHeader
        crumb={`${product.studio} · ${product.genre}`}
        title={product.name}
        subtitle={`원어 ${langLabel(product.sourceLang)} · ${product.targetLangs.map(langLabel).join(", ")}`}
        right={
          <span className="rounded-md bg-indigo-soft px-2.5 py-1.5 font-mono text-[12px] font-semibold text-indigo-deep">
            {engineMap[product.engine].label} · {modelLabel(product.engine, product.model)}
          </span>
        }
      />
      <main className="px-8 py-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
              <div className="text-[12px] font-medium text-muted">{k.label}</div>
              <div className="tnums mt-1 text-[26px] font-extrabold leading-none tracking-tight">{k.value}</div>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">프로젝트</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((pr) => {
              const cs = pr.segments.length * product.targetLangs.length;
              const ap = pr.segments.reduce(
                (n, s) => n + product.targetLangs.filter((l) => s.translations[l]?.status === "approved").length,
                0
              );
              const p = cs ? Math.round((ap / cs) * 100) : 0;
              return (
                <div key={pr.id} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="text-[15px] font-bold">{pr.name}</div>
                    <span className="tnums text-[12px] text-faint">{pr.segments.length} 세그먼트</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-line2">
                    <div className="h-full rounded-full bg-ok" style={{ width: `${p}%` }} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link href={`/products/${product.id}/workspace/${pr.id}`} className="flex-1 rounded-lg bg-indigo px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-indigo-deep">
                      워크스페이스 열기
                    </Link>
                    <a href={`/api/projects/${pr.id}/export?format=csv`} className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-muted hover:bg-line2">CSV</a>
                    <a href={`/api/projects/${pr.id}/export?format=xlsx`} className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-muted hover:bg-line2">XLSX</a>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-panel p-6 text-[13px] text-faint">
                프로젝트가 없습니다. <Link href={`/products/${product.id}/settings`} className="text-indigo hover:underline">설정</Link>에서 추가하거나 <Link href={`/products/${product.id}/import`} className="text-indigo hover:underline">문서 가져오기</Link>로 만드세요.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">자산 관리</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t) => (
              <Link key={t.href} href={t.href} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-card transition-colors hover:border-indigo hover:bg-panel2">
                <span className="text-[16px]">{t.icon}</span>
                <span className="text-[13.5px] font-semibold">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
