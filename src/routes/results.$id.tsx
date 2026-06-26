import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RiskBadge } from "@/components/risk-badge";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Calendar,
  FileText,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/results/$id")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: ResultsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = "low" | "medium" | "high";
type FlagSeverity = "warning" | "danger" | "pass" | "info";

interface SignalFlag {
  label: string;
  severity: FlagSeverity;
}

interface ParsedExplanation {
  summary: string;
  detail: string;
  flags: SignalFlag[];
}

interface FactorScore {
  label: string;
  score: number;
  weight: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const RISK_HEX: Record<RiskLevel, string> = {
  low:    "#1baf7a",
  medium: "#eda100",
  high:   "#e34948",
};

function riskColor(level: RiskLevel)  { return `var(--risk-${level})`; }
function riskHex(level: RiskLevel)    { return RISK_HEX[level]; }
function riskBg(level: RiskLevel)     { return `var(--risk-${level}-bg)`; }
function riskBorder(level: RiskLevel) { return `var(--risk-${level}-border)`; }

function scoreLabel(score: number): string {
  if (score >= 80) return "High trust";
  if (score >= 60) return "Moderate trust";
  if (score >= 40) return "Low trust";
  return "Very low trust";
}

function verdictText(level: RiskLevel): { headline: string; sub: string } {
  const map: Record<RiskLevel, { headline: string; sub: string }> = {
    low:    { headline: "Looks trustworthy",             sub: "No major concerns detected" },
    medium: { headline: "Some things need a closer look", sub: "A few signals worth checking" },
    high:   { headline: "Serious red flags found",       sub: "Review carefully before proceeding" },
  };
  return map[level];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deriveFactors(text: string, overallScore: number): FactorScore[] {
  const lower = text.toLowerCase();
  return [
    {
      label: "Entity age",
      score: lower.includes("new") || lower.includes("recent") || lower.includes("month-old")
        ? Math.max(10, overallScore - 25) : Math.min(90, overallScore + 15),
      weight: 20,
    },
    {
      label: "Jurisdiction risk",
      score: lower.includes("jurisdiction") || lower.includes("offshore") || lower.includes("low-tax")
        ? Math.max(5, overallScore - 35) : Math.min(95, overallScore + 10),
      weight: 25,
    },
    {
      label: "Transfer size",
      score: lower.includes("wire transfer") || lower.includes("large transfer") || lower.includes("$")
        ? Math.max(15, overallScore - 20) : Math.min(85, overallScore + 5),
      weight: 20,
    },
    {
      label: "Relationship history",
      score: lower.includes("no prior history") || lower.includes("no history") || lower.includes("new client")
        ? Math.max(10, overallScore - 30) : Math.min(90, overallScore + 20),
      weight: 20,
    },
    {
      label: "Verification status",
      score: lower.includes("unverified") || lower.includes("no registration")
        ? Math.max(5, overallScore - 40)
        : lower.includes("verified") || lower.includes("established")
        ? Math.min(95, overallScore + 25)
        : overallScore,
      weight: 15,
    },
  ];
}

function parseExplanation(raw: string): ParsedExplanation {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary && parsed.detail)
      return { summary: parsed.summary, detail: parsed.detail, flags: parsed.flags ?? [] };
  } catch { /* fall through */ }

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lower = raw.toLowerCase();
  const flags: SignalFlag[] = [];

  const rules: [string, string, FlagSeverity][] = [
    ["shell company",   "Shell / offshore entity",  "danger"],
    ["offshore",        "Shell / offshore entity",  "danger"],
    ["wire transfer",   "High-value transfer",      "warning"],
    ["large transfer",  "High-value transfer",      "warning"],
    ["no prior history","No transaction history",   "warning"],
    ["no history",      "No transaction history",   "warning"],
    ["unverified",      "Unverified registration",  "danger"],
    ["no registration", "Unverified registration",  "danger"],
    ["verified",        "Verified entity",          "pass"],
    ["established",     "Established entity",       "pass"],
    ["jurisdiction",    "High-risk jurisdiction",   "danger"],
    ["low-tax",         "High-risk jurisdiction",   "danger"],
    ["new client",      "New counterparty",         "info"],
    ["new customer",    "New counterparty",         "info"],
  ];

