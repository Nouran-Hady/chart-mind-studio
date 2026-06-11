import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDataset } from "@/lib/datasets.functions";
import { listPinned, unpinChart } from "@/lib/pinned.functions";
import { ArrowLeft, Pin, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/board/$datasetId")({
  head: () => ({ meta: [{ title: "Dashboard — InsightAI" }] }),
  component: BoardPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function BoardPage() {
  const { datasetId } = Route.useParams();
  const getDs = useServerFn(getDataset);
  const list = useServerFn(listPinned);
  const unpin = useServerFn(unpinChart);
  const qc = useQueryClient();

  const ds = useQuery({ queryKey: ["dataset", datasetId], queryFn: () => getDs({ data: { id: datasetId } }) });
  const pins = useQuery({ queryKey: ["pinned", datasetId], queryFn: () => list({ data: { datasetId } }) });

  const removeMut = useMutation({
    mutationFn: (id: string) => unpin({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from board");
      qc.invalidateQueries({ queryKey: ["pinned", datasetId] });
    },
  });

  if (ds.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8 print:p-4">
      <div className="print:hidden">
        <Link to="/datasets/$datasetId" params={{ datasetId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dataset
        </Link>
      </div>

      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard · {ds.data?.name}</h1>
          <p className="text-muted-foreground">Pinned charts from your conversations.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary/40"
        >
          <Printer className="h-4 w-4" /> Export PDF
        </button>
      </header>

      {pins.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Pin className="mx-auto h-6 w-6" />
          <div className="mt-2">No pinned charts yet. Pin charts from any chat to build your dashboard.</div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {pins.data?.map((p) => {
          const cfg = p.chart_config as {
            type?: string; xKey?: string; yKey?: string;
            data?: Array<Record<string, unknown>>;
          };
          const xKey = cfg?.xKey ?? "label";
          const yKey = cfg?.yKey ?? "value";
          const data = cfg?.data ?? [];
          return (
            <div key={p.id} className="glass-card rounded-xl p-4 print:break-inside-avoid">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => removeMut.mutate(p.id)}
                  className="print:hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {cfg?.type === "line" ? (
                    <LineChart data={data}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey={xKey} stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                      <Line type="monotone" dataKey={yKey} stroke="var(--chart-1)" strokeWidth={2} />
                    </LineChart>
                  ) : cfg?.type === "pie" ? (
                    <PieChart>
                      <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={90} label>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    </PieChart>
                  ) : (
                    <BarChart data={data}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey={xKey} stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                      <Bar dataKey={yKey} fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              {p.note && <div className="mt-2 text-xs text-muted-foreground">{p.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
