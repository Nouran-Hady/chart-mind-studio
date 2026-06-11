import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listPinned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ datasetId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("pinned_charts")
      .select("*")
      .eq("dataset_id", data.datasetId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const pinChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      datasetId: z.string().uuid(),
      threadId: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      chart_config: z.any(),
      note: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("pinned_charts").insert({
      user_id: userId,
      dataset_id: data.datasetId,
      thread_id: data.threadId ?? null,
      title: data.title,
      chart_config: data.chart_config,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unpinChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("pinned_charts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Auto Insights -----------------------------------------------------------
type ColumnLite = { name: string; type: "number" | "string" | "date" | "boolean" };
export type AutoInsight = {
  id: string;
  kind: "top-value" | "outlier" | "missing" | "distribution" | "trend" | "summary";
  title: string;
  description: string;
  chart?: {
    type: "bar" | "line" | "pie";
    xKey: string;
    yKey: string;
    data: Array<Record<string, unknown>>;
  };
};

export const computeAutoInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ datasetId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ds, error } = await supabase
      .from("datasets")
      .select("id,name,schema_json,full_rows,row_count")
      .eq("id", data.datasetId)
      .single();
    if (error || !ds) throw new Error(error?.message ?? "not found");
    const rows = (ds.full_rows as Record<string, unknown>[]) ?? [];
    const schema = (ds.schema_json as ColumnLite[]) ?? [];
    return buildInsights(rows, schema);
  });

function buildInsights(rows: Record<string, unknown>[], schema: ColumnLite[]): AutoInsight[] {
  const out: AutoInsight[] = [];
  if (!rows.length) return out;

  out.push({
    id: "summary",
    kind: "summary",
    title: "Dataset overview",
    description: `${rows.length.toLocaleString()} rows across ${schema.length} columns. ${schema.filter((s) => s.type === "number").length} numeric, ${schema.filter((s) => s.type === "string").length} categorical, ${schema.filter((s) => s.type === "date").length} date.`,
  });

  // Missing data hotspot
  const missingPerCol = schema.map((c) => {
    const miss = rows.reduce((s, r) => {
      const v = r[c.name];
      return s + (v === null || v === undefined || v === "" ? 1 : 0);
    }, 0);
    return { name: c.name, miss, pct: miss / rows.length };
  });
  const worst = [...missingPerCol].sort((a, b) => b.miss - a.miss)[0];
  if (worst && worst.miss > 0) {
    out.push({
      id: "missing",
      kind: "missing",
      title: `Missing data in "${worst.name}"`,
      description: `${worst.miss.toLocaleString()} rows (${(worst.pct * 100).toFixed(1)}%) are missing a value for "${worst.name}".`,
      chart: {
        type: "bar",
        xKey: "label",
        yKey: "value",
        data: missingPerCol
          .filter((m) => m.miss > 0)
          .sort((a, b) => b.miss - a.miss)
          .slice(0, 10)
          .map((m) => ({ label: m.name, value: m.miss })),
      },
    });
  }

  // Top categorical / id columns: pick first 2-3 string/number columns with reasonable cardinality
  const grouped = schema
    .map((c) => {
      const values = rows.map((r) => r[c.name]).filter((v) => v !== null && v !== undefined && v !== "");
      const counts = new Map<string, number>();
      for (const v of values) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
      return { col: c, counts, unique: counts.size, total: values.length };
    })
    .filter((g) => g.unique >= 2 && g.unique <= Math.max(50, rows.length * 0.6) && g.total > 0)
    .sort((a, b) => b.total - a.total);

  for (const g of grouped.slice(0, 3)) {
    const top = [...g.counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!top.length) continue;
    const [topKey, topCount] = top[0];
    const share = ((topCount / g.total) * 100).toFixed(1);
    out.push({
      id: `top-${g.col.name}`,
      kind: "top-value",
      title: `Top "${g.col.name}"`,
      description: `${topKey} leads with ${topCount.toLocaleString()} records (${share}% of non-empty rows).`,
      chart: {
        type: "bar",
        xKey: "label",
        yKey: "value",
        data: top.map(([k, v]) => ({ label: k, value: v })),
      },
    });
  }

  // Numeric outliers: any numeric column with extreme max vs median
  for (const c of schema.filter((s) => s.type === "number").slice(0, 5)) {
    const nums = rows
      .map((r) => Number(r[c.name]))
      .filter((n) => Number.isFinite(n));
    if (nums.length < 5) continue;
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = sorted[sorted.length - 1];
    const min = sorted[0];
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    if (median !== 0 && max / Math.abs(median || 1) > 10) {
      out.push({
        id: `outlier-${c.name}`,
        kind: "outlier",
        title: `Outliers in "${c.name}"`,
        description: `Max ${max.toLocaleString()} is far above median ${median.toLocaleString()} — possible outliers worth investigating.`,
      });
    }
    out.push({
      id: `dist-${c.name}`,
      kind: "distribution",
      title: `"${c.name}" distribution`,
      description: `min ${min.toLocaleString()} · median ${median.toLocaleString()} · mean ${mean.toFixed(2)} · max ${max.toLocaleString()} · sum ${sum.toLocaleString()}.`,
    });
    if (out.length >= 9) break;
  }

  return out.slice(0, 10);
}
