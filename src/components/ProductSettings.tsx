"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { LANGUAGES, ENGINES, engineMap, EngineId, langName } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";

export function ProductSettings({ product }: { product: Product }) {
  const [sourceLang, setSourceLang] = useState(product.sourceLang);
  const [targetLangs, setTargetLangs] = useState<string[]>(product.targetLangs);
  const [engine, setEngine] = useState<EngineId>(product.engine);
  const [model, setModel] = useState(product.model);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const available = LANGUAGES.filter(
    (l) => l.code !== sourceLang && !targetLangs.includes(l.code)
  );

  function addLang(code: string) {
    if (code && !targetLangs.includes(code)) setTargetLangs((p) => [...p, code]);
  }
  function removeLang(code: string) {
    setTargetLangs((p) => p.filter((c) => c !== code));
  }
  function changeEngine(e: EngineId) {
    setEngine(e);
    if (!engineMap[e].models.some((m) => m.id === model)) {
      setModel(engineMap[e].models[0].id);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLang, targetLangs, engine, model }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        crumb={`${product.studio} · 프로덕트`}
        title={product.name}
        subtitle="원어 · 지원 언어 · 번역 엔진/모델"
        right={
          <div className="flex items-center gap-2">
            {saved && <span className="text-[12.5px] font-semibold text-ok">저장됨 ✓</span>}
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-indigo px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep disabled:opacity-60"
            >
              {saving ? "저장 중…" : "변경 저장"}
            </button>
          </div>
        }
      />
      <main className="max-w-3xl px-8 py-6">
        {/* source language */}
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="text-[14px] font-bold">원어 (Source)</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">번역의 출발 언어입니다.</p>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-line bg-panel px-3 py-2 text-[14px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.native})
              </option>
            ))}
          </select>
        </section>

        {/* target languages */}
        <section className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="text-[14px] font-bold">지원 언어 (Targets)</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">
            동시에 번역·관리할 언어들. 화자·용어집·맥락·LQA 전반에 적용됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {targetLangs.map((code) => (
              <span
                key={code}
                className="flex items-center gap-1.5 rounded-full border border-indigo bg-indigo-soft px-3 py-1 text-[13px] font-semibold text-indigo-deep"
              >
                {langName(code)}
                <button
                  onClick={() => removeLang(code)}
                  className="grid h-4 w-4 place-items-center rounded-full text-indigo-deep/70 hover:bg-indigo/20"
                  aria-label={`${langName(code)} 제거`}
                >
                  ×
                </button>
              </span>
            ))}
            {targetLangs.length === 0 && (
              <span className="text-[13px] text-faint">지원 언어를 추가하세요</span>
            )}
          </div>
          {available.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  addLang(e.target.value);
                  e.target.value = "";
                }}
                className="rounded-lg border border-line bg-panel px-3 py-2 text-[13.5px]"
              >
                <option value="" disabled>
                  + 언어 추가
                </option>
                {available.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.native})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* engine / model */}
        <section className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="text-[14px] font-bold">번역 엔진 · 모델</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">
            이 프로덕트의 모든 번역에 사용할 AI를 선택합니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {ENGINES.map((e) => (
              <button
                key={e.id}
                onClick={() => changeEngine(e.id)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  engine === e.id ? "border-indigo bg-indigo-soft" : "border-line hover:bg-line2"
                }`}
              >
                <div className="text-[14px] font-bold">{e.label}</div>
                <div className="text-[11.5px] text-muted">{e.vendor}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-[12px] font-semibold text-muted">모델</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 block w-full max-w-sm rounded-lg border border-line bg-panel px-3 py-2 text-[14px]"
            >
              {engineMap[engine].models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[12px] text-faint">
              API 키(<span className="font-mono">{engineMap[engine].envKey}</span>) 미설정 시 데모 번역으로 동작합니다.
            </p>
          </div>
        </section>

        <div className="mt-6">
          <Link href="/products" className="text-[13px] text-muted hover:text-indigo">
            ← 프로덕트 목록
          </Link>
        </div>
      </main>
    </>
  );
}
