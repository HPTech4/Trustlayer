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
    <div style={{backgroundColor: '#F4F6FB'}} className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between animate-slide-down">
          <div>
            <h1 className="text-3xl font-bold" style={{color: '#0F172A', fontFamily: "'Syne', sans-serif"}}>Dashboard</h1>
            <p className="mt-2 text-sm" style={{color: '#9AA3B8'}}>Overview of your trust analyses</p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105"
            style={{backgroundColor: '#4F46E5'}}
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
          <h2 className="text-sm font-semibold animate-slide-down" style={{color: '#9AA3B8', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Recent activity</h2>
          <div className="mt-3 overflow-hidden rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
            {(data?.subs.length ?? 0) === 0 ? (
              <div className="p-10 text-center text-sm" style={{color: '#9AA3B8'}}>
                No submissions yet.{" "}
                <Link to="/submit" className="font-medium transition-smooth" style={{color: '#4F46E5'}}>Create your first one →</Link>
              </div>
            ) : (
              <ul className="divide-y" style={{borderColor: '#E4E9F2'}}>
                {data!.subs.map((s, idx) => {
                  const r = resultByIdx.get(s.id);
                  return (
                    <li key={s.id} className={`animate-slide-up delay-${Math.min(idx, 4) * 100}`}>
                      <Link
                        to="/results/$id"
                        params={{ id: s.id }}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-smooth"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8F9FC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm" style={{color: '#0F172A', fontWeight: '500'}}>{s.input_text.slice(0, 100)}</div>
                          <div className="mt-1 text-xs" style={{color: '#9AA3B8'}}>
                            {new Date(s.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
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
      className="rounded-full px-2 py-0.5 text-xs font-medium" 
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

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div 
      className="rounded-lg p-5 animate-slide-up transition-smooth" 
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E9F2',
        borderRadius: '12px'
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{color: '#9AA3B8', textTransform: 'uppercase', letterSpacing: '0.05em'}}>{label}</span>
        <Icon className="h-4 w-4" style={{color: '#4F46E5'}} />
      </div>
      <div className="mt-3 text-2xl font-bold" style={{color: '#0F172A', fontSize: '28px', fontFamily: "'Syne', sans-serif", fontWeight: '800'}}>{value}</div>
    </div>
  );
}
