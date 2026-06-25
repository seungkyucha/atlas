import { prisma } from "./prisma";
import {
  Product,
  Project,
  Speaker,
  GlossaryTerm,
  ContextNote,
  Segment,
  Translation,
  SpeakerTone,
} from "./types";
import { EngineId } from "./config";
import type {
  Product as PProduct,
  Speaker as PSpeaker,
  GlossaryTerm as PGlossary,
  ContextNote as PContext,
  Segment as PSegment,
  Project as PProject,
} from "@prisma/client";

// ---- mappers (Prisma row -> domain type) ----
const mapProduct = (p: PProduct): Product => ({
  id: p.id,
  studio: p.studio,
  name: p.name,
  genre: p.genre,
  sourceLang: p.sourceLang,
  targetLangs: p.targetLangs,
  engine: p.engine as EngineId,
  model: p.model,
});

const mapSpeaker = (s: PSpeaker): Speaker => ({
  id: s.id,
  productId: s.productId,
  name: s.name,
  role: s.role,
  persona: s.persona,
  tones: (s.tones as unknown as Record<string, SpeakerTone>) ?? {},
});

const mapGlossary = (g: PGlossary): GlossaryTerm => ({
  id: g.id,
  productId: g.productId,
  source: g.source,
  pos: g.pos,
  domain: g.domain,
  dnt: g.dnt,
  note: g.note ?? undefined,
  status: g.status as GlossaryTerm["status"],
  targets: (g.targets as unknown as Record<string, string>) ?? {},
});

const mapContext = (c: PContext): ContextNote => ({
  id: c.id,
  productId: c.productId,
  scene: c.scene,
  arc: c.arc,
  note: c.note,
  guides: (c.guides as unknown as Record<string, string>) ?? {},
});

const mapSegment = (s: PSegment): Segment => ({
  id: s.id,
  projectId: s.projectId,
  key: s.key,
  speakerId: s.speakerId ?? null,
  scene: s.scene,
  contextId: s.contextId ?? null,
  source: s.source,
  translations: (s.translations as unknown as Record<string, Translation>) ?? {},
  charLimits: (s.charLimits as unknown as Record<string, number>) ?? undefined,
});

// ---- reads ----
export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? mapProduct(row) : null;
}

export async function getProjectWithSegments(id: string): Promise<Project | null> {
  const row = await prisma.project.findUnique({
    where: { id },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    segments: row.segments.map(mapSegment),
  };
}

export async function productProjects(productId: string): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { productId },
    include: { segments: { orderBy: { order: "asc" } } },
  });
  return rows.map((r: PProject & { segments: PSegment[] }) => ({
    id: r.id,
    productId: r.productId,
    name: r.name,
    segments: r.segments.map(mapSegment),
  }));
}

export async function productSpeakers(productId: string): Promise<Speaker[]> {
  const rows = await prisma.speaker.findMany({ where: { productId } });
  return rows.map(mapSpeaker);
}

export async function productGlossary(productId: string): Promise<GlossaryTerm[]> {
  const rows = await prisma.glossaryTerm.findMany({ where: { productId } });
  return rows.map(mapGlossary);
}

export async function productContexts(productId: string): Promise<ContextNote[]> {
  const rows = await prisma.contextNote.findMany({ where: { productId } });
  return rows.map(mapContext);
}

export async function getSpeaker(id: string | null): Promise<Speaker | undefined> {
  if (!id) return undefined;
  const row = await prisma.speaker.findUnique({ where: { id } });
  return row ? mapSpeaker(row) : undefined;
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
