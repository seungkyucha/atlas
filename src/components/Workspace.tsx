"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Project, Segment, GlossaryTerm } from "@/lib/types";
import { speakers, approvedGlossary } from "@/lib/data";
import { StatusBadge, STATUS_META } from "@/components/Status";

const speakerById = Object.fromEntries(speakers.map((s) => [s.id, s]));

function matchedTerms(source: string): GlossaryTerm[] {
  const lower = source.toLowerCase();
  return approvedGlossary.filter((g) =>
    new RegExp(`\\b${g.source.toLowerCase()}\\b`).test(lower)
  );
}

interface QACheck {
  label: string;
  ok: boolean;
  detail: string;
}

function runQA(seg: Segment, terms: GlossaryTerm[]): QACheck[] {
  const checks: QACheck[] = [];
  const target = seg.target.trim();

  // 1. not empty
  checks.push({
    label: "번역 존재",
    ok: target.length > 0,
    detail: target.length > 0 ? "작성됨" : "미작성",
  });

  // 2. glossary adherence
  const missing = terms.filter((g) => !g.dnt && !seg.target.includes(g.target));
  checks.push({
    label: "용어 준수",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${terms.length}건 일치`
        : `누락: ${missing.map((m) => m.target).join(", ")}`,
  });

  // 3. length limit
  if (seg.charLimit) {
    const len = [...target].length;
    checks.push({
      label: "길이 제한",
      ok: len <= seg.charLimit,
      detail: `${len} / ${seg.charLimit}자`,
    });
  }

  // 4. register heuristic (반말 should not end with 요/습니다)
  const sp = seg.speakerId ? speakerById[seg.speakerId] : undefined;
  if (sp && target.length > 0) {
    const endsPolite = /(요|니다|세요|십시오)[.!?…」"']*$/.test(target);
    let ok = true;
    let detail = `${sp.register} 어울림`;
    if (sp.register === "반말" && endsPolite) {
      ok = false;
      detail = "반말 화자인데 존대 어미 사용";
    } else if (sp.register === "존댓말" && !endsPolite) {
      ok = false;
      detail = "존댓말 화자인데 종결어미 확인 필요";
    }
    checks.push({ label: "어투 일치", ok, detail });
  }

  return checks;
}

export function Workspace({ project }: { project: Project }) {
  const [segments, setSegments] = useState<Segment[]>(project.segments);
  const [selectedId, setSelectedId] = useState(
    project.segments.find((s) => s.status !== "approved")?.id ??
      project.segments[0].id
  );
  const [loading, setLoading] = useState(false);
  const [alt, setAlt] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "review">("all");

  const selected = segments.find((s) => s.id === selectedId)!;
  const speaker = selected.speakerId ? speakerById[selected.speakerId] : undefined;
  const terms = useMemo(() => matchedTerms(selected.source), [selected.source]);
  const qa = useMemo(() => runQA(selected, terms), [selected, terms]);

  const filtered = segments.filter((s) => {
    if (filter === "todo")
      return s.status === "untranslated" || s.status === "rejected";
    if (filter === "review") return s.status === "in_review";
    return true;
  });

  function update(id: string, patch: Partial<Segment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function aiTranslate() {
    setLoading(true);
    setAlt(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: selected.source,
          sourceLang: project.sourceLang,
          targetLang: project.targetLang,
          scene: selected.scene,
          speaker: speaker
            ? {
                name: speaker.name,
                tone: speaker.tone,
                register: speaker.register,
                persona: speaker.persona,
              }
            : null,
          glossary: terms.map((g) => ({
            source: g.source,
            target: g.target,
            dnt: g.dnt,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDemo(!!data.demo);
      update(selected.id, { target: data.translation, status: "ai_draft" });
      if (data.alternative) setAlt(data.alternative);
    } catch (e) {
      update(selected.id, {
        target: `[오류] ${e instanceof Error ? e.message : "번역 실패"}`,
      });
    } finally {
      setLoading(false);
    }
  }

  const done = segments.filter((s) => s.status === "approved").length;

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-bg/85 px-6 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
            <Link href="/" className="hover:text-ink">
              대시보드
            </Link>{" "}
            / {project.sourceLang} → {project.targetLang}
          </div>
          <h1 className="truncate text-[18px] font-bold tracking-tight">
            {project.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="tnums hidden text-[12px] text-muted sm:block">
            승인 {done}/{segments.length}
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line2">
            <div
              className="h-full bg-ok"
              style={{ width: `${(done / segments.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* 3-column workspace */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[20rem_1fr_19rem]">
        {/* Segment list */}
        <div className="border-r border-line bg-panel2">
          <div className="flex items-center gap-1 border-b border-line px-3 py-2.5">
            {(["all", "todo", "review"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  filter === f
                    ? "bg-indigo-soft text-indigo-deep"
                    : "text-muted hover:bg-line2"
                }`}
              >
                {f === "all" ? "전체" : f === "todo" ? "할 일" : "감수"}
              </button>
            ))}
            <span className="tnums ml-auto font-mono text-[11px] text-faint">
              {filtered.length}
            </span>
          </div>
          <div className="max-h-[calc(100vh-7.5rem)] overflow-y-auto p-2">
            {filtered.map((s) => {
              const sp = s.speakerId ? speakerById[s.speakerId] : undefined;
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id);
                    setAlt(null);
                  }}
                  className={`mb-1.5 w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-indigo bg-panel shadow-focus"
                      : "border-line bg-panel hover:border-faint"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-bold uppercase tracking-wide text-muted">
                      {sp ? sp.name : "내레이션"}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 truncate font-mono text-[11.5px] text-faint">
                    {s.source}
                  </div>
                  <div className="truncate text-[13px] text-ink">
                    {s.target || "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="min-w-0 px-7 py-6">
          <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-faint">
            <span>{selected.key}</span>
            <span>·</span>
            <span className="truncate">{selected.scene}</span>
          </div>
          <h2 className="text-[17px] font-bold tracking-tight">
            {speaker ? `${speaker.name} · ${speaker.role}` : "내레이션"}
          </h2>

          <div className="mt-5 text-[10px] font-bold uppercase tracking-wide text-faint">
            원문 — {project.sourceLang}
          </div>
          <div className="mt-1.5 rounded-lg bg-line2 px-4 py-3 font-mono text-[13.5px] text-muted">
            {selected.source}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-faint">
              번역 — {project.targetLang}
            </span>
            <button
              onClick={aiTranslate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-indigo px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span>✦</span>
              )}
              {loading ? "번역 중…" : "AI 번역"}
            </button>
          </div>
          <textarea
            value={selected.target}
            onChange={(e) => update(selected.id, { target: e.target.value })}
            placeholder="여기에 번역을 입력하거나 AI 번역을 실행하세요…"
            rows={4}
            className="mt-1.5 w-full resize-none rounded-lg border-2 border-indigo bg-panel px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint"
          />

          {demo && (
            <div className="mt-2 rounded-md bg-warn-soft px-3 py-1.5 text-[12px] text-warn">
              데모 모드입니다 — <span className="font-mono">ANTHROPIC_API_KEY</span>{" "}
              설정 시 실제 Claude 번역이 적용됩니다.
            </div>
          )}
          {alt && (
            <div className="mt-2 rounded-md bg-indigo-soft px-3 py-2 text-[13px] text-indigo-deep">
              <span className="font-semibold">대안 ·</span> {alt}
            </div>
          )}

          {/* status actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-medium text-muted">상태:</span>
            {(["translating", "translated", "in_review", "approved", "rejected"] as const).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => update(selected.id, { status: st })}
                  className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    selected.status === st
                      ? "border-indigo bg-indigo-soft text-indigo-deep"
                      : "border-line text-muted hover:bg-line2"
                  }`}
                >
                  {STATUS_META[st].label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Context panel */}
        <div className="border-l border-line bg-panel2 px-4 py-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-faint">
            컨텍스트
          </div>

          {/* speaker */}
          <div className="mt-3 rounded-xl border border-line bg-panel p-3.5">
            <div className="text-[14px] font-bold">
              {speaker ? speaker.name : "내레이션"}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              {speaker ? speaker.persona : "3인칭 서술 · 문어체"}
            </div>
            <span className="mt-2 inline-block rounded-md bg-indigo-soft px-2 py-0.5 text-[11px] font-semibold text-indigo-deep">
              {speaker ? speaker.tone : "문어체 · 묘사"}
            </span>
          </div>

          {/* glossary */}
          <div className="mt-5 text-[10px] font-bold uppercase tracking-wide text-faint">
            적용 용어
          </div>
          <div className="mt-2 space-y-0.5">
            {terms.length === 0 && (
              <div className="text-[12.5px] text-faint">매칭 용어 없음</div>
            )}
            {terms.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between border-b border-line2 py-1.5 text-[12.5px]"
              >
                <span className="font-mono text-muted">{g.source}</span>
                <span className="font-semibold text-ink">
                  {g.target}
                  {g.dnt && (
                    <span className="ml-1 text-[10px] font-bold text-warn">DNT</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* QA */}
          <div className="mt-5 text-[10px] font-bold uppercase tracking-wide text-faint">
            자동 QA
          </div>
          <div className="mt-2 space-y-1.5">
            {qa.map((c) => (
              <div key={c.label} className="flex items-start gap-2 text-[12.5px]">
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                    c.ok ? "bg-ok" : "bg-bad"
                  }`}
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <span>
                  <span className="font-semibold text-ink">{c.label}</span>{" "}
                  <span className="text-muted">— {c.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
