import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, MessageSquare, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "InsightAI — Chat with your spreadsheets" },
      { name: "description", content: "Upload Excel or CSV files and get instant AI-powered insights, charts, and analysis through natural language." },
      { property: "og:title", content: "InsightAI — Chat with your spreadsheets" },
      { property: "og:description", content: "Upload Excel or CSV files and get instant AI-powered insights, charts, and analysis through natural language." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">InsightAI</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-24 md:py-32 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 text-xs text-muted-foreground mb-8">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            AI-native business intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Chat with your<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              spreadsheets.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Upload Excel or CSV files and explore them through natural language. InsightAI generates charts, surfaces patterns, and saves every insight automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base"><Link to="/auth">Start analyzing — free</Link></Button>
            <Button asChild size="lg" variant="outline" className="text-base"><Link to="/auth">Sign in</Link></Button>
          </div>
        </section>

        <section className="py-16 grid md:grid-cols-3 gap-6 border-t border-border/50">
          {[
            { icon: Upload, title: "Drop a file", body: "Upload .xlsx, .xls, or .csv. We detect columns and infer types automatically." },
            { icon: MessageSquare, title: "Ask anything", body: "Multiple named chat threads per dataset. Ask follow-ups, refine, explore." },
            { icon: BarChart3, title: "See charts", body: "Bar, line, pie, and scatter charts render inline as the AI answers." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-border/50 bg-card/50">
              <f.icon className="size-6 text-accent mb-4" />
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">
          © InsightAI — Built with Lovable.
        </div>
      </footer>
    </div>
  );
}
