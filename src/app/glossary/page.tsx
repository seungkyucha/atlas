import { PageHeader } from "@/components/PageHeader";
import { glossary } from "@/lib/data";

export default function GlossaryPage() {
  return (
    <>
      <PageHeader
        crumb="자산 관리"
        title="용어집"
        subtitle="프로덕트 표준 번역어 · 금지(DNT) · 승인 상태"
        right={
          <button className="rounded-lg bg-indigo px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep">
            + 용어 추가
          </button>
        }
      />
      <main className="px-8 py-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
          <table className="w-full text-[13.5px]">
            <thead className="bg-panel2 text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">원어</th>
                <th className="px-4 py-3 text-left font-semibold">번역어</th>
                <th className="px-4 py-3 text-left font-semibold">분류</th>
                <th className="px-4 py-3 text-left font-semibold">도메인</th>
                <th className="px-4 py-3 text-left font-semibold">속성</th>
                <th className="px-4 py-3 text-left font-semibold">상태</th>
              </tr>
            </thead>
            <tbody>
              {glossary.map((g) => (
                <tr key={g.id} className="border-t border-line2 hover:bg-panel2">
                  <td className="px-4 py-3 font-mono text-[13px]">{g.source}</td>
                  <td className="px-4 py-3 font-semibold">{g.target}</td>
                  <td className="px-4 py-3 text-muted">{g.pos}</td>
                  <td className="px-4 py-3 text-muted">{g.domain}</td>
                  <td className="px-4 py-3">
                    {g.dnt ? (
                      <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">
                        DNT
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {g.status === "approved" ? (
                      <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok">
                        확정
                      </span>
                    ) : (
                      <span className="rounded-full bg-line2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                        제안
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] text-faint">
          DNT(Do-Not-Translate): 고유명사·타이틀명 등 번역하지 않고 음차·고정하는 항목.
          번역 워크스페이스에서 원문에 매칭되면 자동으로 컨텍스트에 주입됩니다.
        </p>
      </main>
    </>
  );
}
