"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { LANGUAGES, ENGINES, engineMap, EngineId, langName } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";

interface ProjectRow {
  id: string;
  name: string;
  segments: number;
}

export function ProductSettings({
  product,
  projects: initialProjects,
}: {
  product: Product;
  projects: ProjectRow[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [newProject, setNewProject] = useState("");
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

  async function addProject() {
    if (!newProject.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, name: newProject.trim() }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => [...prev, { id: p.id, name: p.name, segments: 0 }]);
      setNewProject("");
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("이 프로젝트와 모든 세그먼트를 삭제할까요?")) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  }

  async function deleteProduct() {
    if (!confirm(`프로덕트 "${product.name}"와 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) router.push("/products");
    else alert("삭제 권한이 없습니다 (관리자 이상 필요).");
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

        {/* projects */}
        <section className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="text-[14px] font-bold">프로젝트</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">번역 세그먼트 묶음. CSV/XLSX로 내보낼 수 있습니다.</p>
          <div className="space-y-2">
            {projects.map((pr) => (
              <div key={pr.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line2 bg-panel2 px-3 py-2">
                <Link href={`/workspace/${pr.id}`} className="font-semibold hover:text-indigo">{pr.name}</Link>
                <span className="tnums text-[12px] text-faint">{pr.segments} 세그먼트</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <a href={`/api/projects/${pr.id}/export?format=csv`} className="rounded-md border border-line px-2 py-1 text-[11.5px] font-semibold text-muted hover:bg-line2">CSV</a>
                  <a href={`/api/projects/${pr.id}/export?format=xlsx`} className="rounded-md border border-line px-2 py-1 text-[11.5px] font-semibold text-muted hover:bg-line2">XLSX</a>
                  <button onClick={() => deleteProject(pr.id)} className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-bad-soft">삭제</button>
                </div>
              </div>
            ))}
            {projects.length === 0 && <div className="text-[13px] text-faint">프로젝트가 없습니다.</div>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProject()}
              placeholder="새 프로젝트 이름"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-[13px]"
            />
            <button onClick={addProject} className="rounded-lg bg-indigo px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep">프로젝트 추가</button>
          </div>
        </section>

        {/* danger zone */}
        <section className="mt-5 rounded-2xl border border-bad/30 bg-bad-soft/40 p-5">
          <h2 className="text-[14px] font-bold text-bad">위험 구역</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">프로덕트 삭제 시 프로젝트·세그먼트·용어집·화자·맥락이 모두 삭제됩니다.</p>
          <button onClick={deleteProduct} className="rounded-lg border border-bad px-3.5 py-2 text-[13px] font-semibold text-bad hover:bg-bad-soft">
            프로덕트 삭제
          </button>
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
