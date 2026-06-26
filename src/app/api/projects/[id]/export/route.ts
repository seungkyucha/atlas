import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { Translation } from "@/lib/types";
import { STUDIO_CODE } from "@/lib/stringbag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";
  const dialect = searchParams.get("dialect") ?? "iso"; // iso | studio
  const cols = searchParams.get("cols") ?? "full"; // full | strings
  const langCode = (l: string) => (dialect === "studio" ? STUDIO_CODE[l] ?? l : l);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return new Response("not found", { status: 404 });
  const product = await prisma.product.findUnique({ where: { id: project.productId } });
  if (!product) return new Response("not found", { status: 404 });
  const [segments, speakers] = await Promise.all([
    prisma.segment.findMany({ where: { projectId: params.id }, orderBy: { order: "asc" } }),
    prisma.speaker.findMany({ where: { productId: product.id } }),
  ]);
  const speakerName: Record<string, string> = Object.fromEntries(speakers.map((s) => [s.id, s.name]));

  const langs = product.targetLangs;
  const stringsOnly = cols === "strings";
  const headers = stringsOnly
    ? ["namespace", "key", `source(${langCode(product.sourceLang)})`, ...langs.map(langCode)]
    : ["namespace", "key", "speaker", "description", "max_length", `source(${langCode(product.sourceLang)})`,
       ...langs.flatMap((l) => [langCode(l), `${langCode(l)}_status`])];

  const rows = segments.map((s) => {
    const tr = (s.translations as unknown as Record<string, Translation>) ?? {};
    if (stringsOnly) {
      return [s.namespace ?? "", s.key, s.source, ...langs.map((l) => tr[l]?.text ?? "")];
    }
    const row: string[] = [
      s.namespace ?? "",
      s.key,
      s.speakerId ? speakerName[s.speakerId] ?? "" : "",
      s.description ?? "",
      s.maxLen != null ? String(s.maxLen) : "",
      s.source,
    ];
    for (const l of langs) row.push(tr[l]?.text ?? "", tr[l]?.status ?? "untranslated");
    return row;
  });

  const base = `${product.name}-${project.name}`.replace(/[^\w가-힣.-]+/g, "_");

  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("translations");
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(base)}.xlsx"`,
      },
    });
  }

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(base)}.csv"`,
    },
  });
}
