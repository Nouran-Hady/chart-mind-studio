// Vector storage abstraction. The rest of the app talks to VectorStore only —
// swapping Pinecone for another backend means adding an implementation here.

export interface VectorMetadata {
  document_id: string;
  document_name: string;
  document_version: number;
  chunk_id: string;
  chunk_index: number;
  section: string;
  source_type: string;
  created_at: string;
  status: string;
  user_id: string;
  text: string;
  [key: string]: string | number | boolean;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata: Partial<VectorMetadata>;
}

export interface VectorStore {
  readonly provider: string;
  readonly indexName: string;
  readonly namespace: string;
  upsert(records: VectorRecord[]): Promise<number>;
  query(params: {
    vector: number[];
    topK: number;
    filter?: Record<string, unknown>;
  }): Promise<VectorMatch[]>;
  deleteByIds(ids: string[]): Promise<void>;
  stats(): Promise<{ namespaceVectorCount: number; totalVectorCount: number; dimension: number }>;
}

const PINECONE_API_VERSION = "2025-04";

class PineconeStore implements VectorStore {
  readonly provider = "pinecone";
  private host: string | null = null;

  constructor(
    private apiKey: string,
    readonly indexName: string,
    readonly namespace: string,
  ) {}

  private async getHost(): Promise<string> {
    if (this.host) return this.host;
    const res = await fetch(`https://api.pinecone.io/indexes/${this.indexName}`, {
      headers: { "Api-Key": this.apiKey, "X-Pinecone-API-Version": PINECONE_API_VERSION },
    });
    if (!res.ok) {
      throw new Error(
        `Pinecone index "${this.indexName}" could not be reached (${res.status}). Check PINECONE_INDEX_NAME and PINECONE_API_KEY.`,
      );
    }
    const json = (await res.json()) as { host?: string };
    if (!json.host) throw new Error("Pinecone index has no host yet — it may still be initializing.");
    this.host = `https://${json.host}`;
    return this.host;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const host = await this.getHost();
    const res = await fetch(`${host}${path}`, {
      method: "POST",
      headers: {
        "Api-Key": this.apiKey,
        "Content-Type": "application/json",
        "X-Pinecone-API-Version": PINECONE_API_VERSION,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinecone ${path} failed (${res.status}): ${text.slice(0, 400)}`);
    }
    return (await res.json()) as T;
  }

  async upsert(records: VectorRecord[]): Promise<number> {
    let total = 0;
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const out = await this.call<{ upsertedCount?: number }>("/vectors/upsert", {
        vectors: batch,
        namespace: this.namespace,
      });
      total += out.upsertedCount ?? batch.length;
    }
    return total;
  }

  async query(params: { vector: number[]; topK: number; filter?: Record<string, unknown> }) {
    const out = await this.call<{ matches?: VectorMatch[] }>("/query", {
      vector: params.vector,
      topK: params.topK,
      namespace: this.namespace,
      includeMetadata: true,
      ...(params.filter ? { filter: params.filter } : {}),
    });
    return out.matches ?? [];
  }

  async deleteByIds(ids: string[]) {
    if (!ids.length) return;
    const batchSize = 200;
    for (let i = 0; i < ids.length; i += batchSize) {
      await this.call("/vectors/delete", {
        ids: ids.slice(i, i + batchSize),
        namespace: this.namespace,
      });
    }
  }

  async stats() {
    const out = await this.call<{
      namespaces?: Record<string, { vectorCount?: number }>;
      totalVectorCount?: number;
      dimension?: number;
    }>("/describe_index_stats", {});
    return {
      namespaceVectorCount: out.namespaces?.[this.namespace]?.vectorCount ?? 0,
      totalVectorCount: out.totalVectorCount ?? 0,
      dimension: out.dimension ?? 0,
    };
  }
}

export function getVectorStoreConfig() {
  return {
    provider: "pinecone",
    indexName: process.env["PINECONE_INDEX_NAME"] ?? "",
    namespace: process.env["PINECONE_NAMESPACE"] || "default",
    configured: Boolean(process.env["PINECONE_API_KEY"] && process.env["PINECONE_INDEX_NAME"]),
  };
}

/** Factory — call inside a server handler, never at module scope. */
export function getVectorStore(): VectorStore {
  const apiKey = process.env["PINECONE_API_KEY"];
  const indexName = process.env["PINECONE_INDEX_NAME"];
  const namespace = process.env["PINECONE_NAMESPACE"] || "default";
  if (!apiKey || !indexName) {
    throw new Error(
      "Vector store is not configured. Set PINECONE_API_KEY and PINECONE_INDEX_NAME in the backend environment.",
    );
  }
  return new PineconeStore(apiKey, indexName, namespace);
}
