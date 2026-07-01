import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, BrainCircuit, TrendingUp, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: submissions }, { data: results }] = await Promise.all([
        supabase
          .from("submissions")
          .select("id, created_at, status")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("results")
          .select("submission_id, trust_score, risk_level")
          .in(
            "submission_id",
            (await supabase
              .from("submissions")
              .select("id")
              .eq("user_id", user!.id)
              .limit(10)).data?.map((row) => row.id) ?? [],
          ),
      ]);

      return {
        submissions: submissions ?? [],
        results: results ?? [],
      };
    },
  });

  const completed = data?.submissions.filter((item) => item.status === "completed").length ?? 0;
  const pending = data?.submissions.filter((item) => item.status === "pending").length ?? 0;
  const avgScore =
    data?.results.length
      ? Math.round(
          data.results.reduce((sum, item) => sum + Number(item.trust_score), 0) / data.results.length,
        )
      : null;

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            Insights
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            A quick view of your recent review patterns and what the model is picking up.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InsightCard
            icon={BrainCircuit}
            title="Recent review activity"
            value={data?.submissions.length ?? 0}
            sub="submissions reviewed"
            loading={isLoading}
          />
          <InsightCard
            icon={TrendingUp}
            title="Average trust score"
            value={avgScore ?? "--"}
            sub="across recent results"
            loading={isLoading}
            mono
          />
          <InsightCard
            icon={ShieldAlert}
            title="Needs follow-up"
            value={pending}
            sub="submissions still pending"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--primary)" }} />
              <span className="form-label">What the model is prioritizing</span>
            </div>
            <div className="mt-4 space-y-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <p>TrustLayer is most sensitive to transaction history, unusual jurisdiction details, and sudden changes in entity context.</p>
              <p>In practice, that means a short note with strong context usually produces a more explainable and trustworthy score.</p>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: "var(--primary)" }} />
              <span className="form-label">Next best step</span>
            </div>
            <div className="mt-4">
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                Add more detail to your next submission to get clearer reasoning and a more confident result.
              </p>
              <Link
                to="/submit"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-smooth"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Try another submission <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Quick summary
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {completed} completed and {pending} pending analyses in your recent history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  value,
  sub,
  loading,
  mono = false,
}: {
  icon: typeof BrainCircuit;
  title: string;
  value: number | string;
  sub: string;
  loading: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: "var(--primary)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-20 rounded bg-slate-200/70" />
        ) : (
          <div className={`text-3xl font-semibold ${mono ? "data-mono" : ""}`} style={{ color: "var(--foreground)" }}>
            {value}
          </div>
        )}
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}
