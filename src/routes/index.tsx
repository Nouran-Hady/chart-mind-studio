import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Upload,
  MessageSquare,
  BarChart3,
  Wand2,
  Shield,
  Zap,
  Brain,
  Star,
  Quote,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Insight Weaver — Chat with your spreadsheets" },
      {
        name: "description",
        content:
          "Upload Excel or CSV files and weave instant AI-powered insights, charts, and stories from your data through natural language.",
      },
      { property: "og:title", content: "Insight Weaver — Chat with your spreadsheets" },
      {
        property: "og:description",
        content:
          "Upload Excel or CSV files and weave instant AI-powered insights, charts, and stories from your data through natural language.",
      },
    ],
  }),
  component: Landing,
});

const differentiators = [
  {
    icon: Brain,
    title: "Thinks in columns, answers in stories",
    body: "We don't just run a SQL query. Insight Weaver reasons across rows, spots the outlier, and writes the why — not just the what.",
  },
  {
    icon: Zap,
    title: "From upload to insight in 12 seconds",
    body: "Drop a 50k-row spreadsheet and the first chart renders before your coffee cools. No modeling, no setup, no waiting.",
  },
  {
    icon: Wand2,
    title: "Named threads, like a real notebook",
    body: "Branch a conversation per question. Pin the charts that matter to a board. Come back next week and your thinking is right where you left it.",
  },
  {
    icon: Shield,
    title: "Your data, your scope",
    body: "Datasets are scoped to your account with row-level security. Nothing trains a model. Nothing leaks across users.",
  },
];

const reviews = [
  {
    quote:
      "I replaced a 3-hour Monday morning ritual with a 4-minute chat. The chart it drew on its own caught a refund spike I'd been missing for weeks.",
    name: "Maya R.",
    role: "Ops Lead, DTC brand",
    rating: 5,
  },
  {
    quote:
      "Finally a BI tool that doesn't make me think in pivot tables. I just ask. It answers. It's almost rude how good it is.",
    name: "Daniel K.",
    role: "Solo founder",
    rating: 5,
  },
  {
    quote:
      "We onboarded our entire ops team in an afternoon. Zero training. People who'd never touched a spreadsheet were shipping insights by Friday.",
    name: "Priya S.",
    role: "Head of Data, Series A SaaS",
    rating: 5,
  },
  {
    quote:
      "The pinned-insights board is the killer feature nobody's talking about. It's our weekly review, auto-curated.",
    name: "Tom W.",
    role: "Growth analyst",
    rating: 5,
  },
];

