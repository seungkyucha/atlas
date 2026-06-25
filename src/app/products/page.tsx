import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getProducts, productProjects } from "@/lib/repo";
import { langLabel, engineMap, modelLabel } from "@/lib/config";
import { NewProduct } from "@/components/NewProduct";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();
  const withCounts = await Promise.all(
    products.map(async (p) => ({ p, n: (await productProjects(p.id)).length }))
  );

  return (
    <>
      <PageHeader crumb="설정" title="프로덕트" subtitle="법인 · 스튜디오 · 프로덕트별 원어/지원언어 및 번역 엔진 관리" right={<NewProduct />} />
      <main className="px-8 py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {withCounts.map(({ p, n }) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="rounded-2xl border border-line bg-panel p-5 shadow-card transition-all hover:border-indigo hover:shadow-pop"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wide text-faint">{p.studio}</div>
                  <div className="mt-0.5 text-[16px] font-bold tracking-tight">{p.name}</div>
                  <div className="text-[12px] text-muted">{p.genre}</div>
                </div>
                <span className="rounded-md bg-indigo-soft px-2 py-1 font-mono text-[11px] font-semibold text-indigo-deep">
                  {engineMap[p.engine].label} · {modelLabel(p.engine, p.model)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-line2 px-2 py-0.5 text-[11px] font-semibold text-muted">원어 {langLabel(p.sourceLang)}</span>
                {p.targetLangs.map((l) => (
                  <span key={l} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{langLabel(l)}</span>
                ))}
              </div>
              <div className="mt-3 text-[12px] text-faint">{n}개 프로젝트</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
