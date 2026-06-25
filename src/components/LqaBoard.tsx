"use client";

import { useState } from "react";

interface Row {
  id: string;
  segKey: string;
  source: string;
  lang: string;
  langLabel: string;
  severity: string;
  category: string;
  comment: string;
  status: string;
  createdBy: string | null;
}

const sevColor: Record<string, string> = {
  critical: "bg-bad-soft text-bad",
  major: "bg-warn-soft text-warn",
  minor: "bg-line2 text-muted",
};

export function LqaBoard({ rows }: { rows: Row[] }) {
  const [list, setList] = useState(rows);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const shown = list.filter((r) => (filter === "all" ? true : r.status === filter));

  async function toggle(id: string, status: string) {
    const next = status === "open" ? "resolved" : "open";
    setList((p) => p.map((r) => (r.id === id ? { ...r, status: next } : r)));
    await fetch(`/api/lqa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }
  async function remove(id: string) {
    setList((p) => p.filter((r) => r.id !== id));
    await fetch(`/api/lqa/${id}`, { method: "DELETE" });
  }

  const openCount = list.filter((r) => r.status === "open").length;

  return (
    <>
      <div className="mb-4 flex items-center gap-1.5">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
              filter === f ? "bg-indigo-soft text-indigo-deep" : "text-muted hover:bg-line2"
            }`}
          >
            {f === "open" ? "열림" : f === "resolved" ? "해결됨" : "전체"}
          </button>
        ))}
        <span className="tnums ml-2 text-[12.5px] text-faint">열린 이슈 {openCount}건</span>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-8 text-center text-[13px] text-faint">
          이슈가 없습니다. 워크스페이스에서 번역에 이슈를 등록할 수 있습니다.
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border border-line bg-panel p-4 shadow-card ${
                r.status === "resolved" ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sevColor[r.severity] ?? "bg-line2 text-muted"}`}>
                  {r.severity}
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{r.category}</span>
                <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-semibold text-indigo-deep">{r.langLabel}</span>
                <span className="font-mono text-[11px] text-faint">{r.segKey}</span>
                <div className="ml-auto flex gap-1.5">
                  <button onClick={() => toggle(r.id, r.status)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-muted hover:bg-line2">
                    {r.status === "open" ? "해결" : "재오픈"}
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-bad hover:bg-bad-soft">
                    삭제
                  </button>
                </div>
              </div>
              <div className="mt-2 font-mono text-[12px] text-faint">{r.source}</div>
              <div className="mt-1 text-[13.5px] text-ink">{r.comment}</div>
              {r.createdBy && <div className="mt-1 text-[11.5px] text-faint">— {r.createdBy}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
