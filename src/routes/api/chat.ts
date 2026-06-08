import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are InsightAI, a senior data analyst built into a self-serve BI tool.

You answer questions about a user's tabular dataset (loaded from Excel/CSV).

Rules:
- Be concise and insight-driven. Lead with the answer, then a short explanation.
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

        const rowsForContext = Array.isArray(dataset.full_rows)
          ? (dataset.full_rows as unknown[]).slice(0, 500)
          : [];

        const datasetContext = `Dataset: "${dataset.name}" (${dataset.row_count} rows × ${dataset.column_count} cols)
Schema: ${JSON.stringify(dataset.schema_json)}
Rows (first ${rowsForContext.length} of ${dataset.row_count}):
${JSON.stringify(rowsForContext)}`;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText =
          lastUserMessage?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join("") ?? "";

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
              const rows: Array<{
                thread_id: string;
                user_id: string;
                role: string;
                message: UIMessage;
              }> = [];
              if (lastUser) {
                rows.push({ thread_id: threadId, user_id: userId, role: "user", message: lastUser });
              }
              if (lastAssistant) {
                rows.push({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  message: lastAssistant,
                });
              }
              if (rows.length) {
                await supabaseAdmin.from("chat_messages").insert(rows);
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
                    chart_config: chartConfig ?? null,
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
