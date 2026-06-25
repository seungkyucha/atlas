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
} from "@/lib/types";
import { langLabel, modelLabel, engineMap } from "@/lib/config";
import { StatusBadge, STATUS_META } from "@/components/Status";

const dotColor: Record<SegmentStatus, string> = {
  untranslated: "bg-line",
  ai_draft: "bg-indigo",
  translating: "bg-indigo",
  translated: "bg-ok",
  in_review: "bg-warn",
  rejected: "bg-bad",
  approved: "bg-ok",
};

interface QACheck {
  label: string;
  ok: boolean;
  detail: string;
}

function runQA(
  text: string,
  speaker: Speaker | undefined,
  lang: string,
  charLimit?: number
): QACheck[] {
  const checks: QACheck[] = [];
  const t = text.trim();
  checks.push({ label: "번역 존재", ok: t.length > 0, detail: t.length > 0 ? "작성됨" : "미작성" });

  if (charLimit) {
    const len = [...t].length;
    checks.push({ label: "길이", ok: len <= charLimit, detail: `${len}/${charLimit}자` });
  }

  const reg = speaker?.tones[lang]?.register;
  if (reg && t.length > 0 && (reg === "반말" || reg === "존댓말")) {
    const endsPolite = /(요|니다|세요|십시오)[.!?…」"']*$/.test(t);
    let ok = true;
    let detail = `${reg} 어울림`;
    if (reg === "반말" && endsPolite) {
      ok = false;
      detail = "반말인데 존대 어미";
    } else if (reg === "존댓말" && !endsPolite) {
      ok = false;
      detail = "존댓말 종결어미 확인";
    }
    checks.push({ label: "어투", ok, detail });
  }
  return checks;
}

export function Workspace({
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
  const speakerById = useMemo(
    () => Object.fromEntries(speakers.map((s) => [s.id, s])),
    [speakers]
  );

  const [segments, setSegments] = useState<Segment[]>(project.segments);
  const [selectedId, setSelectedId] = useState(segments[0].id);
  const [activeLangs, setActiveLangs] = useState<string[]>(product.targetLangs);
  const [loading, setLoading] = useState(false);
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "todo">("all");

  interface Issue { id: string; lang: string; severity: string; category: string; comment: string; status: string; createdBy?: string | null }
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tm, setTm] = useState<Record<string, { source: string; target: string; score: number }[]>>({});
  const [issueDraft, setIssueDraft] = useState<{ lang: string; severity: string; comment: string } | null>(null);

  const selected = segments.find((s) => s.id === selectedId)!;

  useEffect(() => {
    setTm({});
    setIssueDraft(null);
    fetch(`/api/lqa?segmentId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setIssues(d.issues ?? []))
      .catch(() => setIssues([]));
  }, [selectedId]);

  async function fetchTM(lang: string) {
    const u = new URL("/api/tm", window.location.origin);
    u.searchParams.set("productId", product.id);
    u.searchParams.set("source", selected.source);
    u.searchParams.set("lang", lang);
    u.searchParams.set("excludeId", selected.id);
    const d = await fetch(u.toString()).then((r) => r.json());
    setTm((prev) => ({ ...prev, [lang]: d.matches ?? [] }));
  }

  async function addIssue() {
    if (!issueDraft || !issueDraft.comment.trim()) return;
    const res = await fetch("/api/lqa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        segmentId: selected.id,
        lang: issueDraft.lang,
        severity: issueDraft.severity,
        comment: issueDraft.comment,
      }),
    });
    if (res.ok) {
      const issue = await res.json();
      setIssues((p) => [issue, ...p]);
      setIssueDraft(null);
    }
  }

  async function resolveIssue(id: string) {
    const cur = issues.find((i) => i.id === id);
    const next = cur?.status === "open" ? "resolved" : "open";
    setIssues((p) => p.map((i) => (i.id === id ? { ...i, status: next } : i)));
    await fetch(`/api/lqa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function addSegment() {
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, source: "새 원문 (수정하세요)", scene: selected?.scene ?? "" }),
    });
    if (res.ok) {
      const seg = await res.json();
      setSegments((p) => [...p, { ...seg, translations: seg.translations ?? {} }]);
      setSelectedId(seg.id);
    }
  }

  async function deleteSegment(id: string) {
    if (!confirm("이 세그먼트를 삭제할까요?")) return;
    const rest = segments.filter((s) => s.id !== id);
    setSegments(rest);
    if (selectedId === id && rest[0]) setSelectedId(rest[0].id);
    await fetch(`/api/segments/${id}`, { method: "DELETE" });
  }
  const speaker = selected.speakerId ? speakerById[selected.speakerId] : undefined;
  const context = selected.contextId
    ? contexts.find((c) => c.id === selected.contextId)
    : undefined;

  const matched = useMemo(
    () =>
      glossary.filter((g) =>
        new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(selected.source.toLowerCase())
      ),
    [glossary, selected.source]
  );

  const filtered = segments.filter((s) => {
    if (filter === "todo")
      return product.targetLangs.some((l) => {
        const st = s.translations[l]?.status ?? "untranslated";
        return st === "untranslated" || st === "rejected";
      });
    return true;
  });

  function patchLocal(segId: string, lang: string, patch: Partial<{ text: string; status: SegmentStatus }>) {
    setSegments((prev) =>
      prev.map((s) => {
        if (s.id !== segId) return s;
        const cur = s.translations[lang] ?? { text: "", status: "untranslated" as SegmentStatus };
        return { ...s, translations: { ...s.translations, [lang]: { ...cur, ...patch } } };
      })
    );
  }

  function persist(segId: string, lang: string, patch: Partial<{ text: string; status: SegmentStatus }>) {
    fetch(`/api/segments/${segId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, ...patch }),
    }).catch(() => {});
  }

  function setText(lang: string, text: string) {
    patchLocal(selected.id, lang, { text });
  }
  function commitText(lang: string) {
    persist(selected.id, lang, { text: selected.translations[lang]?.text ?? "" });
  }
  function setStatus(lang: string, status: SegmentStatus) {
    patchLocal(selected.id, lang, { status });
    persist(selected.id, lang, { status });
  }

  function toggleLang(code: string) {
    setActiveLangs((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code]
    );
  }

  async function aiTranslateAll() {
    setLoading(true);
    setDemoNote(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          segmentId: selected.id,
          targetLangs: activeLangs,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      let demo = false;
      for (const lang of Object.keys(data.results)) {
        const r = data.results[lang];
        if (r.demo) demo = true;
        patchLocal(selected.id, lang, { text: r.translation, status: "ai_draft" });
        persist(selected.id, lang, { text: r.translation, status: "ai_draft" });
      }
      if (demo)
        setDemoNote(
          `데모 모드 — ${engineMap[product.engine].label} 키(${engineMap[product.engine].envKey}) 설정 시 실제 번역`
        );
    } catch (e) {
      setDemoNote(e instanceof Error ? e.message : "번역 실패");
    } finally {
      setLoading(false);
    }
  }

  const approvedCount = segments.reduce(
    (n, s) => n + product.targetLangs.filter((l) => s.translations[l]?.status === "approved").length,
    0
  );
  const totalCells = segments.length * product.targetLangs.length;

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
              <Link href="/" className="hover:text-ink">대시보드</Link> / {product.name}
            </div>
            <h1 className="truncate text-[18px] font-bold tracking-tight">{project.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-indigo-soft px-2 py-1 font-mono text-[11px] font-semibold text-indigo-deep">
              {engineMap[product.engine].label} · {modelLabel(product.engine, product.model)}
            </span>
            <div className="tnums hidden text-[12px] text-muted md:block">
              승인 {approvedCount}/{totalCells}
            </div>
          </div>
        </div>
        {/* language toggles */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
            원어 {langLabel(product.sourceLang)} →
          </span>
          {product.targetLangs.map((code) => {
            const on = activeLangs.includes(code);
            return (
              <button
                key={code}
                onClick={() => toggleLang(code)}
                className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition-colors ${
                  on
                    ? "border-indigo bg-indigo-soft text-indigo-deep"
                    : "border-line text-faint hover:bg-line2"
                }`}
              >
                {langLabel(code)}
              </button>
            );
          })}
          <Link
            href={`/products/${product.id}`}
            className="ml-1 text-[12px] font-medium text-muted underline-offset-2 hover:text-indigo hover:underline"
          >
            언어 관리
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[19rem_1fr_18rem]">
        {/* Segment list */}
        <div className="border-r border-line bg-panel2">
          <div className="flex items-center gap-1 border-b border-line px-3 py-2.5">
            {(["all", "todo"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  filter === f ? "bg-indigo-soft text-indigo-deep" : "text-muted hover:bg-line2"
                }`}
              >
                {f === "all" ? "전체" : "미완료"}
              </button>
            ))}
            <button
              onClick={addSegment}
              title="세그먼트 추가"
              className="ml-auto rounded-md border border-line px-2 py-0.5 text-[12px] font-semibold text-muted hover:bg-line2"
            >
              + 추가
            </button>
            <span className="tnums font-mono text-[11px] text-faint">{filtered.length}</span>
          </div>
          <div className="max-h-[calc(100vh-9.5rem)] overflow-y-auto p-2">
            {filtered.map((s) => {
              const sp = s.speakerId ? speakerById[s.speakerId] : undefined;
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`mb-1.5 w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                    active ? "border-indigo bg-panel shadow-focus" : "border-line bg-panel hover:border-faint"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-bold uppercase tracking-wide text-muted">
                      {sp ? sp.name : "내레이션"}
                    </span>
                    <span className="font-mono text-[10px] text-faint">{s.key}</span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[11.5px] text-faint">{s.source}</div>
                  <div className="mt-1.5 flex gap-1">
                    {product.targetLangs.map((l) => (
                      <span
                        key={l}
                        title={langLabel(l)}
                        className={`h-1.5 w-4 rounded-full ${dotColor[s.translations[l]?.status ?? "untranslated"]}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="min-w-0 px-7 py-6">
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-faint">
            <span>{selected.key}</span><span>·</span><span className="truncate">{selected.scene}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold tracking-tight">
              {speaker ? `${speaker.name} · ${speaker.role}` : "내레이션"}
            </h2>
            <button
              onClick={() => deleteSegment(selected.id)}
              className="rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-bad hover:bg-bad-soft"
            >
              세그먼트 삭제
            </button>
          </div>

          <div className="mt-4 text-[10px] font-bold uppercase tracking-wide text-faint">
            원문 — {langLabel(product.sourceLang)}
          </div>
          <div className="mt-1.5 rounded-lg bg-line2 px-4 py-3 font-mono text-[13.5px] text-muted">
            {selected.source}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-muted">
              {activeLangs.length}개 언어 동시 번역
            </span>
            <button
              onClick={aiTranslateAll}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span>✦</span>
              )}
              {loading ? "번역 중…" : "AI 일괄 번역"}
            </button>
          </div>
          {demoNote && (
            <div className="mt-2 rounded-md bg-warn-soft px-3 py-1.5 text-[12px] text-warn">{demoNote}</div>
          )}

          {/* per-language editors */}
          <div className="mt-3 space-y-4">
            {activeLangs.map((lang) => {
              const t = selected.translations[lang] ?? { text: "", status: "untranslated" as SegmentStatus };
              const limit = selected.charLimits?.[lang];
              const checks = runQA(t.text, speaker, lang, limit);
              return (
                <div key={lang} className="rounded-xl border border-line bg-panel p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">{langLabel(lang)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <textarea
                    value={t.text}
                    onChange={(e) => setText(lang, e.target.value)}
                    onBlur={() => commitText(lang)}
                    placeholder="번역 입력 또는 AI 일괄 번역 실행…"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-lg border-2 border-line bg-panel px-3 py-2 text-[14.5px] leading-relaxed text-ink outline-none focus:border-indigo placeholder:text-faint"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(["translating", "translated", "in_review", "approved", "rejected"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(lang, st)}
                        className={`rounded-md border px-2 py-1 text-[11.5px] font-semibold transition-colors ${
                          t.status === st
                            ? "border-indigo bg-indigo-soft text-indigo-deep"
                            : "border-line text-muted hover:bg-line2"
                        }`}
                      >
                        {STATUS_META[st].label}
                      </button>
                    ))}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {checks.map((c) => (
                        <span
                          key={c.label}
                          className={`flex items-center gap-1 text-[11px] ${c.ok ? "text-ok" : "text-bad"}`}
                          title={c.detail}
                        >
                          <span className={`grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] font-bold text-white ${c.ok ? "bg-ok" : "bg-bad"}`}>
                            {c.ok ? "✓" : "!"}
                          </span>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* TM + LQA controls */}
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => fetchTM(lang)} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:bg-line2">
                      TM 검색
                    </button>
                    <button onClick={() => setIssueDraft({ lang, severity: "major", comment: "" })} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:bg-line2">
                      + LQA 이슈
                    </button>
                    {issues.filter((i) => i.lang === lang && i.status === "open").length > 0 && (
                      <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[10px] font-bold text-bad">
                        이슈 {issues.filter((i) => i.lang === lang && i.status === "open").length}
                      </span>
                    )}
                  </div>
                  {tm[lang] && tm[lang].length > 0 && (
                    <div className="mt-2 rounded-lg border border-line2 bg-panel2 p-2">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-faint">번역 메모리</div>
                      {tm[lang].map((m, i) => (
                        <button
                          key={i}
                          onClick={() => { setText(lang, m.target); commitText(lang); }}
                          className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] hover:bg-line2"
                        >
                          <span className="tnums shrink-0 rounded bg-ok-soft px-1.5 text-[10px] font-bold text-ok">{m.score}%</span>
                          <span className="truncate text-ink">{m.target}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {issueDraft?.lang === lang && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line2 bg-panel2 p-2">
                      <select
                        value={issueDraft.severity}
                        onChange={(e) => setIssueDraft({ ...issueDraft, severity: e.target.value })}
                        className="rounded border border-line bg-panel px-2 py-1 text-[12px]"
                      >
                        <option value="critical">critical</option>
                        <option value="major">major</option>
                        <option value="minor">minor</option>
                      </select>
                      <input
                        value={issueDraft.comment}
                        onChange={(e) => setIssueDraft({ ...issueDraft, comment: e.target.value })}
                        placeholder="이슈 내용"
                        className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1 text-[12.5px]"
                      />
                      <button onClick={addIssue} className="rounded bg-indigo px-2.5 py-1 text-[12px] font-semibold text-white">등록</button>
                      <button onClick={() => setIssueDraft(null)} className="rounded px-2 py-1 text-[12px] text-muted">취소</button>
                    </div>
                  )}
                  {issues.filter((i) => i.lang === lang).map((i) => (
                    <div key={i.id} className={`mt-1.5 flex items-center gap-2 rounded-lg border border-line2 px-2 py-1.5 text-[12px] ${i.status === "resolved" ? "opacity-50" : ""}`}>
                      <span className={`rounded-full px-1.5 text-[10px] font-bold ${i.severity === "critical" ? "bg-bad-soft text-bad" : i.severity === "major" ? "bg-warn-soft text-warn" : "bg-line2 text-muted"}`}>{i.severity}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{i.comment}</span>
                      <button onClick={() => resolveIssue(i.id)} className="shrink-0 text-[11px] font-semibold text-indigo">
                        {i.status === "open" ? "해결" : "재오픈"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Context panel */}
        <div className="border-l border-line bg-panel2 px-4 py-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-faint">컨텍스트</div>

          <div className="mt-3 rounded-xl border border-line bg-panel p-3.5">
            <div className="text-[14px] font-bold">{speaker ? speaker.name : "내레이션"}</div>
            <div className="mt-0.5 text-[12px] text-muted">{speaker ? speaker.persona : "3인칭 서술 · 문어체"}</div>
            {speaker && (
              <div className="mt-2 space-y-1">
                {activeLangs.map((l) => (
                  <div key={l} className="flex items-center justify-between text-[11.5px]">
                    <span className="text-faint">{langLabel(l)}</span>
                    <span className="font-semibold text-indigo-deep">
                      {speaker.tones[l]?.tone ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 text-[10px] font-bold uppercase tracking-wide text-faint">적용 용어</div>
          <div className="mt-2 space-y-2">
            {matched.length === 0 && <div className="text-[12.5px] text-faint">매칭 용어 없음</div>}
            {matched.map((g) => (
              <div key={g.id} className="rounded-lg border border-line2 bg-panel p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-ink">{g.source}</span>
                  {g.dnt && <span className="text-[10px] font-bold text-warn">DNT</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {activeLangs.map((l) => (
                    <div key={l} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-faint">{langLabel(l)}</span>
                      <span className="text-ink">{g.targets[l] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {context && (
            <>
              <div className="mt-5 text-[10px] font-bold uppercase tracking-wide text-faint">맥락</div>
              <div className="mt-2 rounded-lg border border-line2 bg-panel p-2.5 text-[12px] text-muted">
                <div className="font-semibold text-ink">{context.scene}</div>
                <p className="mt-1">{context.note}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
