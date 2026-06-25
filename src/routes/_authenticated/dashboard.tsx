import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const RECENT_LIMIT = 5;

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// ─── Types ───────────────────────────────────────────────────────────────────
type RiskLevel = "low" | "medium" | "high";

interface DashboardData {
  recentSubs: {
    id: string;
    status: string;
    created_at: string;
    input_text: string;
  }[];
  recentResults: {
    trust_score: number;
    risk_level: string;
    submission_id: string;
  }[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  globalAvgScore: number | null;
  riskCounts: { low: number; medium: number; high: number };
  trendData: { date: string; score: number }[];
}

// ─── Main component ───────────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // ── All queries fire in parallel ──────────────────────────────────────
      const [
        recentSubsRes,
        totalCountRes,
        completedCountRes,
        pendingCountRes,
        riskCountsRes,
        trendRes,
      ] = await Promise.all([
        // Recent submissions for the activity list
        supabase
          .from("submissions")
          .select("id,status,created_at,input_text")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),

        // Total submissions count
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),

        // Completed count
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "completed"),

        // Pending count
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "pending"),

        // Risk breakdown via RPC — avoids fetching every row just to count.
        // Create this in Supabase with:
        //
        //   create or replace function get_risk_counts(uid uuid)
        //   returns table(risk_level text, cnt bigint) language sql as $$
        //     select r.risk_level, count(*) as cnt
        //     from results r
        //     join submissions s on s.id = r.submission_id
        //     where s.user_id = uid
        //     group by r.risk_level;
        //   $$;
        supabase.rpc("get_risk_counts", { uid: user!.id }),

        // 30-day daily avg trust score for the trend chart, via RPC.
        // Create this in Supabase with:
        //
        //   create or replace function get_trust_trend(uid uuid)
        //   returns table(day date, avg_score numeric) language sql as $$
        //     select date_trunc('day', s.created_at)::date as day,
        //            round(avg(r.trust_score)) as avg_score
        //     from results r
        //     join submissions s on s.id = r.submission_id
        //     where s.user_id = uid
        //       and s.created_at >= now() - interval '30 days'
        //     group by 1
        //     order by 1;
        //   $$;
        supabase.rpc("get_trust_trend", { uid: user!.id }),
      ]);

      const recentSubs = recentSubsRes.data ?? [];
      const submissionIds = recentSubs.map((s) => s.id);

      // Fetch results only for the visible recent rows
      const recentResultsRes =
        submissionIds.length > 0
          ? await supabase
              .from("results")
              .select("trust_score,risk_level,submission_id")
              .in("submission_id", submissionIds)
          : { data: [] };

      // Build risk counts from RPC result
      const riskCounts = { low: 0, medium: 0, high: 0 };
      (riskCountsRes.data ?? []).forEach(
        (row: { risk_level: string; cnt: number }) => {
          const lvl = row.risk_level as RiskLevel;
          if (lvl in riskCounts) riskCounts[lvl] = row.cnt;
        }
      );

      // Global avg score from all results visible to this user
      const allScores = (riskCountsRes.data ?? []) as {
        risk_level: string;
        cnt: number;
      }[];
      // We'll compute global avg from the trend data if available
      const trendRows = (trendRes.data ?? []) as {
        day: string;
        avg_score: number;
      }[];
      const globalAvgScore =
        trendRows.length > 0
          ? Math.round(
              trendRows.reduce((a, r) => a + Number(r.avg_score), 0) /
                trendRows.length
            )
          : null;

      const trendData = trendRows.map((r) => ({
        date: new Date(r.day).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        score: Math.round(Number(r.avg_score)),
      }));

      return {
        recentSubs,
        recentResults: recentResultsRes.data ?? [],
        totalCount: totalCountRes.count ?? 0,
        completedCount: completedCountRes.count ?? 0,
        pendingCount: pendingCountRes.count ?? 0,
        globalAvgScore,
        riskCounts,
        trendData,
      };
    },
  });

  // Derived values — all from accurate server-side counts
  const total = data?.totalCount ?? 0;
  const completed = data?.completedCount ?? 0;
  const pending = data?.pendingCount ?? 0;
  const avgScore = data?.globalAvgScore ?? null;
  const riskCounts = data?.riskCounts ?? { low: 0, medium: 0, high: 0 };
  const riskTotal = riskCounts.low + riskCounts.medium + riskCounts.high;
  const successRate =
    total > 0 ? Math.round((completed / total) * 100) : null;

  const resultById = new Map(
    (data?.recentResults ?? []).map((r) => [r.submission_id, r])
  );

  // Low trust score alert
  const showAlert = avgScore !== null && avgScore < 50;

  return (
    <div
      style={{ backgroundColor: "var(--background)" }}
      className="min-h-screen px-6 py-8"
    >
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Overview of your trust analyses
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-smooth hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--primary)" }}
          >
            New submission <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* ── Low-score alert banner ─────────────────────────────────────── */}
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium"
              style={{
                backgroundColor: "var(--risk-high-bg)",
                border: "1px solid var(--risk-high-border)",
                color: "var(--risk-high)",
              }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Your average trust score has dropped below 50 — review high-risk
              submissions.
              <Link
                to="/history"
                className="ml-auto underline underline-offset-2 font-semibold"
              >
                View submissions →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI cards ─────────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          variants={{
            show: { transition: { staggerChildren: 0.07 } },
          }}
          initial="hidden"
          animate="show"
        >
          <StatCard
            icon={Activity}
            label="Total submissions"
            value={total}
            loading={isLoading}
            accent="var(--primary)"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completed}
            loading={isLoading}
            sub={successRate !== null ? `${successRate}% success rate` : undefined}
            accent="var(--risk-low)"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={pending}
            loading={isLoading}
            accent="var(--risk-medium)"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg trust score"
            value={avgScore}
            loading={isLoading}
            mono
            accent="var(--primary)"
          />
        </motion.div>

        {/* ── Charts row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">

          {/* Trend area chart */}
          <motion.div
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="form-label">Trust score trend</span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                last 30 days
              </span>
            </div>

            {isLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (data?.trendData.length ?? 0) === 0 ? (
              <div
                className="flex h-[200px] items-center justify-center text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No trend data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={data!.trendData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e7a45" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1e7a45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9aaa9f", fontFamily: "Space Grotesk" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9aaa9f", fontFamily: "Space Grotesk" }}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "Space Grotesk",
                    }}
                    labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
                    itemStyle={{
                      color: "var(--primary)",
                      fontFamily: "JetBrains Mono",
                      fontWeight: 700,
                    }}
                    formatter={(v: number) => [v, "Trust score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#1e7a45"
                    strokeWidth={2}
                    fill="url(#trustGradient)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#1e7a45",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Gauge + risk breakdown */}
          <motion.div
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
          >
            <span className="form-label block mb-4">Avg trust score</span>

            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-[160px] w-[160px] rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <TrustGauge score={avgScore ?? 0} />
            )}

            {/* Risk breakdown bars */}
            {!isLoading && riskTotal > 0 && (
              <div className="mt-5 space-y-3">
                <RiskBar
                  label="Low"
                  count={riskCounts.low}
                  total={riskTotal}
                  color="var(--risk-low)"
                  bg="var(--risk-low-bg)"
                />
                <RiskBar
                  label="Medium"
                  count={riskCounts.medium}
                  total={riskTotal}
                  color="var(--risk-medium)"
                  bg="var(--risk-medium-bg)"
                />
                <RiskBar
                  label="High"
                  count={riskCounts.high}
                  total={riskTotal}
                  color="var(--risk-high)"
                  bg="var(--risk-high-bg)"
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Recent activity ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="form-label">Recent activity</span>
            {total > RECENT_LIMIT && (
              <Link
                to="/history"
                className="text-sm font-medium transition-smooth"
                style={{ color: "var(--primary)" }}
              >
                View all →
              </Link>
            )}
          </div>

          <div
            className="overflow-hidden rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {isError ? (
              <div
                className="flex flex-col items-center gap-2 p-12 text-center text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                <AlertTriangle
                  className="h-6 w-6"
                  style={{ color: "var(--risk-high)" }}
                />
                Failed to load submissions. Refresh to try again.
              </div>
            ) : isLoading ? (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (data?.recentSubs.length ?? 0) === 0 ? (
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
                <AnimatePresence initial={false}>
                  {data!.recentSubs.map((s, idx) => {
                    const r = resultById.get(s.id);
                    return (
                      <motion.li
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                      >
                        <Link
                          to="/results/$id"
                          params={{ id: s.id }}
                          className="flex items-center justify-between gap-4 px-5 py-4 transition-smooth hover:bg-[var(--accent-light)]"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-medium"
                              title={s.input_text}
                            >
                              {s.input_text.slice(0, 100)}
                              {s.input_text.length > 100 ? "…" : ""}
                            </div>
                            <div
                              className="mt-1 text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {new Date(s.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {r ? (
                              <>
                                <span className="data-mono text-sm">
                                  {r.trust_score}
                                </span>
                                <RiskBadge
                                  level={r.risk_level as RiskLevel}
                                />
                              </>
                            ) : (
                              <StatusBadge status={s.status} />
                            )}
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── TrustGauge ──────────────────────────────────────────────────────────────
function TrustGauge({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 160 * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = 80, cy = 90, r = 60;
    const start = Math.PI * 0.75;
    const range = Math.PI * 1.5;

    function draw(v: number) {
      ctx.clearRect(0, 0, 160, 160);

      // Track background
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + range);
      ctx.strokeStyle = "#e8f3ec";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      // Filled arc
      const color =
        v >= 70 ? "#1e7a45" : v >= 40 ? "#b8860b" : "#b3261e";
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + (v / 100) * range);
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tick marks
      [0, 25, 50, 75, 100].forEach((t) => {
        const angle = start + (t / 100) * range;
        const ix = cx + (r - 7) * Math.cos(angle);
        const iy = cy + (r - 7) * Math.sin(angle);
        const ox = cx + (r + 2) * Math.cos(angle);
        const oy = cy + (r + 2) * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ox, oy);
        ctx.strokeStyle = "#bfe0cd";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const lx = cx + (r + 13) * Math.cos(angle);
        const ly = cy + (r + 13) * Math.sin(angle);
        ctx.fillStyle = "#9aaa9f";
        ctx.font = "8px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(t), lx, ly);
      });
    }

    let current = 0;
    cancelAnimationFrame(animRef.current);

    function tick() {
      current += (score - current) * 0.06;
      draw(Math.round(current));
      if (Math.abs(score - current) > 0.5) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        draw(score);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  const color =
    score >= 70 ? "var(--risk-low)" : score >= 40 ? "var(--risk-medium)" : "var(--risk-high)";

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} style={{ width: 160, height: 160 }} />
      <div
        className="data-mono -mt-2 text-3xl"
        style={{ color, letterSpacing: "-0.03em" }}
      >
        {score === 0 ? "—" : score}
      </div>
      <div className="form-label mt-1">Trust index</div>
    </div>
  );
}

// ─── RiskBar ─────────────────────────────────────────────────────────────────
function RiskBar({
  label,
  count,
  total,
  color,
  bg,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  bg: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="w-12 font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ height: 5, backgroundColor: bg }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
      <span
        className="data-mono w-6 text-right"
        style={{ color: "var(--foreground)" }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  mono = false,
  sub,
  accent = "var(--primary)",
}: {
  icon: typeof Activity;
  label: string;
  value: number | null;
  loading: boolean;
  mono?: boolean;
  sub?: string;
  accent?: string;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: accent,
          borderRadius: "14px 14px 0 0",
        }}
      />
      <div className="flex items-center justify-between">
        <span className="form-label">{label}</span>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <div
          className={`mt-3 text-3xl font-bold ${mono ? "data-mono" : ""}`}
          style={{
            fontFamily: mono ? undefined : "Syne, sans-serif",
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
          }}
        >
          {value === null ? "—" : value}
        </div>
      )}
      {sub && !loading && (
        <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    pending: {
      bg: "var(--status-pending-bg)",
      text: "var(--status-pending)",
      border: "var(--status-pending-border)",
    },
    completed: {
      bg: "var(--status-completed-bg)",
      text: "var(--status-completed)",
      border: "var(--status-completed-border)",
    },
    failed: {
      bg: "var(--status-failed-bg)",
      text: "var(--status-failed)",
      border: "var(--status-failed-border)",
    },
  };

  const s = styles[status] ?? styles["pending"];

  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
}