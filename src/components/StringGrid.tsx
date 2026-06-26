"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Project,
  Product,
  Speaker,
  GlossaryTerm,
  ContextNote,
  Segment,
  SegmentStatus,
  Translation,
} from "@/lib/types";
import { langLabel, modelLabel, engineMap } from "@/lib/config";
import { STATUS_META } from "@/components/Status";

const dotColor: Record<SegmentStatus, string> = {
  untranslated: "bg-line",
  ai_draft: "bg-indigo",
  translating: "bg-indigo",
  translated: "bg-ok",
  in_review: "bg-warn",
  rejected: "bg-bad",
  approved: "bg-ok",
};
const borderColor: Record<SegmentStatus, string> = {
  untranslated: "border-l-line",
  ai_draft: "border-l-indigo",
  translating: "border-l-indigo",
  translated: "border-l-ok",
  in_review: "border-l-warn",
  rejected: "border-l-bad",
  approved: "border-l-ok",
};

// placeholder / tag tokens that must be preserved across translation
const PH_RE = /\{[^}]+\}|%(?:\d+\$)?[a-zA-Z]|<\/?[^>]+>|\[[^\]]+\]/g;
function placeholders(s: string): string[] {
  return (s.match(PH_RE) ?? []).slice().sort();
}
function phMatch(src: string, tgt: string): boolean {
  if (!tgt.trim()) return true;
  const a = placeholders(src);
  const b = placeholders(tgt);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

interface Issue { id: string; lang: string; severity: string; comment: string; status: string }

export function StringGrid({
  project,
  product,
  speakers,
  glossary,
  contexts,
}: {
  project: Project;
  product: Product;
  speakers: Speaker[];
  glossary: GlossaryTerm[];
  contexts: ContextNote[];
}) {
  const speakerById = useMemo(() => Object.fromEntries(speakers.map((s) => [s.id, s])), [speakers]);
  const [rows, setRows] = useState<Segment[]>(project.segments);
  const [activeLangs, setActiveLangs] = useState<string[]>(product.targetLangs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "untranslated" | "review">("all");
  const [selected, setSelectedSet] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // drawer-only state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tm, setTm] = useState<Record<string, { source: string; target: string; score: number }[]>>({});
  const [issueDraft, setIssueDraft] = useState<{ lang: string; severity: string; comment: string } | null>(null);

  const drawerSeg = rows.find((r) => r.id === drawerId) ?? null;

  useEffect(() => {
    if (!drawerId) return;
    setTm({});
    setIssueDraft(null);
    fetch(`/api/lqa?segmentId=${drawerId}`).then((r) => r.json()).then((d) => setIssues(d.issues ?? [])).catch(() => setIssues([]));
  }, [drawerId]);

  const filtered = rows.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const hit =
        s.key.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        Object.values(s.translations).some((t) => t.text.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (statusFilter === "untranslated")
      return activeLangs.some((l) => !(s.translations[l]?.text ?? "").trim());
    if (statusFilter === "review")
      return activeLangs.some((l) => s.translations[l]?.status === "in_review" || s.translations[l]?.status === "rejected");
    return true;
  });

  // ---- mutations ----
  function patchCell(id: string, lang: string, patch: Partial<Translation>) {
    setRows((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const cur = s.translations[lang] ?? { text: "", status: "untranslated" as SegmentStatus };
        return { ...s, translations: { ...s.translations, [lang]: { ...cur, ...patch } } };
      })
    );
  }
  function patchMeta(id: string, patch: Partial<Segment>) {
    setRows((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function persistCell(id: string, lang: string, body: Partial<{ text: string; status: SegmentStatus }>) {
    fetch(`/api/segments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, ...body }) }).catch(() => {});
  }
  function persistMeta(id: string, body: Record<string, unknown>) {
    fetch(`/api/segments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }

  function onCellInput(id: string, lang: string, text: string) {
    patchCell(id, lang, { text });
  }
  function onCellBlur(id: string, lang: string) {
    const seg = rows.find((r) => r.id === id);
    const t = seg?.translations[lang];
    if (!t) return;
    const status: SegmentStatus = t.text.trim() ? (t.status === "untranslated" ? "translating" : t.status) : "untranslated";
    patchCell(id, lang, { status });
    persistCell(id, lang, { text: t.text, status });
  }
  function setCellStatus(id: string, lang: string, status: SegmentStatus) {
    patchCell(id, lang, { status });
    const seg = rows.find((r) => r.id === id);
    persistCell(id, lang, { text: seg?.translations[lang]?.text ?? "", status });
  }

  function toggleLang(code: string) {
    setActiveLangs((p) => (p.includes(code) ? (p.length > 1 ? p.filter((c) => c !== code) : p) : [...p, code]));
  }
  function toggleSelect(id: string) {
    setSelectedSet((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAllFiltered() {
    setSelectedSet((p) => (p.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id))));
  }

  async function bulkTranslate(mode: "empty" | "all", ids: string[]) {
    if (ids.length === 0) { setNote("대상 행이 없습니다."); return; }
    setNote(null);
    const chunkSize = 8;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
    setProgress({ done: 0, total: ids.length });
    let demo = false;
    let filledTotal = 0;
    for (const chunk of chunks) {
      try {
        const res = await fetch("/api/translate-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, segmentIds: chunk, targetLangs: activeLangs, mode }),
        });
        const data = await res.json();
        if (data.demo) demo = true;
        filledTotal += data.filled ?? 0;
        if (data.updated) {
          setRows((prev) => prev.map((s) => (data.updated[s.id] ? { ...s, translations: data.updated[s.id] } : s)));
        }
      } catch { /* continue */ }
      setProgress((p) => (p ? { ...p, done: Math.min(p.done + chunk.length, p.total) } : null));
    }
    setProgress(null);
    setNote(`${filledTotal}개 셀 번역 완료${demo ? " (데모 모드 — 엔진 키 설정 시 실제 번역)" : ""}`);
  }

  async function addRow() {
    const key = prompt("새 StringBag 키 (예: DLG_HERO_001)");
    if (key === null) return;
    const source = prompt("원문 (source)") ?? "";
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, key: key.trim(), source }),
    });
    if (res.ok) { const seg = await res.json(); setRows((p) => [...p, { ...seg, translations: seg.translations ?? {} }]); }
  }
  async function deleteRow(id: string) {
    if (!confirm("이 행(키)을 삭제할까요?")) return;
    setRows((p) => p.filter((s) => s.id !== id));
    setSelectedSet((p) => { const n = new Set(p); n.delete(id); return n; });
    if (drawerId === id) setDrawerId(null);
    await fetch(`/api/segments/${id}`, { method: "DELETE" });
  }

  // drawer helpers
  async function fetchTM(lang: string) {
    if (!drawerSeg) return;
    const u = new URL("/api/tm", window.location.origin);
    u.searchParams.set("productId", product.id);
    u.searchParams.set("source", drawerSeg.source);
    u.searchParams.set("lang", lang);
    u.searchParams.set("excludeId", drawerSeg.id);
    const d = await fetch(u.toString()).then((r) => r.json());
    setTm((p) => ({ ...p, [lang]: d.matches ?? [] }));
  }
  async function addIssue() {
    if (!drawerSeg || !issueDraft || !issueDraft.comment.trim()) return;
    const res = await fetch("/api/lqa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, segmentId: drawerSeg.id, lang: issueDraft.lang, severity: issueDraft.severity, comment: issueDraft.comment }),
    });
    if (res.ok) { const issue = await res.json(); setIssues((p) => [issue, ...p]); setIssueDraft(null); }
  }
  async function resolveIssue(id: string) {
    const cur = issues.find((i) => i.id === id);
    const next = cur?.status === "open" ? "resolved" : "open";
    setIssues((p) => p.map((i) => (i.id === id ? { ...i, status: next } : i)));
    await fetch(`/api/lqa/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
  }

  const approvedCells = rows.reduce((n, s) => n + product.targetLangs.filter((l) => s.translations[l]?.status === "approved").length, 0);
  const totalCells = rows.length * product.targetLangs.length;
  const selIds = Array.from(selected);

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-line bg-bg/95 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
              <Link href={`/products/${product.id}`} className="hover:text-ink">{product.name}</Link> / StringBag
            </div>
            <h1 className="truncate text-[16px] font-bold tracking-tight">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-soft px-2 py-1 font-mono text-[11px] font-semibold text-indigo-deep">
              {engineMap[product.engine].label} · {modelLabel(product.engine, product.model)}
            </span>
            <span className="tnums hidden text-[12px] text-muted md:block">승인 {approvedCells}/{totalCells}</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="키·원문·번역 검색"
            className="w-48 rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px] focus:border-indigo focus:outline-none"
          />
          {(["all", "untranslated", "review"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${statusFilter === f ? "bg-indigo-soft text-indigo-deep" : "text-muted hover:bg-line2"}`}>
              {f === "all" ? "전체" : f === "untranslated" ? "미번역" : "감수"}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {product.targetLangs.map((code) => (
            <button key={code} onClick={() => toggleLang(code)}
              className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${activeLangs.includes(code) ? "border-indigo bg-indigo-soft text-indigo-deep" : "border-line text-faint hover:bg-line2"}`}>
              {langLabel(code)}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <button onClick={() => bulkTranslate("empty", filtered.map((s) => s.id))}
            className="rounded-lg bg-indigo px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-indigo-deep">
            ✦ 빈 셀 번역
          </button>
          {selIds.length > 0 && (
            <button onClick={() => bulkTranslate("all", selIds)}
              className="rounded-lg border border-indigo px-3 py-1.5 text-[12.5px] font-semibold text-indigo-deep hover:bg-indigo-soft">
              선택 {selIds.length}행 재번역
            </button>
          )}
          <button onClick={addRow} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-line2">+ 키</button>
          <a href={`/api/projects/${project.id}/export?format=csv`} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-line2">↧ CSV</a>
          <a href={`/api/projects/${project.id}/export?format=xlsx`} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-line2">↧ XLSX</a>
          <Link href={`/products/${product.id}/import`} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-line2">↥ 가져오기</Link>
        </div>
        {progress && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line2">
              <div className="h-full bg-indigo transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <div className="tnums mt-1 text-[11px] text-muted">번역 중… {progress.done}/{progress.total}</div>
          </div>
        )}
        {note && <div className="mt-2 rounded-md bg-indigo-soft px-3 py-1.5 text-[12px] text-indigo-deep">{note}</div>}
      </header>

      {/* Grid */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-panel2 text-[11px] uppercase tracking-wide text-faint shadow-[0_1px_0_#e4e7ee]">
              <tr>
                <th className="w-8 border-b border-line px-2 py-2">
                  <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={selectAllFiltered} className="h-3.5 w-3.5 accent-indigo" />
                </th>
                <th className="sticky left-0 z-10 min-w-[150px] border-b border-r border-line bg-panel2 px-3 py-2 text-left font-semibold">Key</th>
                <th className="min-w-[80px] border-b border-line px-2 py-2 text-left font-semibold">화자</th>
                <th className="min-w-[260px] border-b border-r border-line px-3 py-2 text-left font-semibold">원문 ({langLabel(product.sourceLang)})</th>
                {activeLangs.map((l) => (
                  <th key={l} className="min-w-[220px] border-b border-line px-3 py-2 text-left font-semibold">{langLabel(l)}</th>
                ))}
                <th className="w-10 border-b border-line"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const sp = s.speakerId ? speakerById[s.speakerId] : undefined;
                return (
                  <tr key={s.id} className={`group ${drawerId === s.id ? "bg-indigo-soft/40" : "hover:bg-panel2"}`}>
                    <td className="border-b border-line2 px-2 py-1 align-top">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="mt-1.5 h-3.5 w-3.5 accent-indigo" />
                    </td>
                    <td className="sticky left-0 z-[1] border-b border-r border-line2 bg-panel px-3 py-1.5 align-top group-hover:bg-panel2">
                      <button onClick={() => setDrawerId(s.id)} className="block max-w-[150px] truncate text-left font-mono text-[12px] font-semibold text-ink hover:text-indigo" title={s.key}>
                        {s.key}
                      </button>
                      {s.namespace ? <div className="max-w-[150px] truncate font-mono text-[10px] text-faint">{s.namespace}</div> : null}
                    </td>
                    <td className="border-b border-line2 px-2 py-1.5 align-top text-[11px] text-muted">{sp?.name ?? "—"}</td>
                    <td className="border-b border-r border-line2 px-3 py-1.5 align-top">
                      <div className="max-w-[320px] whitespace-pre-wrap font-mono text-[12px] text-muted">{s.source}</div>
                      {s.maxLen ? <span className="mt-0.5 inline-block rounded bg-line2 px-1 text-[10px] text-faint">max {s.maxLen}</span> : null}
                    </td>
                    {activeLangs.map((l) => {
                      const t = s.translations[l] ?? { text: "", status: "untranslated" as SegmentStatus };
                      const lenMax = s.maxLen ?? s.charLimits?.[l];
                      const len = [...t.text].length;
                      const lenBad = !!lenMax && len > lenMax;
                      const phBad = !phMatch(s.source, t.text);
                      return (
                        <td key={l} className={`border-b border-line2 border-l-2 ${borderColor[t.status]} p-0 align-top`}>
                          <textarea
                            value={t.text}
                            onChange={(e) => onCellInput(s.id, l, e.target.value)}
                            onBlur={() => onCellBlur(s.id, l)}
                            onFocus={() => setDrawerId(s.id)}
                            rows={1}
                            placeholder="—"
                            className="block h-full min-h-[34px] w-full resize-y bg-transparent px-3 py-1.5 text-[13px] text-ink outline-none placeholder:text-faint focus:bg-indigo-soft/30"
                          />
                          {(lenBad || phBad) && (
                            <div className="flex gap-1.5 px-3 pb-1 text-[10px] font-bold">
                              {lenBad && <span className="text-bad">{len}/{lenMax}</span>}
                              {phBad && <span className="text-bad" title="플레이스홀더 불일치">⚠ {"{ }"}</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-line2 px-1 py-1.5 text-center align-top">
                      <button onClick={() => deleteRow(s.id)} className="text-[12px] text-faint opacity-0 hover:text-bad group-hover:opacity-100" title="삭제">✕</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={activeLangs.length + 5} className="px-4 py-10 text-center text-[13px] text-faint">표시할 문자열이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Row detail drawer */}
        {drawerSeg && (
          <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel2">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-faint">문자열 상세</span>
              <button onClick={() => setDrawerId(null)} className="text-[16px] text-faint hover:text-ink">×</button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-faint">Key</label>
                <input value={drawerSeg.key} onChange={(e) => patchMeta(drawerSeg.id, { key: e.target.value })} onBlur={(e) => persistMeta(drawerSeg.id, { key: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 font-mono text-[12.5px] focus:border-indigo focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-faint">네임스페이스</label>
                  <input value={drawerSeg.namespace ?? ""} onChange={(e) => patchMeta(drawerSeg.id, { namespace: e.target.value })} onBlur={(e) => persistMeta(drawerSeg.id, { namespace: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 font-mono text-[11.5px] focus:border-indigo focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-faint">최대 길이</label>
                  <input type="number" value={drawerSeg.maxLen ?? ""} onChange={(e) => patchMeta(drawerSeg.id, { maxLen: e.target.value ? parseInt(e.target.value, 10) : null })} onBlur={(e) => persistMeta(drawerSeg.id, { maxLen: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="mt-1 w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] focus:border-indigo focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-faint">화자</label>
                <select value={drawerSeg.speakerId ?? ""} onChange={(e) => { const v = e.target.value || null; patchMeta(drawerSeg.id, { speakerId: v }); persistMeta(drawerSeg.id, { speakerId: v }); }}
                  className="mt-1 w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] focus:border-indigo focus:outline-none">
                  <option value="">— 내레이션 —</option>
                  {speakers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-faint">원문</label>
                <textarea value={drawerSeg.source} onChange={(e) => patchMeta(drawerSeg.id, { source: e.target.value })} onBlur={(e) => persistMeta(drawerSeg.id, { source: e.target.value })}
                  rows={2} className="mt-1 w-full resize-none rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[13px] focus:border-indigo focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-faint">설명 (컨텍스트)</label>
                <textarea value={drawerSeg.description ?? ""} onChange={(e) => patchMeta(drawerSeg.id, { description: e.target.value })} onBlur={(e) => persistMeta(drawerSeg.id, { description: e.target.value })}
                  rows={2} placeholder="번역가를 위한 맥락" className="mt-1 w-full resize-none rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] focus:border-indigo focus:outline-none" />
              </div>

              {/* placeholders in source */}
              {placeholders(drawerSeg.source).length > 0 && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-faint">플레이스홀더 (유지 필수)</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {placeholders(drawerSeg.source).map((p, i) => <span key={i} className="rounded bg-warn-soft px-1.5 py-0.5 font-mono text-[11px] font-bold text-warn">{p}</span>)}
                  </div>
                </div>
              )}

              {/* per-language detail */}
              {activeLangs.map((l) => {
                const t = drawerSeg.translations[l] ?? { text: "", status: "untranslated" as SegmentStatus };
                const tone = drawerSeg.speakerId ? speakerById[drawerSeg.speakerId]?.tones[l] : undefined;
                const matched = glossary.filter((g) => new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(drawerSeg.source.toLowerCase()));
                return (
                  <div key={l} className="rounded-xl border border-line bg-panel p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold">{langLabel(l)}</span>
                      {tone && <span className="rounded bg-indigo-soft px-1.5 py-0.5 text-[10px] font-semibold text-indigo-deep">{tone.tone}</span>}
                    </div>
                    <textarea value={t.text} onChange={(e) => onCellInput(drawerSeg.id, l, e.target.value)} onBlur={() => onCellBlur(drawerSeg.id, l)}
                      rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[13.5px] focus:border-indigo focus:outline-none" />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(["translating", "translated", "in_review", "approved", "rejected"] as const).map((st) => (
                        <button key={st} onClick={() => setCellStatus(drawerSeg.id, l, st)}
                          className={`rounded border px-1.5 py-0.5 text-[10.5px] font-semibold ${t.status === st ? "border-indigo bg-indigo-soft text-indigo-deep" : "border-line text-muted hover:bg-line2"}`}>
                          {STATUS_META[st].label}
                        </button>
                      ))}
                    </div>
                    {matched.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {matched.map((g) => (
                          <div key={g.id} className="flex justify-between text-[11.5px]">
                            <span className="font-mono text-faint">{g.source}</span>
                            <span className="font-semibold text-ink">{g.targets[l] || "—"}{g.dnt && <span className="ml-1 text-[9px] text-warn">DNT</span>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => fetchTM(l)} className="rounded border border-line px-2 py-0.5 text-[10.5px] font-semibold text-muted hover:bg-line2">TM</button>
                      <button onClick={() => setIssueDraft({ lang: l, severity: "major", comment: "" })} className="rounded border border-line px-2 py-0.5 text-[10.5px] font-semibold text-muted hover:bg-line2">+ 이슈</button>
                    </div>
                    {tm[l]?.map((m, i) => (
                      <button key={i} onClick={() => { patchCell(drawerSeg.id, l, { text: m.target, status: "translated" }); persistCell(drawerSeg.id, l, { text: m.target, status: "translated" }); }}
                        className="mt-1 flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11.5px] hover:bg-line2">
                        <span className="tnums shrink-0 rounded bg-ok-soft px-1 text-[10px] font-bold text-ok">{m.score}%</span>
                        <span className="truncate">{m.target}</span>
                      </button>
                    ))}
                    {issueDraft?.lang === l && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <select value={issueDraft.severity} onChange={(e) => setIssueDraft({ ...issueDraft, severity: e.target.value })} className="rounded border border-line bg-panel px-1.5 py-1 text-[11px]">
                          <option value="critical">critical</option><option value="major">major</option><option value="minor">minor</option>
                        </select>
                        <input value={issueDraft.comment} onChange={(e) => setIssueDraft({ ...issueDraft, comment: e.target.value })} placeholder="이슈" className="min-w-0 flex-1 rounded border border-line bg-panel px-1.5 py-1 text-[11.5px]" />
                        <button onClick={addIssue} className="rounded bg-indigo px-2 py-1 text-[11px] font-semibold text-white">등록</button>
                      </div>
                    )}
                    {issues.filter((i) => i.lang === l).map((i) => (
                      <div key={i.id} className={`mt-1 flex items-center gap-1.5 text-[11px] ${i.status === "resolved" ? "opacity-50" : ""}`}>
                        <span className={`rounded px-1 text-[9px] font-bold ${i.severity === "critical" ? "bg-bad-soft text-bad" : i.severity === "major" ? "bg-warn-soft text-warn" : "bg-line2 text-muted"}`}>{i.severity}</span>
                        <span className="min-w-0 flex-1 truncate">{i.comment}</span>
                        <button onClick={() => resolveIssue(i.id)} className="shrink-0 font-semibold text-indigo">{i.status === "open" ? "해결" : "재오픈"}</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
