import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDatasets, listInsights } from "@/lib/datasets.functions";
import { Upload, MessageSquare, BarChart3, Database, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InsightAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const listDs = useServerFn(listDatasets);
  const listIns = useServerFn(listInsights);
  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => listDs() });
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => listIns() });

  const totalRows = (datasets.data ?? []).reduce((s, d) => s + (d.row_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">
          Upload data, ask questions, and let InsightAI surface what matters.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Datasets" value={datasets.data?.length ?? 0} icon={Database} />
        <Stat label="Rows analyzed" value={totalRows.toLocaleString()} icon={FileSpreadsheet} />
        <Stat label="Saved insights" value={insights.data?.length ?? 0} icon={MessageSquare} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickAction
          to="/upload"
          icon={Upload}
          title="Upload data"
          desc="Drag in Excel or CSV. We'll auto-detect the schema."
        />
        <QuickAction
          to="/datasets"
          icon={Database}
          title="Browse datasets"
          desc="Open a dataset and start a new conversation."
        />
        <QuickAction
          to="/analytics"
          icon={BarChart3}
          title="Analytics"
          desc="Explore generated insights and saved charts."
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Recent datasets</h2>
        <div className="grid gap-3">
          {datasets.isLoading && <div className="text-muted-foreground">Loading…</div>}
          {datasets.data?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No datasets yet.{" "}
              <Link to="/upload" className="text-primary underline">
                Upload your first file
              </Link>
              .
            </div>
          )}
          {datasets.data?.slice(0, 5).map((d) => (
            <Link
              key={d.id}
              to="/datasets/$datasetId"
              params={{ datasetId: d.id }}
              className="glass-card flex items-center justify-between rounded-xl p-4 transition hover:border-primary/40"
            >
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.row_count.toLocaleString()} rows · {d.column_count} cols ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Recent insights</h2>
        <div className="grid gap-3">
          {insights.data?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Insights appear here after your first chat.
            </div>
          )}
          {insights.data?.slice(0, 5).map((i) => (
            <div key={i.id} className="glass-card rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {new Date(i.created_at).toLocaleString()} · {i.chart_type ?? "text"}
              </div>
              <div className="mt-1 font-medium">{i.question}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {i.insight_text}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="glass-card group rounded-xl p-5 transition hover:border-primary/40"
    >
      <Icon className="h-6 w-6 text-primary transition group-hover:scale-110" />
      <div className="mt-3 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
