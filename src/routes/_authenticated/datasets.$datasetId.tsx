import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDataset,
  listThreads,
  createThread,
  deleteThread,
} from "@/lib/datasets.functions";
import { computeAutoInsights } from "@/lib/pinned.functions";
import { Plus, MessageSquare, Trash2, AlertTriangle, CheckCircle2, ArrowLeft, Sparkles, LayoutDashboard, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ColumnSchema } from "@/lib/dataset-utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/datasets/$datasetId")({
  head: () => ({ meta: [{ title: "Dataset — InsightAI" }] }),
  component: DatasetDetail,
});

function DatasetDetail() {
  const { datasetId } = Route.useParams();
  const get = useServerFn(getDataset);
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const insightsFn = useServerFn(computeAutoInsights);

  const ds = useQuery({ queryKey: ["dataset", datasetId], queryFn: () => get({ data: { id: datasetId } }) });
  const threads = useQuery({
    queryKey: ["threads", datasetId],
    queryFn: () => list({ data: { datasetId } }),
  });
  const autoInsights = useQuery({
    queryKey: ["auto-insights", datasetId],
    queryFn: () => insightsFn({ data: { datasetId } }),
    staleTime: 5 * 60 * 1000,
  });

  const createMut = useMutation({
    mutationFn: () => create({ data: { datasetId, title: "New conversation" } }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads", datasetId] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Thread deleted");
      qc.invalidateQueries({ queryKey: ["threads", datasetId] });
    },
  });

  if (ds.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!ds.data) return <div className="p-8 text-muted-foreground">Not found.</div>;

  const schema = (ds.data.schema_json as unknown as ColumnSchema[]) ?? [];
  const rows = (ds.data.sample_rows as unknown as Record<string, unknown>[]) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <Link to="/datasets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All datasets
      </Link>

      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{ds.data.name}</h1>
          <p className="text-muted-foreground">
            {ds.data.row_count.toLocaleString()} rows · {ds.data.column_count} columns ·{" "}
            {ds.data.missing_values} missing values
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/board/$datasetId"
            params={{ datasetId }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        </div>
      </header>

      <section className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Auto insights</h2>
          <span className="text-xs text-muted-foreground">Generated from your full dataset</span>
        </div>
        {autoInsights.isLoading && <div className="text-sm text-muted-foreground">Crunching…</div>}
        {autoInsights.data && (
          <div className="grid gap-3 md:grid-cols-2">
            {autoInsights.data.map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Schema</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {schema.map((c) => (
                <div key={c.name} className="rounded-lg border border-border bg-card/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{c.name}</div>
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs uppercase tracking-wider">
                      {c.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {c.missing > 0 ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> {c.missing} missing
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> complete
                      </span>
                    )}
                    <span>· {c.unique} unique</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card overflow-hidden rounded-2xl">
            <div className="border-b border-border p-4">
              <h2 className="font-display text-lg font-semibold">Preview</h2>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    {schema.map((c) => (
                      <th key={c.name} className="border-b border-border px-3 py-2 text-left font-medium">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="even:bg-muted/30">
                      {schema.map((c) => (
                        <td key={c.name} className="border-b border-border/50 px-3 py-1.5">
                          {String(r[c.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Conversations</h2>
          {threads.data?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Start your first chat to ask questions about this dataset.
            </div>
          )}
          {threads.data?.map((t) => (
            <div key={t.id} className="glass-card flex items-center justify-between rounded-xl p-3">
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className="flex flex-1 items-center gap-2"
              >
                <MessageSquare className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString()}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => confirm("Delete conversation?") && removeMut.mutate(t.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

type AutoInsight = {
  id: string;
  kind: "top-value" | "outlier" | "missing" | "distribution" | "trend" | "summary";
  title: string;
  description: string;
  chart?: {
    type: "bar" | "line" | "pie";
    xKey: string;
    yKey: string;
    data: Array<{ label: string; value: number }>;
  };
};

function InsightCard({ insight }: { insight: AutoInsight }) {
  const Icon =
    insight.kind === "outlier" ? AlertCircle :
    insight.kind === "missing" ? AlertTriangle :
    insight.kind === "top-value" ? TrendingUp :
    Sparkles;
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{insight.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{insight.description}</div>
        </div>
      </div>
      {insight.chart && insight.chart.data.length > 0 && (
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={insight.chart.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
