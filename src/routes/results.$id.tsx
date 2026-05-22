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
    <div style={{backgroundColor: '#F4F6FB'}} className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm transition-smooth animate-slide-down" style={{color: '#4F46E5'}}>
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>

        {isLoading ? (
          <div className="mt-10 text-sm" style={{color: '#9AA3B8'}}>Loading…</div>
        ) : !data ? (
          <div className="mt-10 text-sm" style={{color: '#9AA3B8'}}>Submission not found.</div>
        ) : (
          <>
            <div className="mt-6 rounded-lg p-6 animate-slide-up" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
              <div className="text-xs uppercase tracking-wide font-semibold" style={{color: '#9AA3B8', letterSpacing: '0.05em'}}>Trust score</div>
              {r ? (
                <>
                  <div className="mt-4 flex items-end gap-4">
                    <div className="text-6xl font-bold" style={{color: '#0F172A', fontSize: '48px', fontFamily: "'Syne', sans-serif", fontWeight: '800'}}>{r.trust_score}</div>
                    <div className="pb-3"><RiskBadge level={r.risk_level as "low" | "medium" | "high"} /></div>
                  </div>
                  <div className="mt-6 h-2 w-full overflow-hidden rounded-full" style={{backgroundColor: '#E4E9F2'}}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${r.trust_score}%`,
                        backgroundColor: '#4F46E5',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm" style={{color: '#0F172A'}}>
                  Status: <span className="font-medium capitalize">{data.status}</span>
                </div>
              )}
            </div>

            {r && (
              <div className="mt-4 rounded-lg p-6 animate-slide-up delay-100" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
                <div className="text-xs uppercase tracking-wide font-semibold" style={{color: '#9AA3B8', letterSpacing: '0.05em'}}>Explanation</div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed" style={{color: '#0F172A'}}>{r.explanation}</p>
              </div>
            )}

            <div className="mt-4 rounded-lg p-6 animate-slide-up delay-200" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
              <div className="text-xs uppercase tracking-wide font-semibold" style={{color: '#9AA3B8', letterSpacing: '0.05em'}}>Submitted text</div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed" style={{color: '#0F172A'}}>{data.input_text}</p>
              <div className="mt-4 text-xs" style={{color: '#9AA3B8'}}>{new Date(data.created_at).toLocaleString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