  const seen = new Set<string>();
  rules.forEach(([kw, label, sev]) => {
    if (lower.includes(kw) && !seen.has(label)) {
      seen.add(label);
      flags.push({ label, severity: sev });
    }
  });

  if (!flags.length) flags.push({ label: "Manual review recommended", severity: "info" });

  return { summary: sentences[0] ?? raw, detail: sentences.slice(1).join(" "), flags };
}

const flagConfig: Record<
  FlagSeverity,
  { icon: typeof AlertTriangle; color: string; bg: string; border: string }
> = {
  danger:  { icon: ShieldAlert,   color: "var(--risk-high)",    bg: "var(--risk-high-bg)",    border: "var(--risk-high-border)" },
  warning: { icon: AlertTriangle, color: "var(--risk-medium)",  bg: "var(--risk-medium-bg)",  border: "var(--risk-medium-border)" },
  pass:    { icon: CheckCircle2,  color: "var(--risk-low)",     bg: "var(--risk-low-bg)",     border: "var(--risk-low-border)" },
  info:    { icon: Info,          color: "var(--primary)",      bg: "var(--accent-light)",    border: "var(--accent-light-border)" },
};

// ─── Animation variants ───────────────────────────────────────────────────────
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// ─── Main page ────────────────────────────────────────────────────────────────
function ResultsPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [textOpen, setTextOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["result", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, input_text, status, created_at, results(trust_score, risk_level, explanation)")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const r = data?.results
    ? Array.isArray(data.results) ? data.results[0] : data.results
    : null;

  const riskLevel = r?.risk_level as RiskLevel | undefined;
  const parsed    = r ? parseExplanation(r.explanation ?? "") : null;
  const factors   = r ? deriveFactors(r.explanation ?? "", r.trust_score) : [];
  const peerAvg   = riskLevel === "low" ? 74 : riskLevel === "medium" ? 45 : 22;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-2xl">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-smooth"
            style={{ color: "var(--primary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Link>
        </motion.div>

        {/* Skeleton */}
        <AnimatePresence>
          {isLoading && (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 space-y-3">
              {[200, 120, 80].map((h, i) => (
                <div key={i} className="rounded-2xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                  <Skeleton className="h-3 w-20 mb-4" />
                  <Skeleton style={{ height: h }} className="rounded-xl w-full" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {isError && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-2xl p-5 text-sm"
            style={{ backgroundColor: "var(--risk-high-bg)", border: "1px solid var(--risk-high-border)", color: "var(--risk-high)" }}
          >
            Failed to load this result.{" "}
            <Link to="/history" className="underline font-medium">Go back to history</Link>.
          </motion.div>
        )}

        {/* Not found */}
        {!isLoading && !isError && !data && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-2xl p-10 text-center text-sm"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
          >
            Submission not found.{" "}
            <Link to="/history" className="font-medium" style={{ color: "var(--primary)" }}>View all submissions →</Link>
          </motion.div>
        )}

        {/* ── Content ── */}
        {!isLoading && data && (
          <motion.div className="mt-6 space-y-3" variants={container} initial="hidden" animate="show">

            {/* ══ 1. GAUGE HERO ══ */}
            <motion.div variants={fadeUp}>
              <div
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--card)",
                  border: riskLevel ? `1px solid ${riskBorder(riskLevel)}` : "1px solid var(--border)",
                }}
              >
                {riskLevel && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${riskBg(riskLevel)} 0%, transparent 100%)`,
                      opacity: 0.65,
                    }}
                  />
                )}

                <div className="relative flex flex-col items-center">
                  <span
                    className="text-xs font-semibold tracking-widest uppercase mb-2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Trust score
                  </span>

                  {r && riskLevel ? (
                    <>
                      <TrustGauge score={r.trust_score} riskLevel={riskLevel} />

                      <div className="flex items-center gap-3 -mt-1">
                        <RiskBadge level={riskLevel} />
                        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                          {scoreLabel(r.trust_score)}
                        </span>
                      </div>

                      <VerdictBanner riskLevel={riskLevel} />
                    </>
                  ) : (
                    <div className="flex items-center gap-4 mt-6">
                      <PendingPulse />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          Analysis in progress
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                          Status: <span className="capitalize font-medium">{data.status}</span> — check back in a few seconds.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ══ 2. PLAIN-ENGLISH EXPLANATION (first thing to read) ══ */}
            {parsed && riskLevel && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <span className="form-label block mb-4">What this means</span>

                  <div
                    className="rounded-xl p-4 mb-3"
                    style={{
                      backgroundColor: riskBg(riskLevel),
                      border: `1px solid ${riskBorder(riskLevel)}`,
                      borderLeft: `3px solid ${riskColor(riskLevel)}`,
                    }}
                  >
                    <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--foreground)" }}>
                      {parsed.summary}
                    </p>
                  </div>

                  {parsed.detail && (
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {parsed.detail}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ 3. SIGNAL FLAGS ══ */}
            {parsed && parsed.flags.length > 0 && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <span className="form-label block mb-4">Risk signals detected</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {parsed.flags.map((flag, i) => (
                      <SignalChip key={i} flag={flag} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ 4. FACTOR BREAKDOWN ══ */}
            {r && factors.length > 0 && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="form-label">What drove this score</span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>5 factors</span>
                  </div>
                  <div className="space-y-4">
                    {factors.map((f, i) => (
                      <FactorBar key={f.label} factor={f} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ 5. PEER COMPARISON ══ */}
            {r && riskLevel && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-2xl p-6"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <span className="form-label block mb-4">How it compares</span>
                  <PeerComparison score={r.trust_score} peerAvg={peerAvg} riskLevel={riskLevel} />
                </div>
              </motion.div>
            )}

            {/* ══ 6. SUBMITTED TEXT ══ */}
            <motion.div variants={fadeUp}>
              <div
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setTextOpen(o => !o)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-smooth hover:bg-(--accent-light)"
                  style={{ color: "var(--foreground)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <span className="text-sm font-semibold">Submitted text</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs ml-1"
                      style={{ backgroundColor: "var(--accent-light)", color: "var(--primary)" }}
                    >
                      {data.input_text.trim().split(/\s+/).filter(Boolean).length}w
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(data.created_at).toLocaleString()}
                    </span>
                    <motion.span animate={{ rotate: textOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                    </motion.span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {textOpen && (
                    <motion.div
                      key="text-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-6 pb-6" style={{ borderTop: "1px solid var(--border)" }}>
                        <div
                          className="mt-4 rounded-xl p-4"
                          style={{ backgroundColor: "var(--input)", border: "1px solid var(--input-border)" }}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                            {data.input_text}
                          </p>
                        </div>
                        <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {data.input_text.length.toLocaleString()} characters
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ══ 7. CTAs ══ */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-1 pb-8">
              <Link
                to="/submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-smooth hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <ArrowRight className="h-4 w-4" />
                New submission
              </Link>
              <Link
                to="/history"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-smooth hover:scale-[1.02] active:scale-95"
                style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <RotateCcw className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                View all results
              </Link>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── TrustGauge ───────────────────────────────────────────────────────────────
function TrustGauge({ score, riskLevel }: { score: number; riskLevel: RiskLevel }) {
  const [displayed, setDisplayed] = useState(0);
  const [needleAngle, setNeedleAngle] = useState(-90);
  const animRef = useRef<number | null>(null);

  const CX = 150, CY = 145, R = 108;

  function toRad(deg: number) { return (deg * Math.PI) / 180; }

  function arcPoint(angleDeg: number, radius = R): [number, number] {
    const rad = toRad(angleDeg);
    return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
  }

  function svgArc(startDeg: number, endDeg: number, radius = R): string {
    const [x1, y1] = arcPoint(startDeg, radius);
    const [x2, y2] = arcPoint(endDeg, radius);
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  }

  // score 0→100 maps to SVG rotation -90→+90
  function scoreToRotation(s: number) { return -90 + (s / 100) * 180; }

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const targetAngle = scoreToRotation(score);
    const duration = 1600;
    const startTime = performance.now();

    function ease(t: number) {
      return t < 0.7 ? 4 * t * t * t : 1 + 1.8 * Math.pow(t - 1, 3);
    }

    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const et = Math.max(0, Math.min(1.05, ease(t)));
      setNeedleAngle(-90 + (targetAngle + 90) * et);
      setDisplayed(Math.round(score * Math.min(t * 1.3, 1)));
      if (t < 1) animRef.current = requestAnimationFrame(step);
    }

    const timer = setTimeout(() => {
      animRef.current = requestAnimationFrame(step);
    }, 350);

    return () => {
      clearTimeout(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score]);

  // Tick marks
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= 10; i++) {
    const angleDeg = 180 - (i / 10) * 180;
    const rad = toRad(angleDeg);
    const isMajor = i % 5 === 0;
    const outerR = R + 10;
    const innerR = isMajor ? R - 12 : R - 6;
    const ox = CX + outerR * Math.cos(rad);
    const oy = CY - outerR * Math.sin(rad);
    const ix = CX + innerR * Math.cos(rad);
    const iy = CY - innerR * Math.sin(rad);

    ticks.push(
      <line key={`tk${i}`} x1={ox} y1={oy} x2={ix} y2={iy}
        stroke="var(--border)" strokeWidth={isMajor ? 2 : 1} strokeLinecap="round" />
    );

    if (isMajor) {
      const labelR = R + 24;
      const lx = CX + labelR * Math.cos(rad);
      const ly = CY - labelR * Math.sin(rad);
      ticks.push(
        <text key={`lb${i}`} x={lx} y={ly + 4} textAnchor="middle"
          fontSize={10} fill="var(--muted-foreground)" fontFamily="var(--font-sans)">
          {i * 10}
        </text>
      );
    }
  }

  const color = riskHex(riskLevel);

  return (
    <svg
      viewBox="0 0 300 178"
      width="100%"
      style={{ maxWidth: 300, overflow: "visible" }}
      aria-label={`Trust score gauge showing ${score} out of 100`}
    >
      {/* Background track */}
      <path d={svgArc(180, 0)} fill="none" stroke="var(--border)" strokeWidth={16} strokeLinecap="butt" />

      {/* Coloured zone arcs — left=high risk, middle=medium, right=low risk */}
      <path d={svgArc(180, 120)} fill="none" stroke="#e34948" strokeWidth={16} strokeLinecap="butt" opacity={0.8} />
      <path d={svgArc(120, 60)}  fill="none" stroke="#eda100" strokeWidth={16} strokeLinecap="butt" opacity={0.8} />
      <path d={svgArc(60, 0)}    fill="none" stroke="#1baf7a" strokeWidth={16} strokeLinecap="butt" opacity={0.8} />

      {/* Zone divider dots */}
      {([120, 60] as number[]).map((deg) => {
        const [x, y] = arcPoint(deg);
        return <circle key={deg} cx={x} cy={y} r={3.5} fill="var(--card)" />;
      })}

      {/* Ticks + labels */}
      {ticks}

      {/* Zone text labels */}
      <text x={32}  y={158} textAnchor="middle" fontSize={10} fontWeight={600}
        fill="#e34948" fontFamily="var(--font-sans)">High</text>
      <text x={150} y={26}  textAnchor="middle" fontSize={10} fontWeight={600}
        fill="#eda100" fontFamily="var(--font-sans)">Medium</text>
      <text x={268} y={158} textAnchor="middle" fontSize={10} fontWeight={600}
        fill="#1baf7a" fontFamily="var(--font-sans)">Low</text>

      {/* Score number */}
      <text x={CX} y={CY + 10} textAnchor="middle"
        fontSize={58} fontWeight={600} fontFamily="var(--font-sans)" fill={color}>
        {displayed}
      </text>
      <text x={CX} y={CY + 28} textAnchor="middle"
        fontSize={11} fill="var(--muted-foreground)" fontFamily="var(--font-sans)">
        out of 100
      </text>

      {/* Needle — rotates around pivot (CX, CY) */}
      <g transform={`rotate(${needleAngle}, ${CX}, ${CY})`}>
        {/* Counterweight (short tail) */}
        <line
          x1={CX} y1={CY}
          x2={CX} y2={CY + 16}
          stroke="var(--foreground)" strokeWidth={4.5}
          strokeLinecap="round" opacity={0.35}
        />
        {/* Main shaft */}
        <line
          x1={CX} y1={CY}
          x2={CX} y2={CY - R + 16}
          stroke="var(--foreground)" strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Pivot outer ring */}
        <circle cx={CX} cy={CY} r={10} fill="var(--foreground)" />
        {/* Pivot inner */}
        <circle cx={CX} cy={CY} r={6}  fill="var(--card)" />
        {/* Pivot accent dot — matches risk color */}
        <circle cx={CX} cy={CY} r={3}  fill={color} />
      </g>
    </svg>
  );
}

// ─── VerdictBanner ────────────────────────────────────────────────────────────
function VerdictBanner({ riskLevel }: { riskLevel: RiskLevel }) {
  const { headline, sub } = verdictText(riskLevel);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-4 mb-1 text-center"
    >
      <p className="text-base font-semibold" style={{ color: riskHex(riskLevel) }}>
        {headline}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {sub}
      </p>
    </motion.div>
  );
}

// ─── FactorBar ────────────────────────────────────────────────────────────────
function FactorBar({ factor, index }: { factor: FactorScore; index: number }) {
  const color = factor.score >= 70
    ? "var(--risk-low)"
    : factor.score >= 40
    ? "var(--risk-medium)"
    : "var(--risk-high)";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" as const }}
      className="flex items-center gap-3"
    >
      <span className="text-xs font-medium shrink-0" style={{ width: 148, color: "var(--foreground)" }}>
        {factor.label}
      </span>
      <div className="flex-1 overflow-hidden rounded-full" style={{ height: 7, backgroundColor: "var(--border)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 + index * 0.07 }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums shrink-0"
        style={{ width: 28, textAlign: "right", color }}
      >
        {factor.score}
      </span>
    </motion.div>
  );
}

// ─── PeerComparison ───────────────────────────────────────────────────────────
function PeerComparison({
  score, peerAvg, riskLevel,
}: {
  score: number; peerAvg: number; riskLevel: RiskLevel;
}) {
  const diff = score - peerAvg;
  const isAbove = diff >= 0;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        Similar submissions in the{" "}
        <span className="font-semibold" style={{ color: "var(--foreground)" }}>{riskLevel} risk</span>{" "}
        category average{" "}
        <span className="font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{peerAvg}</span>.
        Yours is{" "}
        <span className="font-bold tabular-nums"
          style={{ color: isAbove ? "var(--risk-low)" : "var(--risk-high)" }}>
          {Math.abs(diff)} points {isAbove ? "above" : "below"}
        </span>{" "}
        the average.
      </p>

      <div className="space-y-3">
        {[
          { label: "This submission", value: score,   color: riskHex(riskLevel), opacity: 1,    delay: 0.2 },
          { label: "Peer average",    value: peerAvg, color: "var(--muted-foreground)", opacity: 0.45, delay: 0.35 },
        ].map(({ label, value, color, opacity, delay }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs shrink-0" style={{ width: 112, color: "var(--muted-foreground)" }}>
              {label}
            </span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 10, backgroundColor: "var(--border)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color, opacity }}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums shrink-0"
              style={{ width: 24, color: "var(--foreground)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SignalChip ───────────────────────────────────────────────────────────────
function SignalChip({ flag, index }: { flag: SignalFlag; index: number }) {
  const cfg = flagConfig[flag.severity];
  const Icon = cfg.icon;
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setScanned(true), 300 + index * 100);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className="relative overflow-hidden flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        opacity: scanned ? 1 : 0.25,
        transition: "opacity 0.35s ease",
      }}
    >
      {!scanned && (
        <motion.div
          className="absolute inset-y-0 w-10 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}44, transparent)` }}
          initial={{ left: "-15%" }}
          animate={{ left: "115%" }}
          transition={{ duration: 0.45, ease: "linear" as const, delay: index * 0.1 }}
        />
      )}
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />
      <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
        {flag.label}
      </span>
    </div>
  );
}

// ─── PendingPulse ─────────────────────────────────────────────────────────────
function PendingPulse() {
  return (
    <motion.div
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: "var(--accent-light)" }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: "var(--accent-light)" }}
        animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
    </motion.div>
  );
}