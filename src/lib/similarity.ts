// Dice coefficient on character bigrams — fast, dependency-free fuzzy match
// suitable for translation-memory leverage.
function bigrams(s: string): Map<string, number> {
  const t = s.toLowerCase().replace(/\s+/g, " ").trim();
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const bg = t.slice(i, i + 2);
    m.set(bg, (m.get(bg) ?? 0) + 1);
  }
  return m;
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let overlap = 0;
  for (const [bg, count] of A) {
    const bc = B.get(bg);
    if (bc) overlap += Math.min(count, bc);
  }
  const total = [...A.values()].reduce((n, c) => n + c, 0) + [...B.values()].reduce((n, c) => n + c, 0);
  return (2 * overlap) / total;
}
