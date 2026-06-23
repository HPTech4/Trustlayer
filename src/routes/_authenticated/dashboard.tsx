import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Activity, CheckCircle2, Clock, TrendingUp, ArrowRight, Inbox } from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: subs } = await supabase
        .from("submissions")
        .select("id,status,created_at,input_text")
        .eq("user_id", user?.id!)
        .order("created_at", { ascending: false })
        .limit(5);

      const submissionIds = (subs ?? []).map((s) => s.id);

      const { data: results } =
        submissionIds.length > 0
          ? await supabase
              .from("results")
              .select("trust_score,risk_level,submission_id")
              .in("submission_id", submissionIds)
          : { data: [] };

      // Total counts for risk breakdown (not just the last 5)
      const { count: totalCount } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id!);

      const { data: allResults } = await supabase
        .from("results")
        .select("risk_level, submission_id, submissions!inner(user_id)")
        .eq("submissions.user_id", user?.id!);

      return {
        subs: subs ?? [],
        results: results ?? [],
        totalCount: totalCount ?? 0,
        allResults: allResults ?? [],
      };
    },
  });

  const total = data?.totalCount ?? 0;
  const completed = data?.subs.filter((s) => s.status === "completed").length ?? 0;
  const pending = data?.subs.filter((s) => s.status === "pending").length ?? 0;
  const avgScore = data?.results.length
    ? Math.round(data.results.reduce((a, r) => a + r.trust_score, 0) / data.results.length)
    : null;

  const resultById = new Map(data?.results.map((r) => [r.submission_id, r]) ?? []);

  const riskCounts = { low: 0, medium: 0, high: 0 };
  data?.allResults.forEach((r) => {
    const level = r.risk_level as "low" | "medium" | "high";
    if (level in riskCounts) riskCounts[level]++;
  });
  const riskTotal = riskCounts.low + riskCounts.medium + riskCounts.high;

  return (
    <div style={{ backgroundColor: "var(--background)" }} className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-down">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Overview of your trust analyses
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105"
            style={{ backgroundColor: "var(--primary)" }}
          >
            New submission <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={Activity} label="Total submissions" value={total} loading={isLoading} />
          <Stat icon={CheckCircle2} label="Completed" value={completed} loading={isLoading} />
          <Stat icon={Clock} label="Pending" value={pending} loading={isLoading} />
          <Stat icon={TrendingUp} label="Avg. trust score" value={avgScore} loading={isLoading} mono />
        </div>

        {/* Risk breakdown */}
        {!isLoading && riskTotal > 0 && (
          <div
            className="mt-6 rounded-lg p-5 animate-slide-up"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Risk breakdown
              </span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {riskTotal} analyzed
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
              {riskCounts.low > 0 && (
                <div
                  style={{ width: `${(riskCounts.low / riskTotal) * 100}%`, backgroundColor: "var(--risk-low)" }}
                />
              )}
              {riskCounts.medium > 0 && (
                <div
                  style={{ width: `${(riskCounts.medium / riskTotal) * 100}%`, backgroundColor: "var(--risk-medium)" }}
                />
              )}
              {riskCounts.high > 0 && (
                <div
                  style={{ width: `${(riskCounts.high / riskTotal) * 100}%`, backgroundColor: "var(--risk-high)" }}
                />
              )}
            </div>
            <div className="mt-3 flex gap-5 text-xs">
              <LegendDot color="var(--risk-low)" label="Low" count={riskCounts.low} />
              <LegendDot color="var(--risk-medium)" label="Medium" count={riskCounts.medium} />
              <LegendDot color="var(--risk-high)" label="High" count={riskCounts.high} />
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="mt-10">
          <div className="flex items-center justify-between animate-slide-down">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              Recent activity
            </h2>
            {total > 5 && (
              <Link to="/history" className="text-sm font-medium transition-smooth" style={{ color: "var(--primary)" }}>
                View all →
              </Link>
            )}
          </div>

          <div
            className="mt-3 overflow-hidden rounded-lg"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            {isLoading ? (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (data?.subs.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <Inbox className="h-8 w-8" style={{ color: "var(--muted)" }} />
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No submissions yet.
                </p>
                <Link
                  to="/submit"
                  className="text-sm font-medium transition-smooth"
                  style={{ color: "var(--primary)" }}
                >
                  Create your first one →
                </Link>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {data!.subs.map((s, idx) => {
                  const r = resultById.get(s.id);
                  return (
                    <li key={s.id} className={`animate-slide-up delay-${Math.min(idx, 4) * 100}`}>
                      <Link
                        to="/results/$id"
                        params={{ id: s.id }}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-smooth hover:bg-[var(--accent-light)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.input_text.slice(0, 100)}</div>
                          <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(s.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {r ? (
                            <>
                              <span className="data-mono text-sm">{r.trust_score}</span>
                              <RiskBadge level={r.risk_level as "low" | "medium" | "high"} />
                            </>
                          ) : (
                            <StatusBadge status={s.status} />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label} ({count})
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "var(--status-pending-bg)", text: "var(--status-pending)", border: "var(--status-pending-border)" },
    completed: { bg: "var(--status-completed-bg)", text: "var(--status-completed)", border: "var(--status-completed-border)" },
    failed: { bg: "var(--status-failed-bg)", text: "var(--status-failed)", border: "var(--status-failed-border)" },
  };

  const style = styles[status] || styles["pending"];

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, borderRadius: "20px" }}
    >
      {status}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  mono = false,
}: {
  icon: typeof Activity;
  label: string;
  value: number | null;
  loading: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-5 animate-slide-up transition-smooth"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          {label}
        </span>
        <Icon className="h-4 w-4" style={{ color: "var(--primary)" }} />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-12" />
      ) : (
        <div className={`mt-3 text-2xl ${mono ? "data-mono" : "font-bold"}`} style={{ fontSize: "28px" }}>
          {value === null ? "—" : value}
        </div>
      )}
    </div>
  );
}