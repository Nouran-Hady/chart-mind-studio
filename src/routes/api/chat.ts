import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are InsightAI, a senior data analyst built into a self-serve BI tool.

You answer questions about a user's tabular dataset (loaded from Excel/CSV).

Rules:
- Be concise and insight-driven. Lead with the answer, then a short explanation.
- Exact counts/totals/top-N must come from EXACT AGGREGATES or REQUEST-SPECIFIC EXACT CALCULATION, never from sample rows or estimation.
- When useful, include a Pandas-style pseudo-query in a fenced \`\`\`pandas block for transparency.
- When a visualization would help, append a SINGLE fenced JSON block tagged \`chart\` describing the chart:
  \`\`\`chart
  {
    "type": "bar" | "line" | "pie" | "scatter" | "histogram",
    "title": "...",
    "xKey": "columnName",
    "yKey": "columnName",
    "data": [{ "label": "...", "value": 123 }, ...]
  }
  \`\`\`
  Compute aggregate data yourself from the rows provided. Limit chart data to <= 20 points (top-N or bucketed).
- If the user's question can't be answered from the dataset, say so plainly and suggest what's missing.
- Use markdown for formatting. No greetings or filler.
`;

type ChatBody = { messages?: UIMessage[]; datasetId?: string; threadId?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatBody;
        const { messages, datasetId, threadId } = body;
        if (!Array.isArray(messages) || !datasetId || !threadId) {
          return new Response("messages, datasetId, threadId are required", { status: 400 });
        }

        // Verify user owns dataset via RLS-scoped client.
        const url = process.env.SUPABASE_URL!;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const { data: dataset, error: dsErr } = await userClient
          .from("datasets")
          .select("id,name,schema_json,sample_rows,full_rows,row_count,column_count")
          .eq("id", datasetId)
          .single();
        if (dsErr || !dataset) return new Response("Dataset not found", { status: 404 });

        const allRows = Array.isArray(dataset.full_rows)
          ? (dataset.full_rows as Record<string, unknown>[])
          : [];
        const rowsForContext = allRows.slice(0, 500);
        const schema = dataset.schema_json as ColumnLite[] | null;
        const stats = computeDatasetStats(allRows, schema);

        const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText =
          lastUserMessage?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join("") ?? "";
        const requestedExact = computeRequestedExactCalculations(lastUserText, allRows, schema);
        const deterministicAnswer = buildDeterministicAnswer(requestedExact, dataset.row_count);

        const datasetContext = `Dataset: "${dataset.name}" (${dataset.row_count} rows × ${dataset.column_count} cols)
Schema: ${JSON.stringify(dataset.schema_json)}

EXACT AGGREGATES (computed over ALL ${allRows.length} rows — use these for counts, sums, top-N, distributions; DO NOT estimate from the sample):
${JSON.stringify(stats)}

${requestedExact ? `REQUEST-SPECIFIC EXACT CALCULATION (authoritative; use these exact counts in the answer):\n${JSON.stringify(requestedExact)}\n` : ""}

Sample rows (first ${rowsForContext.length} of ${dataset.row_count}, for shape/context only — never derive counts or totals from this sample):
${JSON.stringify(rowsForContext)}`;

        if (deterministicAnswer) {
          return await createExactAnswerResponse({
            answer: deterministicAnswer,
            messages,
            threadId,
            userId,
            datasetId,
            lastUserText,
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: `${SYSTEM_PROMPT}\n\n${datasetContext}`,
          messages: await convertToModelMessages(messages),
          onError: ({ error }: { error: unknown }) => console.error("[chat] streamText error:", error),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              // Save only the last user message + assistant message (avoid duplicates).
              const lastUser = [...finalMessages].reverse().find((m) => m.role === "user");
              const lastAssistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
              const rows: Array<Record<string, unknown>> = [];
              if (lastUser) {
                rows.push({ thread_id: threadId, user_id: userId, role: "user", message: lastUser as unknown as object });
              }
              if (lastAssistant) {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  message: lastAssistant as unknown as object,
                });
              }
              if (rows.length) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                await supabaseAdmin.from("chat_messages").insert(rows as any);
                await supabaseAdmin
                  .from("chat_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);

                const assistantText =
                  lastAssistant?.parts
                    ?.map((p) => (p.type === "text" ? p.text : ""))
                    .join("") ?? "";
                const chartMatch = assistantText.match(/```chart\s*([\s\S]*?)```/);
                let chartType: string | undefined;
                let chartConfig: unknown;
                if (chartMatch) {
                  try {
                    chartConfig = JSON.parse(chartMatch[1].trim());
                    chartType = (chartConfig as { type?: string })?.type;
                  } catch {
                    /* ignore */
                  }
                }
                if (lastUserText) {
                  await supabaseAdmin.from("insights").insert({
                    user_id: userId,
                    dataset_id: datasetId,
                    thread_id: threadId,
                    question: lastUserText.slice(0, 1000),
                    insight_text: assistantText.slice(0, 8000),
                    chart_type: chartType,
                    chart_config: (chartConfig ?? null) as never,
                  });
                }
              }
            } catch (e) {
              console.error("[chat] persist error:", e);
            }
          },
        });
      },
    },
  },
});

