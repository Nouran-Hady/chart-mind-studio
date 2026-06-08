// Client-safe dataset helpers: parse Excel/CSV and infer schema.
import * as XLSX from "xlsx";

export type ColumnType = "number" | "string" | "date" | "boolean";

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  missing: number;
  unique: number;
  sample: (string | number | boolean | null)[];
}

export interface ParsedDataset {
  rows: Record<string, unknown>[];
  schema: ColumnSchema[];
  rowCount: number;
  columnCount: number;
  missingValues: number;
}

function inferType(values: unknown[]): ColumnType {
  let nums = 0, dates = 0, bools = 0, total = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    total++;
    if (typeof v === "boolean") bools++;
    else if (typeof v === "number" || (!isNaN(Number(v)) && String(v).trim() !== "")) nums++;
    else if (!isNaN(Date.parse(String(v)))) dates++;
  }
  if (!total) return "string";
  if (bools / total > 0.9) return "boolean";
  if (nums / total > 0.85) return "number";
  if (dates / total > 0.85) return "date";
  return "string";
}

export async function parseFile(file: File): Promise<ParsedDataset> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  let missingTotal = 0;
  const schema: ColumnSchema[] = columns.map((col) => {
    const values = rows.map((r) => r[col]);
    const missing = values.filter((v) => v === null || v === undefined || v === "").length;
    missingTotal += missing;
    const uniq = new Set(values.map((v) => (v === null ? "∅" : String(v))));
    const type = inferType(values);
    return {
      name: col,
      type,
      missing,
      unique: uniq.size,
      sample: values.slice(0, 5).map((v) => (v instanceof Date ? v.toISOString() : (v as never))),
    };
  });
  // Normalize dates to ISO strings for JSON storage
  const normalized = rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const k of columns) {
      const v = r[k];
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
  });
  return {
    rows: normalized,
    schema,
    rowCount: rows.length,
    columnCount: columns.length,
    missingValues: missingTotal,
  };
}
