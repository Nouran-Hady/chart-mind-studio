import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { parseWorkbook, type ParsedSheet } from "@/lib/dataset-utils";
import { createDataset } from "@/lib/datasets.functions";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload — InsightAI" }] }),
  component: UploadPage,
});

function UploadPage() {
  const create = useServerFn(createDataset);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const parsed = useMemo(
    () => sheets.find((s) => s.sheetName === activeSheet) ?? null,
    [sheets, activeSheet],
  );

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setSheets([]);
    setSelected(new Set());
    setActiveSheet(null);
    setBusy(true);
    const t = toast.loading(`Parsing ${f.name}…`);
    try {
      const wb = await parseWorkbook(f);
      if (!wb.sheets.length) throw new Error("No data found in file");
      setSheets(wb.sheets);
      setSelected(new Set(wb.sheets.map((s) => s.sheetName)));
      setActiveSheet(wb.sheets[0].sheetName);
      toast.success(
        wb.sheets.length === 1
          ? `Detected ${wb.sheets[0].columnCount} columns and ${wb.sheets[0].rowCount} rows`
          : `Found ${wb.sheets.length} sheets — choose which to analyze`,
        { id: t },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not parse file", { id: t });
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const toggleSheet = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const save = async () => {
    if (!file || selected.size === 0) return;
    const chosen = sheets.filter((s) => selected.has(s.sheetName));
    setBusy(true);
    const t = toast.loading(
      chosen.length > 1 ? `Saving ${chosen.length} datasets…` : "Saving dataset…",
    );
    const baseName = file.name.replace(/\.[^.]+$/, "");
    try {
      let lastId: string | null = null;
      for (const s of chosen) {
        const name = chosen.length > 1 ? `${baseName} — ${s.sheetName}` : baseName;
        const ds = await create({
          data: {
            name,
            filename: file.name,
            file_size: file.size,
            row_count: s.rowCount,
            column_count: s.columnCount,
            missing_values: s.missingValues,
            schema_json: s.schema,
            sample_rows: s.rows.slice(0, 100),
            full_rows: s.rows.slice(0, 1000),
          },
        });
        lastId = ds.id;
      }
      qc.invalidateQueries({ queryKey: ["datasets"] });
      toast.success(chosen.length > 1 ? "Datasets ready" : "Dataset ready", { id: t });
      if (lastId) {
        if (chosen.length > 1) navigate({ to: "/datasets" });
        else navigate({ to: "/datasets/$datasetId", params: { datasetId: lastId } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Upload data</h1>
        <p className="mt-1 text-muted-foreground">
          Drop an Excel (.xlsx, .xls) or CSV file. We&apos;ll parse it, detect columns, and get it
          ready for AI analysis.
        </p>
      </header>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`glass-card flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition ${
          dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
      >
        <Upload className="mb-3 h-10 w-10 text-primary" />
        <div className="font-medium">Drop file here or click to browse</div>
        <div className="mt-1 text-sm text-muted-foreground">.xlsx, .xls, .csv up to ~20MB</div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      {sheets.length > 1 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              Choose sheets to analyze ({selected.size}/{sheets.length})
            </h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            This workbook has multiple sheets. Pick which ones to import — each becomes its own
            dataset. Click a sheet name to preview it below.
          </p>
          <div className="flex flex-wrap gap-2">
            {sheets.map((s) => {
              const isActive = s.sheetName === activeSheet;
              const isSelected = selected.has(s.sheetName);
              return (
                <div
                  key={s.sheetName}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/50 hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSheet(s.sheetName)}
                    className="h-4 w-4 accent-primary"
                  />
                  <button
                    onClick={() => setActiveSheet(s.sheetName)}
                    className="font-medium"
                  >
                    {s.sheetName}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {s.rowCount}×{s.columnCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsed && (
        <>
          {sheets.length > 1 && (
            <div className="text-sm text-muted-foreground">
              Previewing sheet: <span className="font-medium text-foreground">{parsed.sheetName}</span>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Rows" value={parsed.rowCount.toLocaleString()} />
            <Metric label="Columns" value={parsed.columnCount} />
            <Metric label="Missing values" value={parsed.missingValues.toLocaleString()} />
            <Metric
              label="Quality"
              value={
                parsed.missingValues / Math.max(parsed.rowCount * parsed.columnCount, 1) < 0.05
                  ? "Good"
                  : "Check"
              }
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Detected schema</h2>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save & analyze"}
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {parsed.schema.map((c) => (
                <div key={c.name} className="rounded-lg border border-border bg-card/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{c.name}</div>
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs uppercase tracking-wider">
                      {c.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {c.missing > 0 ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> {c.missing} missing
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> complete
                      </span>
                    )}
                    <span>· {c.unique} unique</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="border-b border-border p-4">
              <h2 className="font-display text-lg font-semibold">Preview (first 100 rows)</h2>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    {parsed.schema.map((c) => (
                      <th
                        key={c.name}
                        className="border-b border-border px-3 py-2 text-left font-medium"
                      >
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="even:bg-muted/30">
                      {parsed.schema.map((c) => (
                        <td key={c.name} className="border-b border-border/50 px-3 py-1.5">
                          {String(r[c.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _icon = FileSpreadsheet;
