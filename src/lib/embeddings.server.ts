// Embedding generation through the Lovable AI Gateway (server-only).

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const out: number[][] = [];
  const batchSize = 64;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached — please retry in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
      throw new Error(`Embedding request failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    for (const d of json.data ?? []) out.push(d.embedding);
  }
  if (out.length !== texts.length) {
    throw new Error("Embedding provider returned an unexpected number of vectors.");
  }
  return out;
}
