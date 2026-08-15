import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkMarkdown } from "./chunking";
import { embedTexts } from "./embeddings.server";
import { getVectorStore, type VectorRecord } from "./vector/vector-store.server";

export interface ProgressStep {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

const STEPS: { key: string; label: string }[] = [
  { key: "validate", label: "Validating approved version" },
  { key: "chunk", label: "Chunking markdown" },
  { key: "embed", label: "Generating embeddings" },
  { key: "upsert", label: "Upserting vectors to Pinecone" },
  { key: "finalize", label: "Finalizing index metadata" },
];

export function initialSteps(): ProgressStep[] {
  return STEPS.map((s) => ({ ...s, status: "pending" as const }));
}

type DB = SupabaseClient<never, never, never>;

export async function runIngestion(
  supabase: DB,
  userId: string,
  documentId: string,
): Promise<{ chunks: number; vectors: number }> {
  const client = supabase as unknown as SupabaseClient;
  const steps = initialSteps();

  const setProgress = async (
    key: string,
    status: ProgressStep["status"],
    detail?: string,
    extra: Record<string, unknown> = {},
  ) => {
    const step = steps.find((s) => s.key === key);
    if (step) {
      step.status = status;
      step.detail = detail;
    }
    await client
      .from("documents")
      .update({ ingestion_progress: steps, ...extra })
      .eq("id", documentId);
  };

  try {
    await setProgress("validate", "running", undefined, {
      ingestion_status: "ingesting",
      ingestion_error: null,
    });

    const { data: doc, error: docErr } = await client
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Document not found");

    const { data: version, error: verErr } = await client
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .eq("status", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verErr) throw new Error(verErr.message);
    if (!version) throw new Error("No approved version to ingest. Approve the document first.");
    const markdown = String(version.markdown ?? "");
    if (!markdown.trim()) throw new Error("Approved version is empty.");
    await setProgress("validate", "done", `Version ${version.version}`);

    await setProgress("chunk", "running");
    const chunks = chunkMarkdown(markdown);
    if (!chunks.length) throw new Error("Chunking produced no content.");
    await setProgress("chunk", "done", `${chunks.length} chunks`);

    await setProgress("embed", "running", `0/${chunks.length}`);
    const vectors = await embedTexts(chunks.map((c) => c.content));
    await setProgress("embed", "done", `${vectors.length} embeddings`);

    await setProgress("upsert", "running");
    const store = getVectorStore();

    // Replace vectors from previous versions of this document.
    const { data: oldChunks } = await client
      .from("document_chunks")
      .select("vector_id")
      .eq("document_id", documentId);
    const oldIds = (oldChunks ?? []).map((c) => c.vector_id).filter(Boolean) as string[];
    if (oldIds.length) await store.deleteByIds(oldIds);
    await client.from("document_chunks").delete().eq("document_id", documentId);

    const createdAt = new Date().toISOString();
    const records: VectorRecord[] = chunks.map((c, i) => ({
      id: `${documentId}:v${version.version}:${c.index}`,
      values: vectors[i],
      metadata: {
        document_id: documentId,
        document_name: String(doc.name),
        document_version: Number(version.version),
        chunk_id: `${documentId}:v${version.version}:${c.index}`,
        chunk_index: c.index,
        section: c.section,
        source_type: String(doc.source_type ?? "upload"),
        created_at: createdAt,
        status: "approved",
        user_id: userId,
        text: c.content.slice(0, 3000),
      },
    }));
    const upserted = await store.upsert(records);
    await setProgress("upsert", "done", `${upserted} vectors`);

    await setProgress("finalize", "running");
    const { error: chunkErr } = await client.from("document_chunks").insert(
      chunks.map((c, i) => ({
        document_id: documentId,
        version_id: version.id,
        user_id: userId,
        document_version: version.version,
        chunk_index: c.index,
        section: c.section,
        content: c.content,
        token_estimate: c.tokenEstimate,
        vector_id: records[i].id,
      })),
    );
    if (chunkErr) throw new Error(chunkErr.message);

    await setProgress("finalize", "done", undefined, {
      ingestion_status: "ingested",
      chunk_count: chunks.length,
      vector_count: upserted,
      vector_index: store.indexName,
      vector_namespace: store.namespace,
      active_version: version.version,
    });

    return { chunks: chunks.length, vectors: upserted };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingestion failed";
    const running = steps.find((s) => s.status === "running");
    if (running) {
      running.status = "error";
      running.detail = message;
    }
    await client
      .from("documents")
      .update({
        ingestion_status: "failed",
        ingestion_error: message,
        ingestion_progress: steps,
      })
      .eq("id", documentId);
    throw new Error(message);
  }
}

export async function retrieveContext(
  userId: string,
  query: string,
  opts: { topK?: number; documentIds?: string[] } = {},
) {
  const [vector] = await embedTexts([query]);
  const store = getVectorStore();
  const filter: Record<string, unknown> = { user_id: userId };
  if (opts.documentIds?.length) filter.document_id = { $in: opts.documentIds };
  const matches = await store.query({ vector, topK: opts.topK ?? 6, filter });
  return matches.map((m) => ({
    id: m.id,
    score: m.score,
    text: String(m.metadata?.text ?? ""),
    documentName: String(m.metadata?.document_name ?? "Document"),
    section: String(m.metadata?.section ?? ""),
    version: Number(m.metadata?.document_version ?? 1),
  }));
}
