"use client";

import { useState } from "react";
import { ContextNote } from "@/lib/types";
import { langLabel } from "@/lib/config";

export function ContextEditor({
  productId,
  contexts,
  targetLangs,
}: {
  productId: string;
  contexts: ContextNote[];
  targetLangs: string[];
}) {
  const [list, setList] = useState<ContextNote[]>(contexts);

  async function addNote() {
    const res = await fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, scene: "새 씬", arc: "", note: "" }),
    });
    if (res.ok) {
      const n = await res.json();
      setList((p) => [...p, { ...n, guides: {} }]);
    }
  }
  async function deleteNote(id: string) {
    if (!confirm("이 맥락 노트를 삭제할까요?")) return;
    setList((p) => p.filter((c) => c.id !== id));
    await fetch(`/api/context/${id}`, { method: "DELETE" });
  }

  function update(id: string, patch: Partial<ContextNote>) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function setGuide(id: string, lang: string, value: string) {
    setList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, guides: { ...c.guides, [lang]: value } } : c))
    );
  }
  function persist(id: string, body: Partial<ContextNote>) {
    fetch(`/api/context/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={addNote} className="rounded-lg bg-indigo px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep">
          + 맥락 노트 추가
        </button>
      </div>
      {list.length === 0 && <div className="text-[13px] text-faint">맥락 노트가 없습니다.</div>}
      {list.map((c) => (
        <div key={c.id} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={c.scene}
              onChange={(e) => update(c.id, { scene: e.target.value })}
              onBlur={(e) => persist(c.id, { scene: e.target.value })}
              className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-bold hover:border-line focus:border-indigo focus:outline-none"
            />
            <input
              value={c.arc}
              onChange={(e) => update(c.id, { arc: e.target.value })}
              onBlur={(e) => persist(c.id, { arc: e.target.value })}
              className="rounded-full bg-line2 px-2.5 py-0.5 text-[11.5px] font-semibold text-muted focus:outline-none"
            />
            <button onClick={() => deleteNote(c.id)} className="ml-auto rounded-md px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-bad-soft">삭제</button>
          </div>
          <textarea
            value={c.note}
            onChange={(e) => update(c.id, { note: e.target.value })}
            onBlur={(e) => persist(c.id, { note: e.target.value })}
            rows={2}
            placeholder="맥락 노트 (씬 설명, 분위기, 톤…)"
            className="mt-2 w-full resize-none rounded-lg border border-line bg-panel2 px-3 py-2 text-[13.5px] focus:border-indigo focus:outline-none"
          />
          <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-faint">
            언어별 번역 가이드
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {targetLangs.map((l) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11.5px] text-faint">{langLabel(l)}</span>
                <input
                  value={c.guides[l] ?? ""}
                  onChange={(e) => setGuide(c.id, l, e.target.value)}
                  onBlur={(e) => persist(c.id, { guides: { [l]: e.target.value } })}
                  placeholder="가이드"
                  className="flex-1 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[13px] focus:border-indigo focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
