import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDatasets, deleteDataset } from "@/lib/datasets.functions";
import { Database, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/datasets/")({
  head: () => ({ meta: [{ title: "Datasets — InsightAI" }] }),
  component: DatasetsList,
});

function DatasetsList() {
  const list = useServerFn(listDatasets);
  const del = useServerFn(deleteDataset);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["datasets"], queryFn: () => list() });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Dataset deleted");
      qc.invalidateQueries({ queryKey: ["datasets"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Datasets</h1>
          <p className="text-muted-foreground">All your uploaded files.</p>
        </div>
        <Link
          to="/upload"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Upload new
        </Link>
      </header>

      {isLoading && <div className="text-muted-foreground">Loading…</div>}
      {data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No datasets yet.
        </div>
      )}
      <div className="grid gap-3">
        {data?.map((d) => (
          <div key={d.id} className="glass-card flex items-center justify-between rounded-xl p-4">
            <Link
              to="/datasets/$datasetId"
              params={{ datasetId: d.id }}
              className="flex flex-1 items-center gap-4"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.filename} · {d.row_count.toLocaleString()} rows · {d.column_count} cols ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <button
              onClick={() => confirm(`Delete "${d.name}"?`) && remove.mutate(d.id)}
              className="ml-3 rounded-lg p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