// --- Exact aggregations over the full dataset -------------------------------
type ColumnLite = { name: string; type: "number" | "string" | "date" | "boolean" };
type RequestedExactCalculation = {
  operation: string;
  totalRowsUsed: number;
  groupColumn: string;
  countedColumn: string | null;
  top: Array<{ value: string; count: number }>;
  topOne: { value: string; count: number } | null;
  topOneShareOfRows: number | null;
};

async function createExactAnswerResponse({
  answer,
  messages,
  threadId,
  userId,
  datasetId,
  lastUserText,
}: {
  answer: string;
  messages: UIMessage[];
  threadId: string;
  userId: string;
  datasetId: string;
  lastUserText: string;
}) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const assistantMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: answer }],
  };
  await persistChatTurn({ lastUser, assistantMessage, threadId, userId, datasetId, lastUserText });

  const stream = createUIMessageStream<UIMessage>({
    originalMessages: messages,
    generateId: () => assistantMessage.id,
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: "exact-answer" });
      writer.write({ type: "text-delta", id: "exact-answer", delta: answer });
      writer.write({ type: "text-end", id: "exact-answer" });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

async function persistChatTurn({
  lastUser,
  assistantMessage,
  threadId,
  userId,
  datasetId,
  lastUserText,
}: {
  lastUser?: UIMessage;
  assistantMessage?: UIMessage;
  threadId: string;
  userId: string;
  datasetId: string;
  lastUserText: string;
}) {
  const rows: Array<Record<string, unknown>> = [];
  if (lastUser) rows.push({ thread_id: threadId, user_id: userId, role: "user", message: lastUser as unknown as object });
  if (assistantMessage) {
    rows.push({ thread_id: threadId, user_id: userId, role: "assistant", message: assistantMessage as unknown as object });
  }
  if (!rows.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabaseAdmin.from("chat_messages").insert(rows as any);
  await supabaseAdmin.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  if (lastUserText && assistantMessage) {
    const assistantText = assistantMessage.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    await supabaseAdmin.from("insights").insert({
      user_id: userId,
      dataset_id: datasetId,
      thread_id: threadId,
      question: lastUserText.slice(0, 1000),
      insight_text: assistantText.slice(0, 8000),
      chart_type: null,
      chart_config: null,
    });
  }
}

function computeDatasetStats(rows: Record<string, unknown>[], schema: ColumnLite[] | null) {
  if (!rows.length || !schema) return {};
  const out: Record<string, unknown> = { totalRows: rows.length };
  for (const col of schema) {
    const values = rows.map((r) => r[col.name]).filter((v) => v !== null && v !== undefined && v !== "");
    const missing = rows.length - values.length;
    if (col.type === "number") {
      const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (!nums.length) { out[col.name] = { type: "number", missing, count: 0 }; continue; }
      const sum = nums.reduce((a, b) => a + b, 0);
      const sorted = [...nums].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const valueCounts = countValues(values);
      out[col.name] = {
        type: "number",
        count: nums.length,
        missing,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        sum,
        mean: sum / nums.length,
        median,
        topValues: valueCounts.slice(0, 25).map(([value, count]) => ({ value, count })),
      };
    } else {
      // value_counts for low/medium cardinality (categorical, boolean, dates, ids)
      const sorted = countValues(values);
      out[col.name] = {
        type: col.type,
        count: values.length,
        missing,
        unique: sorted.length,
        topValues: sorted.slice(0, 25).map(([value, count]) => ({ value, count })),
      };
    }
  }
  return out;
}

function countValues(values: unknown[]) {
  const counts = new Map<string, number>();
  for (const v of values) {
    const k = String(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function buildDeterministicAnswer(exact: RequestedExactCalculation | null, declaredRowCount: number) {
  if (!exact?.topOne) return null;
  const share = exact.topOneShareOfRows === null ? null : (exact.topOneShareOfRows * 100).toFixed(1);
  const topRows = exact.top
    .map((r, i) => `${i + 1}. ${r.value}: ${r.count.toLocaleString()}`)
    .join("\n");
  const basis = exact.countedColumn
    ? `non-empty ${exact.countedColumn} records grouped by ${exact.groupColumn}`
    : `${exact.groupColumn} records`;
  return `${exact.groupColumn} ${exact.topOne.value} has the highest transaction count: **${exact.topOne.count.toLocaleString()}** ${basis}.${share ? ` That is **${share}%** of the ${declaredRowCount.toLocaleString()} rows in this dataset.` : ""}

Top ${exact.top.length}:
${topRows}

\`\`\`pandas
${exact.operation}
\`\`\``;
}

function computeRequestedExactCalculations(
  question: string,
  rows: Record<string, unknown>[],
  schema: ColumnLite[] | null,
) {
  if (!question || !rows.length || !schema?.length) return null;
  const q = question.toLowerCase();
  const asksForAtm = /\b(atm|atmid|terminal)\b/.test(q);
  const asksForCount = /(top|highest|most|count|number of|processed|transactions|value_counts|groupby)/.test(q);
  if (!asksForAtm || !asksForCount) return null;
  const groupColumn = findColumn(q, schema, ["ATMID", "ATM", "terminal"]);
  if (!groupColumn) return null;

  const countColumn = findColumn(q, schema, ["UTRNNO"]);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const groupValue = row[groupColumn.name];
    if (groupValue === null || groupValue === undefined || groupValue === "") continue;
    if (countColumn) {
      const countedValue = row[countColumn.name];
      if (countedValue === null || countedValue === undefined || countedValue === "") continue;
    }
    const key = String(groupValue);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));
  const topOne = top[0] ?? null;
  return {
    operation: countColumn
      ? `groupby('${groupColumn.name}')['${countColumn.name}'].count().sort_values(desc).head(10)`
      : `${groupColumn.name}.value_counts().head(10)`,
    totalRowsUsed: rows.length,
    groupColumn: groupColumn.name,
    countedColumn: countColumn?.name ?? null,
    top,
    topOne,
    topOneShareOfRows: topOne ? Number((topOne.count / rows.length).toFixed(6)) : null,
  };
}

function findColumn(questionLower: string, schema: ColumnLite[], hints: string[]) {
  const normalizedHints = hints.map((h) => h.toLowerCase());
  const exact = schema.find((c) => normalizedHints.includes(c.name.toLowerCase()));
  if (exact) return exact;
  return schema.find((c) => {
    const name = c.name.toLowerCase();
    return normalizedHints.some((h) => questionLower.includes(h) && name.includes(h));
  });
}

