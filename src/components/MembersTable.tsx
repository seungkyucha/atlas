"use client";

import { useState } from "react";
import { ROLE_LABEL, ROLE_RANK } from "@/lib/roles";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  lastLogin: string;
}

const roles = Object.keys(ROLE_RANK).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);

export function MembersTable({
  members,
  canEdit,
  meId,
}: {
  members: Member[];
  canEdit: boolean;
  meId?: string;
}) {
  const [list, setList] = useState(members);

  async function setRole(id: string, role: string) {
    setList((p) => p.map((m) => (m.id === id ? { ...m, role } : m)));
    await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
      <table className="w-full text-[13.5px]">
        <thead className="bg-panel2 text-[11px] uppercase tracking-wide text-faint">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">멤버</th>
            <th className="px-4 py-3 text-left font-semibold">이메일</th>
            <th className="px-4 py-3 text-left font-semibold">역할</th>
            <th className="px-4 py-3 text-left font-semibold">최근 로그인</th>
          </tr>
        </thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id} className="border-t border-line2">
              <td className="px-4 py-3 font-semibold">
                {m.name ?? "—"}
                {m.id === meId && <span className="ml-1.5 text-[11px] text-indigo">(나)</span>}
              </td>
              <td className="px-4 py-3 font-mono text-[12.5px] text-muted">{m.email}</td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={(e) => setRole(m.id, e.target.value)}
                    className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[13px]"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]} ({r})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-[12px] font-semibold text-indigo-deep">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-[12.5px] text-faint">
                {new Date(m.lastLogin).toLocaleString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
