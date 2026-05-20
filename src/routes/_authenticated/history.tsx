import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RiskBadge } from "@/components/risk-badge";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, input_text, status, created_at, results(trust_score, risk_level)")
        .eq("user_id", user?.id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">All your past submissions.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No submissions yet. <Link to="/submit" className="font-medium text-primary hover:underline">Create one →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data!.map((s) => {
              const r = Array.isArray(s.results) ? s.results[0] : s.results;
              return (
                <li key={s.id}>
                  <Link
                    to="/results/$id"
                    params={{ id: s.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{s.input_text.slice(0, 140)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {r ? (
                        <>
                          <span className="text-sm font-semibold tabular-nums">{r.trust_score}</span>
                          <RiskBadge level={r.risk_level as "low" | "medium" | "high"} />
                        </>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
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
  );
}
