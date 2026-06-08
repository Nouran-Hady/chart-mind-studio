import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInsights, listDatasets } from "@/lib/datasets.functions";
import { BarChart3, MessageSquare } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — InsightAI" }] }),
  component: Analytics,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Analytics() {
  const list = useServerFn(listInsights);
  const listDs = useServerFn(listDatasets);
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => list() });
  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => listDs() });

  const typeCounts = (insights.data ?? []).reduce<Record<string, number>>((acc, i) => {
    const k = i.chart_type || "text";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts).map(([label, value]) => ({ label, value }));

  const dsData = (datasets.data ?? []).slice(0, 8).map((d) => ({
    label: d.name.slice(0, 16),
    value: d.row_count,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">An overview of your saved insights and datasets.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Rows per dataset</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dsData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Insight types</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="label" outerRadius={100} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">All saved insights</h2>
        <div className="grid gap-3">
          {insights.data?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No insights yet. Start a conversation on a dataset.
            </div>
          )}
          {insights.data?.map((i) => (
            <Link
              key={i.id}
              to="/datasets/$datasetId"
              params={{ datasetId: i.dataset_id }}
              className="glass-card rounded-xl p-4 transition hover:border-primary/40"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {new Date(i.created_at).toLocaleString()} ·{" "}
                <span className="rounded bg-accent px-2 py-0.5 text-[10px]">
                  {i.chart_type ?? "text"}
                </span>
              </div>
              <div className="mt-1 font-medium">{i.question}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.insight_text}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = { BarChart3, LineChart, Line };
