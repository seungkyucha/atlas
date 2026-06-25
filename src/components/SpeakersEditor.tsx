"use client";

import { useState } from "react";
import { Speaker } from "@/lib/types";
import { langLabel } from "@/lib/config";

export function SpeakersEditor({
  speakers,
  targetLangs,
}: {
  speakers: Speaker[];
  targetLangs: string[];
}) {
  const [list, setList] = useState<Speaker[]>(speakers);

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
    <div className="grid gap-4 lg:grid-cols-2">
      {list.map((s) => (
        <div key={s.id} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
          <div className="text-[16px] font-bold tracking-tight">{s.name}</div>
          <div className="text-[13px] text-muted">{s.role}</div>
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
  );
}
