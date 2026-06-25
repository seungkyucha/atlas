"use client";

import { useState } from "react";
import { GlossaryTerm } from "@/lib/types";
import { langLabel } from "@/lib/config";

export function GlossaryTable({
  productId,
  targetLangs,
  initial,
}: {
  productId: string;
  targetLangs: string[];
  initial: GlossaryTerm[];
}) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [newSource, setNewSource] = useState("");

  function update(id: string, patch: Partial<GlossaryTerm>) {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function updateTarget(id: string, lang: string, value: string) {
    setTerms((prev) =>
      prev.map((t) => (t.id === id ? { ...t, targets: { ...t.targets, [lang]: value } } : t))
    );
  }

  function persist(id: string, body: Partial<GlossaryTerm>) {
    fetch(`/api/glossary/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function addTerm() {
    if (!newSource.trim()) return;
    const res = await fetch("/api/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, source: newSource.trim() }),
    });
    const term = await res.json();
    setTerms((prev) => [...prev, term]);
    setNewSource("");
  }

  async function removeTerm(id: string) {
    setTerms((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/glossary/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function aiFill(t: GlossaryTerm) {
    setBusy(t.id);
    try {
      const res = await fetch("/api/translate-term", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          source: t.source,
          pos: t.pos,
          domain: t.domain,
          targetLangs,
        }),
      });
      const data = await res.json();
      if (data.results) {
        const targets = { ...t.targets };
        for (const l of Object.keys(data.results)) targets[l] = data.results[l].translation;
        update(t.id, { targets });
        persist(t.id, { targets });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-card">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead className="bg-panel2 text-[11px] uppercase tracking-wide text-faint">
          <tr>
            <th className="px-3 py-3 text-left font-semibold">원어</th>
            <th className="px-3 py-3 text-left font-semibold">분류</th>
            {targetLangs.map((l) => (
              <th key={l} className="px-3 py-3 text-left font-semibold">{langLabel(l)}</th>
            ))}
            <th className="px-3 py-3 text-left font-semibold">DNT</th>
            <th className="px-3 py-3 text-left font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            <tr key={t.id} className="border-t border-line2 align-top">
              <td className="px-3 py-2">
                <input
                  value={t.source}
                  onChange={(e) => update(t.id, { source: e.target.value })}
                  onBlur={(e) => persist(t.id, { source: e.target.value })}
                  className="w-28 rounded border border-transparent bg-transparent px-1.5 py-1 font-mono text-[12.5px] hover:border-line focus:border-indigo focus:outline-none"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={t.domain}
                  onChange={(e) => update(t.id, { domain: e.target.value })}
                  onBlur={(e) => persist(t.id, { domain: e.target.value })}
                  placeholder="도메인"
                  className="w-24 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-muted hover:border-line focus:border-indigo focus:outline-none"
                />
              </td>
              {targetLangs.map((l) => (
                <td key={l} className="px-3 py-2">
                  <input
                    value={t.targets[l] ?? ""}
                    onChange={(e) => updateTarget(t.id, l, e.target.value)}
                    onBlur={(e) => persist(t.id, { targets: { [l]: e.target.value } })}
                    placeholder="—"
                    className="w-28 rounded border border-transparent bg-transparent px-1.5 py-1 font-semibold hover:border-line focus:border-indigo focus:outline-none"
                  />
                </td>
              ))}
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={t.dnt}
                  onChange={(e) => {
                    update(t.id, { dnt: e.target.checked });
                    persist(t.id, { dnt: e.target.checked });
                  }}
                  className="h-4 w-4 accent-indigo"
                />
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <button
                  onClick={() => aiFill(t)}
                  disabled={busy === t.id}
                  className="mr-1 rounded-md bg-indigo-soft px-2 py-1 text-[11.5px] font-semibold text-indigo-deep hover:bg-indigo/15 disabled:opacity-50"
                >
                  {busy === t.id ? "…" : "✦ AI"}
                </button>
                <button
                  onClick={() => removeTerm(t.id)}
                  className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-bad-soft"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {/* add row */}
          <tr className="border-t border-line2 bg-panel2">
            <td className="px-3 py-2" colSpan={2}>
              <input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTerm()}
                placeholder="+ 새 용어(원어) 입력 후 Enter"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-[13px] focus:border-indigo focus:outline-none"
              />
            </td>
            <td className="px-3 py-2 text-center" colSpan={targetLangs.length + 2}>
              <button
                onClick={addTerm}
                className="rounded-lg bg-indigo px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-indigo-deep"
              >
                용어 추가
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
