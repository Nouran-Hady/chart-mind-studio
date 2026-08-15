// Client-safe markdown chunking used by both the ingestion preview and the server pipeline.

export interface Chunk {
  index: number;
  section: string;
  content: string;
  tokenEstimate: number;
}

export const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

/** Split markdown on headings, then pack/split sections into ~maxChars chunks. */
export function chunkMarkdown(markdown: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 3200;
  const overlap = options.overlapChars ?? 200;
  const lines = markdown.split("\n");

  const sections: { title: string; body: string[] }[] = [];
  let current = { title: "Introduction", body: [] as string[] };
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (current.body.join("\n").trim() || sections.length === 0) sections.push(current);
      current = { title: m[2].trim() || "Untitled", body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  const chunks: Chunk[] = [];
  let index = 0;
  for (const section of sections) {
    const text = `${section.title === "Introduction" && !section.body.length ? "" : ""}${section.body.join("\n")}`.trim();
    if (!text) continue;
    const withHeading = `## ${section.title}\n\n${text}`;
    if (withHeading.length <= maxChars) {
      chunks.push({
        index: index++,
        section: section.title,
        content: withHeading,
        tokenEstimate: estimateTokens(withHeading),
      });
      continue;
    }
    let start = 0;
    while (start < text.length) {
      const slice = text.slice(start, start + maxChars);
      const content = `## ${section.title}\n\n${slice}`;
      chunks.push({
        index: index++,
        section: section.title,
        content,
        tokenEstimate: estimateTokens(content),
      });
      if (start + maxChars >= text.length) break;
      start += maxChars - overlap;
    }
  }
  return chunks;
}
