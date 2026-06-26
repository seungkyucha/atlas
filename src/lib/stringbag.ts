// Smart parser for real-world game StringBag spreadsheets.
// Handles:
//  - macro tables with a `*start … *end` schema row (AK, HKF2, DFKD)
//  - plain "language header row + type row" tables (BP)
//  - studio language codes (kr/jp/cn/tw/br) and full names (Korean/English/...)

// studio token -> ISO code used by ATLAS
const LANG_ALIAS: Record<string, string> = {
  // Korean
  kr: "ko", ko: "ko", kor: "ko", korean: "ko", 한국어: "ko", "개발(국내)": "ko", 국내: "ko", 개발국내: "ko",
  // English
  en: "en", eng: "en", english: "en", 영어: "en", "글로벌(영문)": "en", 영문: "en", 글로벌영문: "en",
  // Japanese
  jp: "ja", ja: "ja", jpn: "ja", japanese: "ja", 일본어: "ja",
  // Chinese simplified
  cn: "zh-CN", zh: "zh-CN", "zh-cn": "zh-CN", zhcn: "zh-CN", schinese: "zh-CN", "zh-hans": "zh-CN",
  chinese: "zh-CN", 중국어_간체: "zh-CN", 간체: "zh-CN", 중국어간체: "zh-CN", 중국어: "zh-CN",
  // Chinese traditional
  tw: "zh-TW", "zh-tw": "zh-TW", zhtw: "zh-TW", tchinese: "zh-TW", "zh-hant": "zh-TW",
  중국어_번체: "zh-TW", 번체: "zh-TW", 중국어번체: "zh-TW",
  // others
  de: "de", ger: "de", german: "de", 독일어: "de",
  fr: "fr", fra: "fr", french: "fr", 프랑스어: "fr",
  es: "es", spa: "es", spanish: "es", 스페인어: "es",
  ru: "ru", rus: "ru", russian: "ru", 러시아어: "ru",
  th: "th", tha: "th", thai: "th", 태국어: "th",
  br: "pt-BR", pt: "pt-BR", "pt-br": "pt-BR", ptbr: "pt-BR", portuguese: "pt-BR", 포르투갈어: "pt-BR",
  vi: "vi", vie: "vi", vietnamese: "vi", 베트남어: "vi",
  id: "id", ind: "id", indonesian: "id", 인도네시아어: "id",
};

// ISO -> common studio code (for delivering back in studio dialect)
export const STUDIO_CODE: Record<string, string> = {
  ko: "kr", en: "en", ja: "jp", "zh-CN": "cn", "zh-TW": "tw",
  de: "de", fr: "fr", es: "es", ru: "ru", th: "th", "pt-BR": "br", vi: "vi", id: "id",
};

const TYPE_TOKENS = new Set([
  "string", "int", "float", "bool", "long", "double", "id", "text", "number",
  "datetime", "date", "enum", "uint", "byte", "short",
]);

export function toIso(token: string): string | null {
  if (!token) return null;
  const t = token.trim().toLowerCase().replace(/\s+/g, "");
  return LANG_ALIAS[t] ?? LANG_ALIAS[token.trim()] ?? null;
}

function norm(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown };
    return String(o.text ?? o.result ?? "");
  }
  return String(v);
}

function isTypeRow(row?: string[]): boolean {
  if (!row) return false;
  const cells = row.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (cells.length === 0) return false;
  return cells.every((c) => TYPE_TOKENS.has(c));
}

export interface SbSchema {
  keyCol: number;
  langCols: Record<string, number>; // iso -> column index
  dataStart: number;
  headerRow: number;
}

const KEY_HEADER = /^(key|id|stringid|string_id|string id|코드|키|stringkey)$/i;
const SOURCE_HEADER = /^(source|원문|src)/i;

/** Find an explicit "source" column near the header row, if any. */
export function findSourceCol(matrix: string[][], schema: SbSchema): number {
  for (let r = Math.max(0, schema.headerRow - 1); r <= schema.headerRow + 1; r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (SOURCE_HEADER.test((row[c] ?? "").trim())) return c;
    }
  }
  return -1;
}

/** Detect the StringBag schema of a sheet matrix (0-indexed rows/cols). */
export function detectSchema(matrix: string[][]): SbSchema | null {
  const scan = Math.min(14, matrix.length);

  // 1) macro `*start` marker
  for (let r = 0; r < scan; r++) {
    const row = matrix[r] ?? [];
    const startIdx = row.findIndex((c) => (c ?? "").trim().toLowerCase() === "*start");
    if (startIdx < 0) continue;
    const langCols: Record<string, number> = {};
    for (let c = startIdx + 1; c < row.length; c++) {
      const v = (row[c] ?? "").trim();
      if (v.toLowerCase() === "*end") break;
      if (!v || v.startsWith("!") || v.startsWith("#") || v.startsWith("*")) continue;
      const iso = toIso(v);
      if (iso && langCols[iso] == null) langCols[iso] = c;
    }
    if (Object.keys(langCols).length === 0) continue;
    let dataStart = r + 1;
    if (isTypeRow(matrix[dataStart])) dataStart++;
    return { keyCol: startIdx, langCols, dataStart, headerRow: r };
  }

  // 2) language-header row (no marker)
  let best = -1, bestCount = 0;
  let bestLangs: Record<string, number> = {};
  for (let r = 0; r < scan; r++) {
    const row = matrix[r] ?? [];
    const lc: Record<string, number> = {};
    let cnt = 0;
    row.forEach((v, c) => {
      const iso = toIso((v ?? "").trim());
      if (iso && lc[iso] == null) { lc[iso] = c; cnt++; }
    });
    if (cnt > bestCount) { best = r; bestCount = cnt; bestLangs = lc; }
  }
  if (best >= 0 && bestCount >= 2) {
    const langSet = new Set(Object.values(bestLangs));
    const row = matrix[best] ?? [];
    const firstLang = Math.min(...Object.values(bestLangs));
    let keyCol = -1;
    // prefer a column explicitly named key/id
    for (let c = 0; c < row.length; c++) {
      if (!langSet.has(c) && KEY_HEADER.test((row[c] ?? "").trim())) { keyCol = c; break; }
    }
    // else the non-language column immediately left of the first language column
    if (keyCol < 0) {
      for (let c = firstLang - 1; c >= 0; c--) {
        if (!langSet.has(c)) { keyCol = c; break; }
      }
    }
    // else first non-language column
    if (keyCol < 0) {
      for (let c = 0; c < Math.max(row.length, 1); c++) {
        if (!langSet.has(c)) { keyCol = c; break; }
      }
    }
    if (keyCol < 0) keyCol = 0;
    let dataStart = best + 1;
    if (isTypeRow(matrix[dataStart])) dataStart++;
    return { keyCol, langCols: bestLangs, dataStart, headerRow: best };
  }
  return null;
}

export function matrixFromRows(rows: unknown[][]): string[][] {
  // densify: exceljs rows are sparse arrays (holes) which break map/findIndex
  return rows.map((r) => {
    const out: string[] = [];
    const len = r.length;
    for (let i = 0; i < len; i++) out.push(norm(r[i]));
    return out;
  });
}

export function cleanKey(k: string): string {
  return k.trim();
}

export function isMarkerOrEmptyKey(k: string): boolean {
  const t = k.trim();
  if (!t) return true;
  if (t.startsWith("*") || t.startsWith("//") || t.startsWith("#")) return true;
  return false;
}
