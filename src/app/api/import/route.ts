import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";
import { Translation, SegmentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  // strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const productId = String(form.get("productId") ?? "");
    let projectId = String(form.get("projectId") ?? "");
    const projectName = String(form.get("projectName") ?? "가져온 StringBag");
    if (!file || !productId) {
      return NextResponse.json({ error: "file and productId required" }, { status: 400 });
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    let matrix: string[][] = [];
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      ws.eachRow((r) => {
        const vals = (r.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
        matrix.push(vals);
      });
    } else {
      matrix = parseCSV(await file.text());
    }
    if (matrix.length < 2) return NextResponse.json({ error: "empty file (header + rows 필요)" }, { status: 400 });

    const header = matrix[0].map((h) => h.trim().toLowerCase());
    const findCol = (...names: string[]) =>
      header.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
    const keyCol = findCol("key", "stringbag", "id", "키");
    const srcCol = findCol("source", "source(" + product.sourceLang + ")", "원문", "text", product.sourceLang);
    const nsCol = findCol("namespace", "category", "네임스페이스");
    const speakerCol = findCol("speaker", "character", "화자");
    const sceneCol = findCol("scene", "씬");
    const descCol = findCol("description", "context", "comment", "note", "설명");
    const maxCol = findCol("maxlen", "max_length", "maxlength", "최대길이");
    const langCols: Record<string, number> = {};
    for (const l of product.targetLangs) {
      const idx = header.findIndex((h) => h === l.toLowerCase());
      if (idx >= 0) langCols[l] = idx;
    }
    if (srcCol < 0 && keyCol < 0) {
      return NextResponse.json({ error: "source 또는 key 컬럼이 필요합니다" }, { status: 400 });
    }

    // resolve project (create if not merging)
    const merge = !!projectId;
    if (!projectId) {
      const proj = await prisma.project.create({ data: { id: uid("proj"), productId, name: projectName } });
      projectId = proj.id;
    }

    const speakers = await prisma.speaker.findMany({ where: { productId } });
    const byName: Record<string, string> = Object.fromEntries(speakers.map((s) => [s.name.toLowerCase(), s.id]));
    const existing = merge
      ? await prisma.segment.findMany({ where: { projectId } })
      : [];
    const byKey: Record<string, (typeof existing)[number]> = Object.fromEntries(existing.map((s) => [s.key, s]));

    let order = await prisma.segment.count({ where: { projectId } });
    let created = 0;
    let updated = 0;

    const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i];
      const key = cell(r, keyCol);
      const source = cell(r, srcCol) || key;
      if (!key && !source) continue;

      const langTr: Record<string, Translation> = {};
      for (const [l, idx] of Object.entries(langCols)) {
        const text = (r[idx] ?? "").trim();
        if (text) langTr[l] = { text, status: "translated" as SegmentStatus };
      }
      const speakerName = cell(r, speakerCol).toLowerCase();
      const speakerId = speakerName && byName[speakerName] ? byName[speakerName] : null;
      const maxLenRaw = cell(r, maxCol);
      const maxLen = maxLenRaw && !isNaN(Number(maxLenRaw)) ? parseInt(maxLenRaw, 10) : null;

      const prior = key ? byKey[key] : undefined;
      if (merge && prior) {
        // merge translations (incoming overrides per-lang), keep others
        const cur = { ...((prior.translations as unknown as Record<string, Translation>) ?? {}) };
        for (const [l, t] of Object.entries(langTr)) cur[l] = t;
        await prisma.segment.update({
          where: { id: prior.id },
          data: {
            source,
            namespace: cell(r, nsCol) || prior.namespace,
            description: cell(r, descCol) || prior.description,
            maxLen: maxLen ?? prior.maxLen,
            speakerId: speakerId ?? prior.speakerId,
            translations: cur as unknown as Prisma.InputJsonValue,
          },
        });
        updated++;
      } else {
        await prisma.segment.create({
          data: {
            id: uid("seg"),
            projectId,
            key: key || `KEY_${String(order + 1).padStart(4, "0")}`,
            namespace: cell(r, nsCol),
            speakerId,
            scene: cell(r, sceneCol),
            description: cell(r, descCol) || null,
            maxLen,
            source,
            translations: langTr as unknown as Prisma.InputJsonValue,
            order: order + 1,
          } as Prisma.SegmentUncheckedCreateInput,
        });
        order++;
        created++;
      }
    }

    return NextResponse.json({ ok: true, projectId, created, updated, merged: merge });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "import failed" }, { status: 500 });
  }
}
