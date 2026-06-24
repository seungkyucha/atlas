import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/Status";
import { projects, products, glossary, speakers, getProduct } from "@/lib/data";
import { SegmentStatus } from "@/lib/types";

function projectStats(statuses: SegmentStatus[]) {
  const total = statuses.length;
  const done = statuses.filter((s) => s === "approved").length;
  const review = statuses.filter((s) => s === "in_review" || s === "rejected").length;
  const wip = statuses.filter(
    (s) => s === "translating" || s === "translated" || s === "ai_draft"
  ).length;
  const todo = statuses.filter((s) => s === "untranslated").length;
  return { total, done, review, wip, todo, pct: total ? Math.round((done / total) * 100) : 0 };
}

export default function Dashboard() {
  const totalSegments = projects.reduce((n, p) => n + p.segments.length, 0);
  const approved = projects.reduce(
    (n, p) => n + p.segments.filter((s) => s.status === "approved").length,
    0
  );
  const inReview = projects.reduce(
    (n, p) => n + p.segments.filter((s) => s.status === "in_review").length,
    0
  );

  const kpis = [
    { label: "전체 세그먼트", value: totalSegments, sub: `${projects.length}개 프로젝트` },
    { label: "승인 완료", value: approved, sub: `${Math.round((approved / totalSegments) * 100)}% 진척` },
    { label: "감수 대기", value: inReview, sub: "LQA 큐" },
    { label: "용어집 항목", value: glossary.length, sub: `${glossary.filter((g) => g.status === "approved").length} 확정` },
  ];

  return (
    <>
      <PageHeader
        crumb="Superawesome Studio"
        title="대시보드"
        subtitle="프로덕트 · 프로젝트별 번역 진척과 품질을 한눈에"
      />
      <main className="px-8 py-6">
        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-line bg-panel p-5 shadow-card"
            >
              <div className="text-[12px] font-medium text-muted">{k.label}</div>
              <div className="tnums mt-1 text-[30px] font-extrabold leading-none tracking-tight">
                {k.value}
              </div>
              <div className="mt-1.5 text-[12px] text-faint">{k.sub}</div>
            </div>
          ))}
        </section>

        {/* Projects */}
        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">
            프로젝트
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((p) => {
              const st = projectStats(p.segments.map((s) => s.status));
              const product = getProduct(p.productId);
              return (
                <Link
                  key={p.id}
                  href={`/workspace/${p.id}`}
                  className="group rounded-2xl border border-line bg-panel p-5 shadow-card transition-all hover:border-indigo hover:shadow-pop"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-wide text-faint">
                        {product?.name} · {product?.genre}
                      </div>
                      <div className="mt-0.5 text-[16px] font-bold tracking-tight">
                        {p.name}
                      </div>
                    </div>
                    <span className="rounded-md bg-line2 px-2 py-1 font-mono text-[11px] font-semibold text-muted">
                      {p.sourceLang} → {p.targetLang}
                    </span>
                  </div>

                  {/* progress bar */}
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line2">
                    <div
                      className="h-full rounded-full bg-ok"
                      style={{ width: `${st.pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="tnums font-semibold text-ink">{st.pct}% 승인</span>
                    <span className="tnums text-faint">
                      {st.done}/{st.total} 세그먼트
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                    <span className="tnums">미번역 {st.todo}</span>
                    <span className="tnums">작업중 {st.wip}</span>
                    <span className="tnums">감수 {st.review}</span>
                    <span className="ml-auto font-semibold text-indigo-deep opacity-0 transition-opacity group-hover:opacity-100">
                      열기 →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Two-up: recent activity + assets */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-panel p-5 shadow-card lg:col-span-2">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">
              최근 세그먼트
            </h2>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-[13px]">
                <thead className="bg-panel2 text-[11px] uppercase tracking-wide text-faint">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">키</th>
                    <th className="px-3 py-2 text-left font-semibold">원문</th>
                    <th className="px-3 py-2 text-left font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {projects[0].segments.slice(0, 6).map((s) => (
                    <tr key={s.id} className="border-t border-line2">
                      <td className="px-3 py-2 font-mono text-[12px] text-faint">{s.key}</td>
                      <td className="max-w-0 truncate px-3 py-2 font-mono text-[12px] text-muted">
                        {s.source}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-5 shadow-card">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-faint">
              자산
            </h2>
            <Link
              href="/glossary"
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3 transition-colors hover:bg-line2"
            >
              <div>
                <div className="text-[13.5px] font-semibold">용어집</div>
                <div className="text-[12px] text-muted">표준 번역어 관리</div>
              </div>
              <span className="tnums text-[18px] font-bold text-indigo">{glossary.length}</span>
            </Link>
            <Link
              href="/speakers"
              className="mt-3 flex items-center justify-between rounded-xl border border-line px-4 py-3 transition-colors hover:bg-line2"
            >
              <div>
                <div className="text-[13.5px] font-semibold">화자 · 어투</div>
                <div className="text-[12px] text-muted">캐릭터 보이스</div>
              </div>
              <span className="tnums text-[18px] font-bold text-indigo">{speakers.length}</span>
            </Link>
            <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3 text-[12px] text-faint">
              번역 메모리(TM) · 내러티브 맥락은 다음 단계
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
