// Pure, client-safe role constants (no server imports).
export const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  translator: 2,
  reviewer: 3,
  manager: 4,
  admin: 5,
  owner: 6,
};

export const ROLE_LABEL: Record<string, string> = {
  viewer: "뷰어",
  translator: "번역가",
  reviewer: "감수자",
  manager: "매니저",
  admin: "관리자",
  owner: "오너",
};

export function rank(role?: string): number {
  return ROLE_RANK[role ?? "translator"] ?? 2;
}

export function atLeast(role: string | undefined, min: string): boolean {
  return rank(role) >= rank(min);
}
