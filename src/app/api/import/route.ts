import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uid } from "@/lib/repo";
import { Translation, SegmentStatus } from "@/lib/types";
import { langMap } from "@/lib/config";
import { detectSchema, findSourceCol, matrixFromRows, isMarkerOrEmptyKey } from "@/lib/stringbag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_ROWS = 20000;

function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

function cleanNs(name: string): string {
  return name.replace(/^[!#]+/, "").trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const productId = String(form.get("productId") ?? "");
    let projectId = String(form.get("projectId") ?? "");
    const projectName = String(form.get("projectName") ?? "가져온 StringBag");
    const autoAddLangs = String(form.get("autoAddLangs") ?? "true") !== "false";
    if (!file || !productId) return NextResponse.json({ error: "file and productId required" }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    // collect (sheetName, matrix) pairs
    const sheets: { name: string; matrix: string[][] }[] = [];
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      wb.worksheets.forEach((ws) => {
        const rows: unknown[][] = [];
        ws.eachRow({ includeEmpty: true }, (r) => {
          const vals = (r.values as unknown[]).slice(1);
          rows.push(vals);
        });
        sheets.push({ name: ws.name, matrix: matrixFromRows(rows) });
      });
    } else {
      sheets.push({ name: "Sheet1", matrix: parseCSV(await file.text()) });
    }

    // detect schema per sheet & gather discovered languages
    const parsed = sheets
      .map((s) => ({ ...s, schema: detectSchema(s.matrix) }))
      .filter((s) => s.schema) as { name: string; matrix: string[][]; schema: NonNullable<ReturnType<typeof detectSchema>> }[];

    if (parsed.length === 0) {
      return NextResponse.json({ error: "StringBag 스키마를 인식하지 못했습니다 (언어 컬럼/키 컬럼을 찾을 수 없음)" }, { status: 400 });
    }

    const discovered = new Set<string>();
    for (const p of parsed) for (const iso of Object.keys(p.schema.langCols)) discovered.add(iso);

    // auto-add valid discovered languages (catalog langs, not the source) to the product
    let langsAdded: string[] = [];
    if (autoAddLangs) {
      const add = [...discovered].filter((l) => langMap[l] && l !== product.sourceLang && !product.targetLangs.includes(l));
      if (add.length) {
        const next = [...product.targetLangs, ...add];
        await prisma.product.update({ where: { id: productId }, data: { targetLangs: next } });
        product.targetLangs = next;
        langsAdded = add;
      }
    }
    const targetSet = new Set(product.targetLangs);

    // resolve project
    const merge = !!projectId;
    if (!projectId) {
      const proj = await prisma.project.create({ data: { id: uid("proj"), productId, name: projectName } });
      projectId = proj.id;
    }
    const existing = merge ? await prisma.segment.findMany({ where: { projectId } }) : [];
    const byKey = new Map(existing.map((s) => [s.key, s]));

    let order = await prisma.segment.count({ where: { projectId } });
    let created = 0, updated = 0, total = 0;
    const toCreate: Prisma.SegmentUncheckedCreateInput[] = [];

    for (const sheet of parsed) {
      const { matrix, schema } = sheet;
      const ns = cleanNs(sheet.name);
      const srcCol = findSourceCol(matrix, schema);
      const langEntries = Object.entries(schema.langCols);
      const firstLangCol = Math.min(...langEntries.map(([, c]) => c));
      const sourceCol = srcCol >= 0 ? srcCol : (schema.langCols[product.sourceLang] ?? firstLangCol);

      for (let r = schema.dataStart; r < matrix.length; r++) {
        if (total >= MAX_ROWS) break;
        const row = matrix[r];
        if (!row) continue;
        const key = (row[schema.keyCol] ?? "").trim();
        if (isMarkerOrEmptyKey(key)) continue;
        const source = (row[sourceCol] ?? "").trim();

        const translations: Record<string, Translation> = {};
        for (const [iso, col] of langEntries) {
          if (iso === product.sourceLang || col === sourceCol) continue;
          if (!targetSet.has(iso)) continue;
          const text = (row[col] ?? "").trim();
          if (text) translations[iso] = { text, status: "translated" as SegmentStatus };
        }
        if (!source && Object.keys(translations).length === 0) continue;
        total++;

        const prior = byKey.get(key);
        if (merge && prior) {
          const cur = { ...((prior.translations as unknown as Record<string, Translation>) ?? {}) };
          for (const [l, t] of Object.entries(translations)) cur[l] = t;
          await prisma.segment.update({
            where: { id: prior.id },
            data: { source: source || prior.source, namespace: ns || prior.namespace, translations: cur as unknown as Prisma.InputJsonValue },
          });
          updated++;
        } else {
          order++;
          toCreate.push({
            id: uid("seg"),
            projectId,
            key,
            namespace: ns,
            speakerId: null,
            scene: "",
            source,
            translations: translations as unknown as Prisma.InputJsonValue,
            order,
          } as Prisma.SegmentUncheckedCreateInput);
          created++;
        }
      }
    }

    // batched insert
    for (let i = 0; i < toCreate.length; i += 500) {
      await prisma.segment.createMany({ data: toCreate.slice(i, i + 500) });
    }

    return NextResponse.json({
      ok: true,
      projectId,
      created,
      updated,
      merged: merge,
      langsAdded,
      languages: [...discovered],
      sheets: parsed.map((p) => p.name),
      truncated: total >= MAX_ROWS,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "import failed" }, { status: 500 });
  }
}
