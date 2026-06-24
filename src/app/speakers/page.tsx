import { PageHeader } from "@/components/PageHeader";
import { speakers } from "@/lib/data";

const registerColor: Record<string, string> = {
  반말: "bg-bad-soft text-bad",
  존댓말: "bg-ok-soft text-ok",
  하게체: "bg-warn-soft text-warn",
  나레이션: "bg-line2 text-muted",
};

export default function SpeakersPage() {
  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="화자 · 어투"
        subtitle="캐릭터별 말투 · 존대 등급 · 예시 대사 — AI 번역 시 자동 반영"
        right={
          <button className="rounded-lg bg-indigo px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep">
            + 화자 추가
          </button>
        }
      />
      <main className="px-8 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {speakers.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-line bg-panel p-5 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[16px] font-bold tracking-tight">{s.name}</div>
                  <div className="text-[13px] text-muted">{s.role}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    registerColor[s.register] ?? "bg-line2 text-muted"
                  }`}
                >
                  {s.register}
                </span>
              </div>

              <p className="mt-3 text-[13px] text-muted">{s.persona}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.tone.split("·").map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-indigo-soft px-2 py-0.5 text-[11.5px] font-semibold text-indigo-deep"
                  >
                    {t.trim()}
                  </span>
                ))}
              </div>

              {s.sampleLine && (
                <div className="mt-4 rounded-lg border-l-2 border-indigo bg-panel2 px-3.5 py-2.5 text-[14px] italic text-ink">
                  “{s.sampleLine}”
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
