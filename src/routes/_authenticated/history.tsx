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
    <div style={{backgroundColor: '#F4F6FB'}} className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="animate-slide-down">
          <h1 className="text-3xl font-bold" style={{color: '#0F172A', fontFamily: "'Syne', sans-serif"}}>History</h1>
          <p className="mt-2 text-sm" style={{color: '#9AA3B8'}}>All your past submissions</p>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
          {isLoading ? (
            <div className="p-10 text-center text-sm" style={{color: '#9AA3B8'}}>Loading…</div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="p-10 text-center text-sm" style={{color: '#9AA3B8'}}>
              No submissions yet. <Link to="/submit" className="font-medium transition-smooth" style={{color: '#4F46E5'}}>Create one →</Link>
            </div>
          ) : (
            <ul className="divide-y" style={{borderColor: '#E4E9F2'}}>
              {data!.map((s, idx) => {
                const r = Array.isArray(s.results) ? s.results[0] : s.results;
                return (
                  <li key={s.id} className={`animate-slide-up delay-${Math.min(idx, 4) * 100}`}>
                    <Link
                      to="/results/$id"
                      params={{ id: s.id }}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-smooth rounded-lg"
                      style={{backgroundColor: '#FFFFFF', borderRadius: '10px'}}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8F9FC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm" style={{color: '#0F172A', fontWeight: '500'}}>{s.input_text.slice(0, 140)}</div>
                        <div className="mt-1 text-xs" style={{color: '#9AA3B8', fontSize: '12px'}}>{new Date(s.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {r ? (
                          <>
                            <span className="text-sm font-semibold tabular-nums" style={{color: '#0F172A'}}>{r.trust_score}</span>
                            <RiskBadge level={r.risk_level as "low" | "medium" | "high"} />
                          </>
                        ) : (
                          <Badge status={s.status} />
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

function Badge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'pending': { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
    'completed': { bg: '#F0FDF4', text: '#22C55E', border: '#BBF7D0' },
    'failed': { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' }
  };
  
  const style = styles[status] || styles['pending'];
  
  return (
    <span 
      className="rounded-full px-2 py-0.5 text-xs font-medium capitalize" 
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: '20px'
      }}
    >
      {status}
    </span>
  );
}
