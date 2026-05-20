import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RiskBadge } from "@/components/risk-badge";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/results/$id")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["result", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, input_text, status, created_at, results(trust_score, risk_level, explanation)")
        .eq("id", id)
        .eq("user_id", user?.id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const r = data?.results ? (Array.isArray(data.results) ? data.results[0] : data.results) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>

        {isLoading ? (
          <div className="mt-10 text-sm text-muted-foreground">Loading…</div>
        ) : !data ? (
          <div className="mt-10 text-sm text-muted-foreground">Submission not found.</div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Trust score</div>
              {r ? (
                <>
                  <div className="mt-2 flex items-end gap-4">
                    <div className="text-6xl font-semibold tabular-nums">{r.trust_score}</div>
                    <div className="pb-2"><RiskBadge level={r.risk_level as "low" | "medium" | "high"} /></div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${r.trust_score}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  Status: <span className="font-medium capitalize">{data.status}</span>
                </div>
              )}
            </div>

            {r && (
              <div className="mt-4 rounded-xl border border-border bg-card p-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Explanation</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{r.explanation}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-border bg-card p-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Submitted text</div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.input_text}</p>
              <div className="mt-4 text-xs text-muted-foreground">{new Date(data.created_at).toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
