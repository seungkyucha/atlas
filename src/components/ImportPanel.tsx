"use client";

import { useState } from "react";
import Link from "next/link";

interface P {
  id: string;
  name: string;
  sourceLang: string;
  targetLangs: string[];
}

export function ImportPanel({ products }: { products: P[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ projectId: string; created: number } | null>(null);
  const [analysis, setAnalysis] = useState<{ analyzed: number; speakersAssigned: number; termsAdded: number; demo: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId);

  async function doImport() {
    if (!file || !productId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productId", productId);
      fd.append("projectName", projectName || file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ projectId: data.projectId, created: data.created });
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setBusy(false);
    }
  }

  async function doAnalyze() {
    if (!result) return;
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: result.projectId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
        <h2 className="text-[14px] font-bold">1. 대상 프로덕트</h2>
        <p className="mb-3 mt-0.5 text-[12.5px] text-muted">가져온 번역은 이 프로덕트의 언어 설정을 따릅니다.</p>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-line bg-panel px-3 py-2 text-[14px]"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {product && (
          <p className="mt-2 text-[12px] text-faint">
            원어 {product.sourceLang} · 지원 {product.targetLangs.join(", ")}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
        <h2 className="text-[14px] font-bold">2. 파일 업로드</h2>
        <p className="mb-3 mt-0.5 text-[12.5px] text-muted">
          CSV 또는 XLSX. 헤더에 <span className="font-mono">source</span> 컬럼 필수. 선택 컬럼:{" "}
          <span className="font-mono">key, speaker, scene</span>, 언어코드(예 <span className="font-mono">ko, ja</span>).
        </p>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="새 프로젝트 이름 (비우면 파일명)"
          className="mb-3 w-full max-w-sm rounded-lg border border-line bg-panel px-3 py-2 text-[14px]"
        />
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[13px]"
          />
          <button
            onClick={doImport}
            disabled={busy || !file}
            className="rounded-lg bg-indigo px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep disabled:opacity-50"
          >
            {busy ? "처리 중…" : "가져오기"}
          </button>
        </div>
        {error && <div className="mt-3 rounded-md bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{error}</div>}
        {result && (
          <div className="mt-3 rounded-md bg-ok-soft px-3 py-2 text-[12.5px] text-ok">
            {result.created}개 세그먼트를 가져왔습니다.
          </div>
        )}
      </section>

      {result && (
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <h2 className="text-[14px] font-bold">3. AI 자동 분석 (화자 · 용어)</h2>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted">
            화자 미지정 세그먼트의 화자를 추정하고, 후보 용어를 용어집에 제안으로 추가합니다.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={doAnalyze}
              disabled={busy}
              className="rounded-lg bg-indigo px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep disabled:opacity-50"
            >
              {busy ? "분석 중…" : "✦ AI 자동 분석 실행"}
            </button>
            <Link href={`/workspace/${result.projectId}`} className="text-[13px] font-semibold text-indigo hover:underline">
              워크스페이스 열기 →
            </Link>
          </div>
          {analysis && (
            <div className="mt-3 rounded-md bg-indigo-soft px-3 py-2 text-[12.5px] text-indigo-deep">
              {analysis.analyzed}개 분석 · 화자 {analysis.speakersAssigned}건 지정 · 용어 {analysis.termsAdded}건 추가
              {analysis.demo && " (데모 모드 — 엔진 키 설정 시 실제 분석)"}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
