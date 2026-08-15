// Client-side document extraction -> Markdown.
// Heavy parsers are dynamically imported so they never enter the SSR worker bundle.

export interface ExtractedDoc {
  markdown: string;
  raw: string;
  metadata: Record<string, unknown>;
}

const escapeCell = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

function rowsToMarkdownTable(rows: Record<string, unknown>[], limit = 200): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows
    .slice(0, limit)
    .map((r) => `| ${cols.map((c) => escapeCell(r[c])).join(" | ")} |`)
    .join("\n");
  const more = rows.length > limit ? `\n\n_${rows.length - limit} additional rows omitted._` : "";
  return `${head}\n${sep}\n${body}${more}`;
}

export async function extractDocument(file: File): Promise<ExtractedDoc> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, "");

  if (ext === "md" || ext === "markdown") {
    const raw = await file.text();
    return { markdown: raw, raw, metadata: { format: "markdown" } };
  }

  if (ext === "txt" || ext === "log") {
    const raw = await file.text();
    const markdown = `# ${base}\n\n${raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join("\n\n")}`;
    return { markdown, raw, metadata: { format: "text" } };
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.convertToMarkdown({ arrayBuffer: buf });
    const { value: text } = await mammoth.extractRawText({ arrayBuffer: buf });
    return { markdown: `# ${base}\n\n${value}`, raw: text, metadata: { format: "docx" } };
  }

  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    // Worker is loaded from the same package build via a module worker URL.
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(text);
    }
    const raw = pages.join("\n\n");
    const markdown = `# ${base}\n\n${pages
      .map((p, i) => `## Page ${i + 1}\n\n${p}`)
      .join("\n\n")}`;
    return { markdown, raw, metadata: { format: "pdf", pages: pdf.numPages } };
  }

  if (ext === "csv" || ext === "xlsx" || ext === "xls") {
    const { parseWorkbook } = await import("./dataset-utils");
    const wb = await parseWorkbook(file);
    const sections = wb.sheets.map((s) => {
      const stats = `- Rows: ${s.rowCount}\n- Columns: ${s.columnCount}\n- Missing values: ${s.missingValues}\n- Fields: ${s.schema
        .map((c) => `\`${c.name}\` (${c.type})`)
        .join(", ")}`;
      return `## ${s.sheetName}\n\n${stats}\n\n### Data\n\n${rowsToMarkdownTable(s.rows)}`;
    });
    const markdown = `# ${base}\n\n${sections.join("\n\n")}`;
    return {
      markdown,
      raw: markdown,
      metadata: {
        format: ext,
        sheets: wb.sheets.map((s) => ({
          name: s.sheetName,
          rows: s.rowCount,
          columns: s.columnCount,
        })),
      },
    };
  }

  // Fallback: treat as plain text
  const raw = await file.text();
  return { markdown: `# ${base}\n\n${raw}`, raw, metadata: { format: ext || "unknown" } };
}

export const SUPPORTED_DOC_EXTENSIONS = ".md,.markdown,.txt,.pdf,.docx,.csv,.xlsx,.xls";
