import { seed, DB } from "./seed";

// Module-level singleton kept on globalThis so it survives Next.js hot reloads
// and is shared across requests within a running server instance.
// NOTE: in-memory — resets on redeploy/restart. Postgres persistence is the
// next step (see DEVELOPMENT.md).
const g = globalThis as unknown as { __atlasDB?: DB };

export const db: DB = g.__atlasDB ?? (g.__atlasDB = seed());

// ---- accessors ----
export const getProduct = (id: string) => db.products.find((p) => p.id === id);
export const getProject = (id: string) => db.projects.find((p) => p.id === id);
export const productProjects = (productId: string) =>
  db.projects.filter((p) => p.productId === productId);
export const productSpeakers = (productId: string) =>
  db.speakers.filter((s) => s.productId === productId);
export const productGlossary = (productId: string) =>
  db.glossary.filter((g0) => g0.productId === productId);
export const productContexts = (productId: string) =>
  db.contexts.filter((c) => c.productId === productId);
export const getSpeaker = (id: string | null) =>
  id ? db.speakers.find((s) => s.id === id) : undefined;

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
