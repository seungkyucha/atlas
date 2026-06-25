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
    const projectName = String(form.get("projectName") ?? "가져온 프로젝트");
    if (!file || !productId) {
      return NextResponse.json({ error: "file and productId required" }, { status: 400 });
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    // parse file into a matrix
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
    if (matrix.length < 1) return NextResponse.json({ error: "empty file" }, { status: 400 });

    const header = matrix[0].map((h) => h.trim().toLowerCase());
    const findCol = (...names: string[]) =>
      header.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
    const srcCol = findCol("source", "source(" + product.sourceLang + ")", "원문", product.sourceLang);
    const speakerCol = findCol("speaker", "화자");
    const sceneCol = findCol("scene", "씬");
    const keyCol = findCol("key", "키");
    const langCols: Record<string, number> = {};
    for (const l of product.targetLangs) {
      const idx = header.findIndex((h) => h === l.toLowerCase());
      if (idx >= 0) langCols[l] = idx;
    }
    if (srcCol < 0) {
      return NextResponse.json({ error: "source 컬럼을 찾을 수 없습니다 (헤더에 source 필요)" }, { status: 400 });
    }

    // project
    if (!projectId) {
      const proj = await prisma.project.create({
        data: { id: uid("proj"), productId, name: projectName },
      });
      projectId = proj.id;
    }

    const speakers = await prisma.speaker.findMany({ where: { productId } });
    const byName: Record<string, string> = Object.fromEntries(
      speakers.map((s) => [s.name.toLowerCase(), s.id])
    );

    let order = (await prisma.segment.count({ where: { projectId } }));
    let created = 0;
    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i];
      const source = (r[srcCol] ?? "").trim();
      if (!source) continue;
      const translations: Record<string, Translation> = {};
      for (const [l, idx] of Object.entries(langCols)) {
        const text = (r[idx] ?? "").trim();
        translations[l] = { text, status: (text ? "translated" : "untranslated") as SegmentStatus };
      }
      const speakerName = speakerCol >= 0 ? (r[speakerCol] ?? "").trim().toLowerCase() : "";
      await prisma.segment.create({
        data: {
          id: uid("seg"),
          projectId,
          key: keyCol >= 0 && r[keyCol] ? r[keyCol].trim() : `#${String(order + 1).padStart(4, "0")}`,
          speakerId: speakerName && byName[speakerName] ? byName[speakerName] : null,
          scene: sceneCol >= 0 ? (r[sceneCol] ?? "").trim() : "",
          source,
          translations: translations as unknown as Prisma.InputJsonValue,
          order: order + 1,
        } as Prisma.SegmentUncheckedCreateInput,
      });
      order++;
      created++;
    }

    return NextResponse.json({ ok: true, projectId, created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "import failed" },
      { status: 500 }
    );
  }
}
