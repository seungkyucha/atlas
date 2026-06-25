import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db, productProjects } from "@/lib/store";
import { langLabel, modelLabel, engineMap } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const products = db.products;

  let totalCells = 0;
  let approvedCells = 0;
  let reviewCells = 0;
  for (const pr of products) {
    for (const proj of productProjects(pr.id)) {
      for (const seg of proj.segments) {
        for (const l of pr.targetLangs) {
          totalCells++;
          const st = seg.translations[l]?.status ?? "untranslated";
          if (st === "approved") approvedCells++;
          if (st === "in_review") reviewCells++;
        }
      }
    }
  }

  const kpis = [
    { label: "번역 셀 (세그먼트×언어)", value: totalCells, sub: `${products.length}개 프로덕트` },
    { label: "승인 완료", value: approvedCells, sub: totalCells ? `${Math.round((approvedCells / totalCells) * 100)}%` : "0%" },
    { label: "감수 대기", value: reviewCells, sub: "LQA 큐" },
    { label: "용어집 · 화자", value: `${db.glossary.length} · ${db.speakers.length}`, sub: "자산" },
  ];

  return (
    <>
      <PageHeader
        crumb="Superawesome Studio"
        title="대시보드"
        subtitle="프로덕트별 다국어 번역 진척 · 엔진 · 품질"
      />
      <main className="px-8 py-6">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
              <div className="text-[12px] font-medium text-muted">{k.label}</div>
              <div className="tnums mt-1 text-[28px] font-extrabold leading-none tracking-tight">{k.value}</div>
              <div className="mt-1.5 text-[12px] text-faint">{k.sub}</div>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">프로덕트</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((p) => {
              const projects = productProjects(p.id);
              const segs = projects.flatMap((pr) => pr.segments);
              const cells = segs.length * p.targetLangs.length;
              const approved = segs.reduce(
                (n, s) => n + p.targetLangs.filter((l) => s.translations[l]?.status === "approved").length,
                0
              );
              const pct = cells ? Math.round((approved / cells) * 100) : 0;
              const firstProject = projects[0];
              return (
                <div key={p.id} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-wide text-faint">{p.genre}</div>
                      <div className="mt-0.5 text-[16px] font-bold tracking-tight">{p.name}</div>
                    </div>
                    <span className="rounded-md bg-indigo-soft px-2 py-1 font-mono text-[11px] font-semibold text-indigo-deep">
                      {engineMap[p.engine].label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-line2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                      원어 {langLabel(p.sourceLang)}
                    </span>
                    {p.targetLangs.map((l) => (
                      <span key={l} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                        {langLabel(l)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line2">
                    <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="tnums font-semibold text-ink">{pct}% 승인</span>
                    <span className="tnums text-faint">{modelLabel(p.engine, p.model)}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {firstProject && (
                      <Link
                        href={`/workspace/${firstProject.id}`}
                        className="flex-1 rounded-lg bg-indigo px-3 py-2 text-center text-[13px] font-semibold text-white transition-colors hover:bg-indigo-deep"
                      >
                        워크스페이스
                      </Link>
                    )}
                    <Link
                      href={`/products/${p.id}`}
                      className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-line2"
                    >
                      설정
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
