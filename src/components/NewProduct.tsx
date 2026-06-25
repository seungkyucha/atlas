"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProduct() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), genre: genre.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "생성 실패 (권한 필요: 매니저 이상)");
      return;
    }
    setOpen(false);
    setName("");
    setGenre("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep"
      >
        + 새 프로덕트
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="프로덕트명"
        className="rounded-lg border border-line bg-panel px-3 py-2 text-[13px]"
        autoFocus
      />
      <input
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        placeholder="장르"
        className="w-28 rounded-lg border border-line bg-panel px-3 py-2 text-[13px]"
      />
      <button onClick={create} disabled={busy} className="rounded-lg bg-indigo px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-deep disabled:opacity-50">
        {busy ? "…" : "생성"}
      </button>
      <button onClick={() => setOpen(false)} className="rounded-lg border border-line px-3 py-2 text-[13px] text-muted hover:bg-line2">
        취소
      </button>
      {err && <span className="text-[12px] text-bad">{err}</span>}
    </div>
  );
}
