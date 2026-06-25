"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const globalNav: NavItem[] = [
  { href: "/", label: "대시보드", icon: "▦", exact: true },
  { href: "/products", label: "프로덕트", icon: "▣" },
  { href: "/members", label: "멤버 · 권한", icon: "◍" },
];

const productNav = (id: string): NavItem[] => [
  { href: `/products/${id}`, label: "개요", icon: "▦", exact: true },
  { href: `/products/${id}/glossary`, label: "용어집", icon: "▤" },
  { href: `/products/${id}/speakers`, label: "화자 · 어투", icon: "◑" },
  { href: `/products/${id}/context`, label: "내러티브 맥락", icon: "❏" },
  { href: `/products/${id}/lqa`, label: "LQA 이슈", icon: "⚑" },
  { href: `/products/${id}/import`, label: "문서 가져오기", icon: "↥" },
  { href: `/products/${id}/settings`, label: "프로덕트 설정", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  if (pathname === "/login") return <>{children}</>;

  const m = pathname.match(/^\/products\/([^/]+)/);
  const productId = m?.[1];
  const inProduct = !!productId;
  const productName = products.find((p) => p.id === productId)?.name ?? "프로덕트";
  const nav = inProduct ? productNav(productId!) : globalNav;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-line bg-panel">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo text-[15px] font-extrabold text-white">
            A
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">ATLAS</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
              Localization
            </div>
          </div>
        </Link>

        {inProduct && (
          <div className="mx-3 mb-1 rounded-lg bg-indigo-soft px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-deep/70">
              프로덕트
            </div>
            <div className="truncate text-[14px] font-bold text-indigo-deep">{productName}</div>
            <Link href="/products" className="mt-0.5 inline-block text-[11px] font-medium text-indigo-deep/80 hover:underline">
              ← 전체 프로덕트
            </Link>
          </div>
        )}

        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
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
                {(session.user as { role?: string }).role
                  ? ` · ${(session.user as { role?: string }).role}`
                  : ""}
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
