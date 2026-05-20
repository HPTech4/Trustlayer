import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Activity, CheckCircle2, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: subs }, { data: results }] = await Promise.all([
        supabase.from("submissions").select("id,status,created_at,input_text").eq("user_id", user?.id!).order("created_at", { ascending: false }).limit(5),
        supabase.from("results").select("trust_score,risk_level,submission_id").order("submission_id", { foreignTable: "submissions", ascending: false }).limit(5),
      ]);
      return { subs: subs ?? [], results: results ?? [] };
    },
  });

  const total = data?.subs.length ?? 0;
  const completed = data?.results.length ?? 0;
  const pending = (data?.subs.filter((s) => s.status === "pending").length) ?? 0;
  const avgScore = data?.results.length
    ? Math.round(data.results.reduce((a, r) => a + r.trust_score, 0) / data.results.length)
    : null;

  const resultByIdx = new Map(data?.results.map((r) => [r.submission_id, r]) ?? []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your trust analyses.</p>
        </div>
        <Link
          to="/submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New submission <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Activity} label="Recent submissions" value={isLoading ? "—" : String(total)} />
        <Stat icon={CheckCircle2} label="Completed" value={isLoading ? "—" : String(completed)} />
        <Stat icon={Clock} label="Pending" value={isLoading ? "—" : String(pending)} />
        <Stat icon={TrendingUp} label="Avg. trust score" value={avgScore === null ? "—" : `${avgScore}`} />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-foreground/80">Recent activity</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {(data?.subs.length ?? 0) === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No submissions yet.{" "}
              <Link to="/submit" className="font-medium text-primary hover:underline">Create your first one →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data!.subs.map((s) => {
                const r = resultByIdx.get(s.id);
                return (
                  <li key={s.id}>
                    <Link
                      to="/results/$id"
                      params={{ id: s.id }}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">{s.input_text.slice(0, 100)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {r ? (
                          <>
                            <span className="text-sm font-semibold tabular-nums">{r.trust_score}</span>
                            <RiskBadge level={r.risk_level as "low" | "medium" | "high"} />
                          </>
                        ) : (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                            {s.status}
                          </span>
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
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