const stats = [
  { value: "12s", label: "Median time to first chart" },
  { value: "50k+", label: "Rows handled per upload" },
  { value: "4.9/5", label: "Average user rating" },
  { value: "100%", label: "Data scoped to you" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/70 sticky top-0 z-20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-secondary to-accent grid place-items-center shadow-lg shadow-secondary/20">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Insight Weaver</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <a href="#different" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Why us</a>
            <a href="#about" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#reviews" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
            <a href="#pricing" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm" className="bg-secondary text-white hover:bg-secondary/90"><Link to="/auth">Start free</Link></Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative">
          {/* Decorative grid */}
          <div className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          </div>
          <div className="absolute top-20 -left-32 size-96 bg-secondary/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute top-40 -right-32 size-96 bg-accent/20 rounded-full blur-[120px] -z-10" />

          <div className="container mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-xs text-secondary font-medium mb-8">
                <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
                Now in early access — founder pricing live
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8">
                Weave insight<br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent">from raw cells.</span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 400 14" fill="none" preserveAspectRatio="none">
                    <path d="M2 9 Q 100 2, 200 7 T 398 5" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
                  </svg>
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                Drop in an Excel or CSV. Ask it anything in plain English. Get charts, patterns, and the story behind the numbers — instantly.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <Button asChild size="lg" className="text-base bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/25 group">
                  <Link to="/auth">
                    Start weaving — free
                    <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <a href="#different">See what's different</a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="size-4 fill-[#F59E0B] text-[#F59E0B]" />)}
                  <span className="ml-1 font-medium text-foreground">4.9</span>
                  <span>· from early users</span>
                </div>
                <div className="flex items-center gap-2"><Check className="size-4 text-[#10B981]" /> No credit card</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-[#10B981]" /> Setup in 30s</div>
              </div>
            </div>

            {/* Mock chat preview */}
            <div className="mt-20 max-w-4xl mx-auto">
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-secondary/10 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                  <span className="size-3 rounded-full bg-[#EF4444]/70" />
                  <span className="size-3 rounded-full bg-[#F59E0B]/70" />
                  <span className="size-3 rounded-full bg-[#10B981]/70" />
                  <span className="ml-3 text-xs text-muted-foreground font-mono">q3-sales.xlsx</span>
                </div>
                <div className="p-6 md:p-8 space-y-5">
                  <div className="flex justify-end">
                    <div className="max-w-md px-4 py-3 rounded-2xl rounded-tr-sm bg-secondary text-white text-sm">
                      Which region grew the fastest, and what drove it?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-xl px-4 py-3 rounded-2xl rounded-tl-sm bg-muted text-sm">
                      <p className="mb-3"><strong>APAC grew 47% QoQ</strong> — driven almost entirely by a new enterprise tier launched in week 6.</p>
                      <div className="h-24 flex items-end gap-2 px-1">
                        {[28, 35, 32, 48, 62, 71, 88].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-secondary to-accent" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Weekly revenue, APAC region · Q3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-border/50 bg-card/50">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-secondary to-accent bg-clip-text text-transparent">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT MAKES US DIFFERENT */}
        <section id="different" className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-2xl mb-16">
            <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">What makes us different</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Not another dashboard.<br />A thinking partner.
            </h2>
            <p className="text-lg text-muted-foreground">
              Most BI tools hand you a blank canvas and a steep learning curve. Insight Weaver hands you answers — and shows its work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {differentiators.map((d, i) => (
              <div
                key={d.title}
                className="group relative p-8 rounded-2xl border border-border bg-card hover:border-secondary/40 transition-all duration-300 hover:shadow-xl hover:shadow-secondary/5 hover:-translate-y-0.5"
              >
                <div className="absolute top-6 right-6 text-xs font-mono text-muted-foreground/40">0{i + 1}</div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-secondary/10 to-accent/10 grid place-items-center mb-5 group-hover:from-secondary group-hover:to-accent transition-all">
                  <d.icon className="size-5 text-secondary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2 tracking-tight">{d.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="container mx-auto px-6 py-20 border-t border-border/50">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">How it works</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Three steps. Zero setup.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { icon: Upload, step: "01", title: "Drop a file", body: ".xlsx, .xls, or .csv. We detect columns and infer types automatically." },
              { icon: MessageSquare, step: "02", title: "Ask anything", body: "Branch named chat threads per dataset. Ask follow-ups, refine, explore." },
              { icon: BarChart3, step: "03", title: "Pin what matters", body: "Bar, line, pie, scatter — render inline, pin to a board, export to PDF." },
            ].map((f) => (
              <div key={f.title} className="relative p-8 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border">
                <div className="text-6xl font-bold text-secondary/10 absolute top-4 right-6">{f.step}</div>
                <f.icon className="size-7 text-secondary mb-5 relative" />
                <h3 className="font-semibold text-lg mb-2 relative">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ABOUT US */}
        <section id="about" className="container mx-auto px-6 py-24 md:py-32 border-t border-border/50">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">About us</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Built by analysts<br />tired of being<br />the human ETL pipeline.
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We spent a combined decade in ops, finance, and growth teams — the kind of jobs where every Monday started by re-cleaning the same spreadsheet, every quarter ended with the same pivot table, and every "quick question" took forty-five minutes.
                </p>
                <p>
                  So we built the tool we wished existed: one that meets your data where it lives — in a messy Excel file — and gives you an answer, not homework.
                </p>
                <p className="text-foreground font-medium">
                  Insight Weaver is a small, independent team. No VC clock, no enterprise sales playbook. Just a product we'd bet our own time on.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-secondary via-accent to-secondary/60 p-1 shadow-2xl shadow-secondary/30">
                <div className="size-full rounded-[22px] bg-card p-8 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.1),transparent_50%)]" />
                  <Quote className="size-12 text-secondary/40 relative" />
                  <div className="relative">
                    <p className="text-xl md:text-2xl font-medium leading-snug tracking-tight mb-6">
                      "We're not trying to replace your analyst. We're trying to give every person on your team one."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-secondary to-accent" />
                      <div>
                        <div className="font-semibold text-sm">The Insight Weaver team</div>
                        <div className="text-xs text-muted-foreground">Berlin · Remote</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section id="reviews" className="container mx-auto px-6 py-24 border-t border-border/50">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <div className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Loved by early users</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Don't take our word for it.
            </h2>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className="size-5 fill-[#F59E0B] text-[#F59E0B]" />)}
              </div>
              <span className="font-semibold text-foreground">4.9 / 5</span>
              <span>· from our first 100 users</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {reviews.map((r, i) => (
              <div
                key={r.name}
                className={`p-8 rounded-2xl border border-border bg-card hover:shadow-xl hover:shadow-secondary/5 transition-all ${
                  i % 3 === 0 ? "md:translate-y-4" : ""
                }`}
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(r.rating)].map((_, j) => <Star key={j} className="size-4 fill-[#F59E0B] text-[#F59E0B]" />)}
                </div>
                <p className="text-lg leading-relaxed mb-6 text-foreground/90">"{r.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="size-10 rounded-full bg-gradient-to-br from-secondary/30 to-accent/30 grid place-items-center font-semibold text-secondary">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="container mx-auto px-6 py-24 border-t border-border/50">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/40 bg-accent/10 text-xs text-accent font-medium mb-4">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Founder pricing — first 10 users only
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Simple, founder-friendly pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when you're ready to unlock unlimited datasets and chats.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold text-lg mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-6">Try it out, no card required</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold tracking-tight">$0</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 text-sm mb-8">
                {["1 dataset", "20 AI messages / month", "Basic charts", "Community support"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 text-[#10B981] shrink-0" /> {f}</li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full"><Link to="/auth">Get started</Link></Button>
            </div>

            <div className="relative p-8 rounded-2xl border-2 border-secondary bg-gradient-to-br from-secondary/5 via-card to-accent/5 shadow-xl shadow-secondary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-secondary to-accent text-white text-xs font-semibold shadow-lg">
                40% OFF — limited
              </div>
              <h3 className="font-semibold text-lg mb-1">Pro</h3>
              <p className="text-sm text-muted-foreground mb-6">For analysts who need more</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-bold tracking-tight">$15</span>
                <span className="text-muted-foreground">/mo</span>
                <span className="text-lg text-muted-foreground line-through ml-2">$25</span>
              </div>
              <p className="text-xs text-secondary mb-6 font-medium">
                Founder price locked in for life — first 10 users only
              </p>
              <ul className="space-y-3 text-sm mb-8">
                {["Unlimited datasets", "Unlimited AI messages", "Auto insights & dashboards", "PDF export", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="size-4 text-[#10B981] shrink-0" /> {f}</li>
                ))}
              </ul>
              <Button asChild className="w-full bg-secondary text-white hover:bg-secondary/90"><Link to="/auth">Claim founder price</Link></Button>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container mx-auto px-6 py-24">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-secondary via-secondary to-accent p-12 md:p-20 text-center shadow-2xl shadow-secondary/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-5">
                Your next insight<br />is one upload away.
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Free forever for solo use. No card. No setup. Just answers.
              </p>
              <Button asChild size="lg" className="bg-white text-secondary hover:bg-white/90 text-base shadow-xl group">
                <Link to="/auth">
                  Start weaving — free
                  <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-gradient-to-br from-secondary to-accent grid place-items-center">
              <Sparkles className="size-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">Insight Weaver</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
