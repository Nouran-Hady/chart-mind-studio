import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Send,
  Sparkles,
  StopCircle,
  User as UserIcon,
  Pin,
  Printer,
} from "lucide-react";
import { pinChart } from "@/lib/pinned.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getThreadMessages, getDataset } from "@/lib/datasets.functions";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({ meta: [{ title: "Chat — InsightAI" }] }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Summarize this dataset in 3 bullets.",
  "What are the top 10 values in the most interesting column?",
  "Show a bar chart of counts grouped by category.",
  "Are there any anomalies or outliers?",
];

function ChatPage() {
  const { threadId } = Route.useParams();
  const getMsgs = useServerFn(getThreadMessages);
  const getDs = useServerFn(getDataset);

  // Load thread to find dataset_id (we need it for the chat body).
  const threadInfo = useQuery({
    queryKey: ["thread-info", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id,dataset_id,title")
        .eq("id", threadId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const datasetId = threadInfo.data?.dataset_id;

  const ds = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => getDs({ data: { id: datasetId! } }),
    enabled: !!datasetId,
  });

  const history = useQuery({
    queryKey: ["thread-msgs", threadId],
    queryFn: () => getMsgs({ data: { threadId } }),
  });

  if (history.isLoading || threadInfo.isLoading || !datasetId) {
    return <div className="grid h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <ChatInner
      threadId={threadId}
      datasetId={datasetId}
      datasetName={ds.data?.name ?? "dataset"}
      initialMessages={(history.data as unknown as UIMessage[]) ?? []}
    />
  );
}

function ChatInner({
  threadId,
  datasetId,
  datasetName,
  initialMessages,
}: {
  threadId: string;
  datasetId: string;
  datasetName: string;
  initialMessages: UIMessage[];
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { datasetId, threadId },
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [datasetId, threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => console.error("chat error", e),
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto]">
      <header className="flex items-center justify-between border-b border-border bg-card/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/datasets/$datasetId"
            params={{ datasetId }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dataset
          </Link>
          <span className="text-muted-foreground">·</span>
          <div className="font-medium">{datasetName}</div>
        </div>
        <div className="flex items-center gap-2">
          {busy && (
            <button
              onClick={() => stop()}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <StopCircle className="h-3.5 w-3.5" /> Stop
            </button>
          )}
          <Link
            to="/board/$datasetId"
            params={{ datasetId }}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pin className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Printer className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="overflow-y-auto print:overflow-visible">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          <div className="hidden print:block">
            <h1 className="font-display text-2xl font-semibold">{datasetName}</h1>
            <p className="text-sm text-muted-foreground">Exported {new Date().toLocaleString()}</p>
          </div>
          {messages.length === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold">
                  Ask anything about {datasetName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Natural language → analysis, queries, and charts.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="glass-card rounded-xl p-3 text-left text-sm transition hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}

          {busy && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Thinking…
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card/40 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask a question about your data…"
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Message({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  const isUser = message.role === "user";

  // Extract chart block(s)
  const charts: Array<unknown> = [];
  const cleaned = text.replace(/```chart\s*([\s\S]*?)```/g, (_, json) => {
    try {
      charts.push(JSON.parse(json.trim()));
    } catch {
      /* ignore */
    }
    return "";
  });

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className={`min-w-0 max-w-[85%] space-y-3 ${isUser ? "" : "flex-1"}`}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {text}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-primary">
            <ReactMarkdown>{cleaned}</ReactMarkdown>
          </div>
        )}
        {charts.map((c, i) => (
          <ChartBlock key={i} config={c} />
        ))}
      </div>
      {isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

type ChartConfig = {
  type: "bar" | "line" | "pie" | "scatter" | "histogram";
  title?: string;
  xKey?: string;
  yKey?: string;
  data: Array<Record<string, unknown>>;
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ChartBlock({ config }: { config: unknown }) {
  const c = config as ChartConfig;
  if (!c || !Array.isArray(c.data)) return null;
  const xKey = c.xKey ?? "label";
  const yKey = c.yKey ?? "value";

  return (
    <div className="glass-card rounded-xl p-4">
      {c.title && <div className="mb-3 text-sm font-medium">{c.title}</div>}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {c.type === "line" ? (
            <LineChart data={c.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey={yKey} stroke="var(--chart-1)" strokeWidth={2} />
            </LineChart>
          ) : c.type === "pie" ? (
            <PieChart>
              <Pie data={c.data} dataKey={yKey} nameKey={xKey} outerRadius={100} label>
                {c.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </PieChart>
          ) : c.type === "scatter" ? (
            <ScatterChart>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey={xKey} stroke="var(--muted-foreground)" />
              <YAxis dataKey={yKey} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Scatter data={c.data} fill="var(--chart-2)" />
            </ScatterChart>
          ) : (
            <BarChart data={c.data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Bar dataKey={yKey} fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
