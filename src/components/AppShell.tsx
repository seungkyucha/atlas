"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const nav = [
  { href: "/", label: "대시보드", icon: "▦" },
  { href: "/workspace/ember-main", label: "번역 워크스페이스", icon: "✎" },
  { href: "/glossary", label: "용어집", icon: "▤" },
  { href: "/speakers", label: "화자 · 어투", icon: "◑" },
  { href: "/context", label: "내러티브 맥락", icon: "❏" },
  { href: "/products", label: "프로덕트 설정", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Login page renders without the app chrome.
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-line bg-panel">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo text-[15px] font-extrabold text-white">
            A
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">ATLAS</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
              Localization
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {nav.map((item) => {
            const base = item.href === "/" ? "/" : "/" + item.href.split("/")[1];
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(base);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-indigo-soft text-indigo-deep"
                    : "text-muted hover:bg-line2 hover:text-ink"
                }`}
              >
                <span className="w-4 text-center text-[13px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-4">
          {session?.user ? (
            <div className="rounded-xl border border-line bg-panel2 px-3.5 py-3">
              <div className="truncate text-[13px] font-semibold text-ink">
                {session.user.name ?? "사용자"}
              </div>
              <div className="truncate text-[11.5px] text-muted">
                {session.user.email}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-line2 hover:text-ink"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-panel2 px-3.5 py-3 text-[12px] text-muted">
              Superawesome Studio
            </div>
          )}
        </div>
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
