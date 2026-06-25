"use client";

import { useState } from "react";
import { Speaker } from "@/lib/types";
import { langLabel } from "@/lib/config";

export function SpeakersEditor({
  productId,
  speakers,
  targetLangs,
}: {
  productId: string;
  speakers: Speaker[];
  targetLangs: string[];
}) {
  const [list, setList] = useState<Speaker[]>(speakers);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  async function addSpeaker() {
    if (!newName.trim()) return;
    const res = await fetch("/api/speakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, name: newName.trim(), role: newRole.trim() }),
    });
    if (res.ok) {
      const s = await res.json();
      setList((p) => [...p, { ...s, tones: {} }]);
      setNewName("");
      setNewRole("");
    }
  }

  async function deleteSpeaker(id: string) {
    if (!confirm("이 화자를 삭제할까요?")) return;
    setList((p) => p.filter((s) => s.id !== id));
    await fetch(`/api/speakers/${id}`, { method: "DELETE" });
  }

  function setTone(id: string, lang: string, field: "tone" | "register", value: string) {
    setList((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const cur = s.tones[lang] ?? { tone: "", register: "" };
        return { ...s, tones: { ...s.tones, [lang]: { ...cur, [field]: value } } };
      })
    );
  }

  function persistTone(id: string, lang: string, tone: { tone: string; register: string }) {
    fetch(`/api/speakers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tones: { [lang]: tone } }),
    }).catch(() => {});
  }

  return (
    <>
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3 shadow-card">
      <span className="text-[12px] font-semibold text-muted">화자 추가:</span>
      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름" className="rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px]" />
      <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="역할" className="rounded-lg border border-line bg-panel px-3 py-1.5 text-[13px]" />
      <button onClick={addSpeaker} className="rounded-lg bg-indigo px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-deep">추가</button>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {list.map((s) => (
        <div key={s.id} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-bold tracking-tight">{s.name}</div>
              <div className="text-[13px] text-muted">{s.role}</div>
            </div>
            <button
              onClick={() => deleteSpeaker(s.id)}
              className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-bad-soft"
            >
              삭제
            </button>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">{s.persona}</p>

          <div className="mt-4 space-y-2.5">
            {targetLangs.map((l) => {
              const t = s.tones[l] ?? { tone: "", register: "" };
              return (
                <div key={l} className="rounded-lg border border-line2 bg-panel2 p-2.5">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">
                    {langLabel(l)}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={t.tone}
                      onChange={(e) => setTone(s.id, l, "tone", e.target.value)}
                      onBlur={() => persistTone(s.id, l, s.tones[l] ?? { tone: "", register: "" })}
                      placeholder="어투 (예: 반말 · 단호)"
                      className="flex-1 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[13px] focus:border-indigo focus:outline-none"
                    />
                    <input
                      value={t.register}
                      onChange={(e) => setTone(s.id, l, "register", e.target.value)}
                      onBlur={() => persistTone(s.id, l, s.tones[l] ?? { tone: "", register: "" })}
                      placeholder="등급"
                      className="w-24 rounded-md border border-line bg-panel px-2.5 py-1.5 text-[13px] focus:border-indigo focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
