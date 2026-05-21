import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Zap, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">TrustLayer</span>
        </div>
        <Link to="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground">
          Sign in →
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-24 pb-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs text-accent-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Powered by Gemini 3 Flash
        </div>
        <h1 className="text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Score trust. Surface risk. Instantly.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
          Paste a description of a person, company, or transaction. TrustLayer returns a trust score, risk level, and a clear explanation in seconds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { icon: Zap, title: "Real-time scoring", desc: "Each submission is analyzed end-to-end in seconds." },
            { icon: Shield, title: "Explainable results", desc: "Every score comes with a clear, written rationale." },
            { icon: Lock, title: "Yours alone", desc: "Strict row-level security — only you see your data." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold">{f.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
