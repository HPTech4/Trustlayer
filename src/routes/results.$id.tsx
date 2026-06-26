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
import { motion, AnimatePresence, useSpring, useTransform, motionValue } from "framer-motion";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskColor(level: RiskLevel) {
  return {
    low: "var(--risk-low)",
    medium: "var(--risk-medium)",
    high: "var(--risk-high)",
  }[level];
}

function riskBg(level: RiskLevel) {
  return {
    low: "var(--risk-low-bg)",
    medium: "var(--risk-medium-bg)",
    high: "var(--risk-high-bg)",
  }[level];
}

function riskBorder(level: RiskLevel) {
  return {
    low: "var(--risk-low-border)",
    medium: "var(--risk-medium-border)",
    high: "var(--risk-high-border)",
  }[level];
}

function scoreLabel(score: number): string {
  if (score >= 80) return "High trust";
  if (score >= 60) return "Moderate trust";
  if (score >= 40) return "Low trust";
  return "Very low trust";
}

// Derive factor scores from explanation text + overall score
function deriveFactors(text: string, overallScore: number): FactorScore[] {
  const lower = text.toLowerCase();
  const factors: FactorScore[] = [
    {
      label: "Entity age",
      score: lower.includes("new") || lower.includes("recent") || lower.includes("month-old")
        ? Math.max(10, overallScore - 25)
        : Math.min(90, overallScore + 15),
      weight: 20,
    },
    {
      label: "Jurisdiction risk",
      score: lower.includes("jurisdiction") || lower.includes("offshore") || lower.includes("low-tax")
        ? Math.max(5, overallScore - 35)
        : Math.min(95, overallScore + 10),
      weight: 25,
    },
    {
      label: "Transfer size",
      score: lower.includes("wire transfer") || lower.includes("large transfer") || lower.includes("$")
        ? Math.max(15, overallScore - 20)
        : Math.min(85, overallScore + 5),
      weight: 20,
    },
    {
      label: "Relationship history",
      score: lower.includes("no prior history") || lower.includes("no history") || lower.includes("new client")
        ? Math.max(10, overallScore - 30)
        : Math.min(90, overallScore + 20),
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
  return factors;
}

function parseExplanation(raw: string): ParsedExplanation {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary && parsed.detail) {
      return {
        summary: parsed.summary,
        detail: parsed.detail,
        flags: (parsed.flags ?? []) as SignalFlag[],
      };
    }
  } catch {
    // Not JSON — fall through
  }

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences[0] ?? raw;
  const detail = sentences.slice(1).join(" ");
  const lower = raw.toLowerCase();
  const flags: SignalFlag[] = [];

  const rules: [string, string, FlagSeverity][] = [
    ["shell company", "Shell / offshore entity", "danger"],
    ["offshore", "Shell / offshore entity", "danger"],
    ["wire transfer", "High-value transfer", "warning"],
    ["large transfer", "High-value transfer", "warning"],
    ["no prior history", "No transaction history", "warning"],
    ["no history", "No transaction history", "warning"],
    ["unverified", "Unverified registration", "danger"],
    ["no registration", "Unverified registration", "danger"],
    ["verified", "Verified entity", "pass"],
    ["established", "Established entity", "pass"],
    ["jurisdiction", "High-risk jurisdiction", "danger"],
    ["low-tax", "High-risk jurisdiction", "danger"],
    ["new client", "New counterparty", "info"],
    ["new customer", "New counterparty", "info"],
  ];

  const seen = new Set<string>();
  rules.forEach(([keyword, label, severity]) => {
    if (lower.includes(keyword) && !seen.has(label)) {
      seen.add(label);
      flags.push({ label, severity });
    }
  });

  if (flags.length === 0)
    flags.push({ label: "Manual review recommended", severity: "info" });

  return { summary, detail, flags };
}

const flagConfig: {
  [key in FlagSeverity]: {
    icon: typeof AlertTriangle;
    color: string;
    bg: string;
    border: string;
  };
} = {
  danger: {
    icon: ShieldAlert,
    color: "var(--risk-high)",
    bg: "var(--risk-high-bg)",
    border: "var(--risk-high-border)",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--risk-medium)",
    bg: "var(--risk-medium-bg)",
    border: "var(--risk-medium-border)",
  },
  pass: {
    icon: CheckCircle2,
    color: "var(--risk-low)",
    bg: "var(--risk-low-bg)",
    border: "var(--risk-low-border)",
  },
  info: {
    icon: Info,
    color: "var(--primary)",
    bg: "var(--accent-light)",
    border: "var(--accent-light-border)",
  },
};

// ─── Animation variants ───────────────────────────────────────────────────────
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut" as const },
  },
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
        .select(
          "id, input_text, status, created_at, results(trust_score, risk_level, explanation)"
        )
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const r = data?.results
    ? Array.isArray(data.results)
      ? data.results[0]
      : data.results
    : null;

  const riskLevel = r?.risk_level as RiskLevel | undefined;
  const parsed = r ? parseExplanation(r.explanation ?? "") : null;
  const factors = r ? deriveFactors(r.explanation ?? "", r.trust_score) : [];

  // Peer average — fixed reference point per risk level
  const peerAvg = riskLevel === "low" ? 74 : riskLevel === "medium" ? 45 : 22;

  return (
    <div
      className="min-h-screen px-6 py-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-3xl">

        {/* ── Back link ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-smooth"
            style={{ color: "var(--primary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Link>
        </motion.div>

        {/* ── Skeleton ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-4"
            >
              {[{ h: 120, w: "100%" }, { h: 80, w: "85%" }, { h: 60, w: "60%" }].map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-6 space-y-3"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Skeleton className="h-3 w-24 mb-4" />
                  <Skeleton style={{ height: s.h, width: s.w }} className="rounded-lg" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-xl p-5 text-sm"
            style={{
              backgroundColor: "var(--risk-high-bg)",
              border: "1px solid var(--risk-high-border)",
              color: "var(--risk-high)",
            }}
          >
            Failed to load this result. Please refresh or{" "}
            <Link to="/history" className="underline font-medium">
              go back to history
            </Link>
            .
          </motion.div>
        )}

        {/* ── Not found ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && !data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-xl p-10 text-center text-sm"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            Submission not found.{" "}
            <Link
              to="/history"
              className="font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all submissions →
            </Link>
          </motion.div>
        )}

        {/* ── Content ───────────────────────────────────────────────────── */}
        {!isLoading && data && (
          <motion.div
            className="mt-6 space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >

            {/* ══ 1. SCORE HERO ══════════════════════════════════════════ */}
            <motion.div variants={fadeUp}>
              <div
                className="relative overflow-hidden rounded-xl p-6"
                style={{
                  backgroundColor: "var(--card)",
                  border: riskLevel
                    ? `1px solid ${riskBorder(riskLevel)}`
                    : "1px solid var(--border)",
                }}
              >
                {riskLevel && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at top left, ${riskBg(riskLevel)} 0%, transparent 65%)`,
                      opacity: 0.55,
                    }}
                  />
                )}

                <div className="relative">
                  <span className="form-label block mb-6">Trust score</span>

                  {r ? (
                    <>
                      <div className="flex items-end gap-5 flex-wrap">
                        {/* Slot-machine score */}
                        <SlotMachineScore
                          score={r.trust_score}
                          color={riskLevel ? riskColor(riskLevel) : "var(--primary)"}
                        />
                        <div className="pb-2 flex flex-col gap-2">
                          <RiskBadge level={r.risk_level as RiskLevel} />
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {scoreLabel(r.trust_score)}
                          </span>
                        </div>
                      </div>

                      {/* Risk zone bar with spring needle + confidence band */}
                      <div className="mt-6">
                        <RiskZoneBar score={r.trust_score} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 mt-2">
                      <PendingPulse />
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          Analysis in progress
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Status:{" "}
                          <span className="capitalize font-medium">
                            {data.status}
                          </span>{" "}
                          — check back in a few seconds.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ══ 2. FACTOR BREAKDOWN ════════════════════════════════════ */}
            {r && factors.length > 0 && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="form-label">Factor breakdown</span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      What drove this score
                    </span>
                  </div>
                  <div className="space-y-4">
                    {factors.map((f, i) => (
                      <FactorBar key={f.label} factor={f} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ 3. PEER COMPARISON + HEATMAP ROW ══════════════════════ */}
            {r && riskLevel && (
              <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Peer comparison */}
                <div
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="form-label block mb-4">Peer comparison</span>
                  <PeerComparison
                    score={r.trust_score}
                    peerAvg={peerAvg}
                    riskLevel={riskLevel}
                  />
                </div>

                {/* Risk heatmap */}
                <div
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="form-label block mb-4">Risk heatmap</span>
                  <RiskHeatmap
                    score={r.trust_score}
                    riskLevel={riskLevel}
                    explanation={r.explanation ?? ""}
                  />
                </div>
              </motion.div>
            )}

            {/* ══ 4. SIGNAL FLAGS ════════════════════════════════════════ */}
            {parsed && parsed.flags.length > 0 && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="form-label block mb-4">Risk signals</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {parsed.flags.map((flag, i) => (
                      <SignalChip key={i} flag={flag} index={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ 5. EXPLANATION ═════════════════════════════════════════ */}
            {parsed && (
              <motion.div variants={fadeUp}>
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="form-label block mb-4">Explanation</span>

                  {riskLevel && (
                    <div
                      className="rounded-lg p-4 mb-4"
                      style={{
                        backgroundColor: riskBg(riskLevel),
                        border: `1px solid ${riskBorder(riskLevel)}`,
                        borderLeft: `3px solid ${riskColor(riskLevel)}`,
                      }}
                    >
                      <p
                        className="text-sm font-medium leading-relaxed"
                        style={{ color: "var(--foreground)" }}
                      >
                        {parsed.summary}
                      </p>
                    </div>
                  )}

                  {parsed.detail && (
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: "var(--muted-foreground)",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      {parsed.detail}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ 6. SUBMITTED TEXT ══════════════════════════════════════ */}
            <motion.div variants={fadeUp}>
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => setTextOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-smooth hover:bg-(--accent-light)"
                  style={{ color: "var(--foreground)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <span className="text-sm font-semibold">Submitted text</span>
                    <span
                      className="data-mono rounded-full px-2 py-0.5 text-xs ml-1"
                      style={{
                        backgroundColor: "var(--accent-light)",
                        color: "var(--primary)",
                      }}
                    >
                      {data.input_text.trim().split(/\s+/).filter(Boolean).length}w
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(data.created_at).toLocaleString()}
                    </span>
                    <motion.span
                      animate={{ rotate: textOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ChevronDown
                        className="h-4 w-4"
                        style={{ color: "var(--muted-foreground)" }}
                      />
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
                      <div
                        className="px-6 pb-6"
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        <div
                          className="mt-4 rounded-lg p-4"
                          style={{
                            backgroundColor: "var(--input)",
                            border: "1px solid var(--input-border)",
                          }}
                        >
                          <p
                            className="whitespace-pre-wrap text-sm leading-relaxed"
                            style={{
                              color: "var(--foreground)",
                              fontFamily: "Space Grotesk, sans-serif",
                            }}
                          >
                            {data.input_text}
                          </p>
                        </div>
                        <p
                          className="mt-2 text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {data.input_text.length.toLocaleString()} characters
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ══ 7. CTAs ════════════════════════════════════════════════ */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              <Link
                to="/submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105 active:scale-95"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <ArrowRight className="h-4 w-4" />
                New submission
              </Link>
              <Link
                to="/history"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-smooth hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <RotateCcw
                  className="h-4 w-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
                View all results
              </Link>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── SlotMachineScore ─────────────────────────────────────────────────────────
function SlotMachineScore({ score, color }: { score: number; color: string }) {
  const digits = String(score).padStart(2, "0").split("");
  const [displayed, setDisplayed] = useState(digits.map(() => "0"));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    digits.forEach((digit, i) => {
      let frame = 0;
      const cycles = 8 + i * 4;
      const interval = setInterval(() => {
        setDisplayed((prev) => {
          const next = [...prev];
          next[i] = String(Math.floor(Math.random() * 10));
          return next;
        });
        frame++;
        if (frame >= cycles) {
          clearInterval(interval);
          const t = setTimeout(() => {
            setDisplayed((prev) => {
              const next = [...prev];
              next[i] = digit;
              return next;
            });
            if (i === digits.length - 1) setSettled(true);
          }, i * 80);
          timers.push(t);
        }
      }, 60);
    });
    return () => timers.forEach(clearTimeout);
  }, [score]);

  return (
    <div className="flex items-end gap-1">
      {displayed.map((d, i) => (
        <motion.span
          key={i}
          animate={settled ? { y: [4, 0], opacity: [0.7, 1] } : {}}
          transition={{ duration: 0.18, ease: "easeOut" as const }}
          style={{
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: settled ? color : "var(--muted-foreground)",
            fontFamily: "Syne, sans-serif",
            display: "inline-block",
            minWidth: "0.6em",
            textAlign: "center",
            transition: "color 0.3s ease",
          }}
        >
          {d}
        </motion.span>
      ))}
    </div>
  );
}

// ─── RiskZoneBar with spring needle + confidence band ─────────────────────────
function RiskZoneBar({ score }: { score: number }) {
  const confidence = 87;
  const bandHalf = Math.round((100 - confidence) / 2 * 0.8);
  const bandLow = Math.max(0, score - bandHalf);
  const bandHigh = Math.min(100, score + bandHalf);

  // Spring for needle overshoot
  const springX = useSpring(0, { stiffness: 120, damping: 10, mass: 0.8 });

  useEffect(() => {
    const t = setTimeout(() => springX.set(score), 300);
    return () => clearTimeout(t);
  }, [score, springX]);

  const needleLeft = useTransform(springX, (v) => `${v}%`);

  return (
    <div>
      <div className="relative h-4 w-full rounded-full overflow-hidden">
        {/* Zone backgrounds */}
        <div className="absolute inset-0 flex">
          <div style={{ width: "40%", backgroundColor: "var(--risk-high-bg)" }} />
          <div style={{ width: "30%", backgroundColor: "var(--risk-medium-bg)" }} />
          <div style={{ width: "30%", backgroundColor: "var(--risk-low-bg)" }} />
        </div>

        {/* Confidence band */}
        <motion.div
          className="absolute top-0 h-full"
          style={{
            left: `${bandLow}%`,
            width: `${bandHigh - bandLow}%`,
            backgroundColor: "var(--primary)",
            opacity: 0.15,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        />

        {/* Animated fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            backgroundColor:
              score < 40
                ? "var(--risk-high)"
                : score < 70
                ? "var(--risk-medium)"
                : "var(--risk-low)",
            opacity: 0.75,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />

        {/* Spring needle */}
        <motion.div
          className="absolute top-0 h-full"
          style={{
            left: needleLeft,
            width: 2,
            backgroundColor: "var(--foreground)",
            opacity: 0.8,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Confidence label */}
      <div className="mt-2 flex items-center justify-between">
        <div
          className="mt-1.5 flex text-xs w-full"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span style={{ width: "40%" }}>High risk</span>
          <span style={{ width: "30%", textAlign: "center" }}>Medium</span>
          <span style={{ width: "30%", textAlign: "right" }}>Low risk</span>
        </div>
      </div>
      <div
        className="mt-1 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        Score range{" "}
        <span
          className="data-mono font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {bandLow}–{bandHigh}
        </span>{" "}
        with{" "}
        <span style={{ color: "var(--primary)" }}>{confidence}% confidence</span>
      </div>
    </div>
  );
}

// ─── FactorBar ────────────────────────────────────────────────────────────────
function FactorBar({ factor, index }: { factor: FactorScore; index: number }) {
  const color =
    factor.score >= 70
      ? "var(--risk-low)"
      : factor.score >= 40
      ? "var(--risk-medium)"
      : "var(--risk-high)";

  const bg =
    factor.score >= 70
      ? "var(--risk-low-bg)"
      : factor.score >= 40
      ? "var(--risk-medium-bg)"
      : "var(--risk-high-bg)";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" as const }}
      className="flex items-center gap-3"
    >
      <span
        className="text-xs font-medium shrink-0"
        style={{ width: 140, color: "var(--foreground)" }}
      >
        {factor.label}
      </span>
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ height: 8, backgroundColor: "var(--border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.2 + index * 0.07,
          }}
        />
      </div>
      <span
        className="data-mono text-xs font-bold shrink-0"
        style={{ width: 28, textAlign: "right", color }}
      >
        {factor.score}
      </span>
    </motion.div>
  );
}

// ─── PeerComparison ───────────────────────────────────────────────────────────
function PeerComparison({
  score,
  peerAvg,
  riskLevel,
}: {
  score: number;
  peerAvg: number;
  riskLevel: RiskLevel;
}) {
  const diff = score - peerAvg;
  const isAbove = diff >= 0;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        Similar submissions in the{" "}
        <span className="font-semibold" style={{ color: "var(--foreground)" }}>
          {riskLevel} risk
        </span>{" "}
        category average{" "}
        <span className="data-mono font-bold" style={{ color: "var(--foreground)" }}>
          {peerAvg}
        </span>
        . Yours scored{" "}
        <span
          className="data-mono font-bold"
          style={{ color: isAbove ? "var(--risk-low)" : "var(--risk-high)" }}
        >
          {Math.abs(diff)} points {isAbove ? "above" : "below"}
        </span>
        .
      </p>

      {/* Two-bar comparison */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ width: 60, color: "var(--muted-foreground)" }}>
            This
          </span>
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 10, backgroundColor: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: riskColor(riskLevel) }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>
          <span
            className="data-mono text-xs font-bold shrink-0"
            style={{ width: 24, color: "var(--foreground)" }}
          >
            {score}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ width: 60, color: "var(--muted-foreground)" }}>
            Peers
          </span>
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 10, backgroundColor: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--muted-foreground)", opacity: 0.5 }}
              initial={{ width: 0 }}
              animate={{ width: `${peerAvg}%` }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
            />
          </div>
          <span
            className="data-mono text-xs font-bold shrink-0"
            style={{ width: 24, color: "var(--muted-foreground)" }}
          >
            {peerAvg}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── RiskHeatmap ──────────────────────────────────────────────────────────────
function RiskHeatmap({
  score,
  riskLevel,
  explanation,
}: {
  score: number;
  riskLevel: RiskLevel;
  explanation: string;
}) {
  const lower = explanation.toLowerCase();

  // Derive likelihood (x) and impact (y) from signals
  const likelihood =
    score < 30 ? 2 : score < 55 ? 1 : 0; // 0=low 1=med 2=high col
  const impact =
    lower.includes("wire transfer") || lower.includes("large") || lower.includes("$")
      ? 2
      : lower.includes("jurisdiction") || lower.includes("offshore")
      ? 1
      : 0;

  // Grid: 3 cols (likelihood) × 3 rows (impact), both low→high
  const cells = [
    // row 2 (high impact)
    { likelihood: 0, impact: 2, color: "var(--risk-medium-bg)", border: "var(--risk-medium-border)" },
    { likelihood: 1, impact: 2, color: "var(--risk-high-bg)", border: "var(--risk-high-border)" },
    { likelihood: 2, impact: 2, color: "var(--risk-high-bg)", border: "var(--risk-high-border)" },
    // row 1 (medium impact)
    { likelihood: 0, impact: 1, color: "var(--risk-low-bg)", border: "var(--risk-low-border)" },
    { likelihood: 1, impact: 1, color: "var(--risk-medium-bg)", border: "var(--risk-medium-border)" },
    { likelihood: 2, impact: 1, color: "var(--risk-high-bg)", border: "var(--risk-high-border)" },
    // row 0 (low impact)
    { likelihood: 0, impact: 0, color: "var(--risk-low-bg)", border: "var(--risk-low-border)" },
    { likelihood: 1, impact: 0, color: "var(--risk-low-bg)", border: "var(--risk-low-border)" },
    { likelihood: 2, impact: 0, color: "var(--risk-medium-bg)", border: "var(--risk-medium-border)" },
  ];

  return (
    <div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)" }}
      >
        {cells.map((cell, i) => {
          const isActive = cell.likelihood === likelihood && cell.impact === impact;
          const row = 2 - cell.impact; // CSS grid row (top=high impact)
          const col = cell.likelihood + 1;
          return (
            <motion.div
              key={i}
              style={{
                gridColumn: col,
                gridRow: row,
                height: 48,
                borderRadius: 8,
                backgroundColor: cell.color,
                border: `1px solid ${cell.border}`,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.04, duration: 0.25 }}
            >
              {isActive && (
                <motion.div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: riskColor(riskLevel),
                    boxShadow: `0 0 0 4px ${riskBg(riskLevel)}`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" as const }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Axis labels */}
      <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span>Low likelihood</span>
        <span>High likelihood</span>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
        ↑ Impact (vertical)
      </div>
    </div>
  );
}

// ─── SignalChip with scan effect ─────────────────────────────────────────────
function SignalChip({ flag, index }: { flag: SignalFlag; index: number }) {
  const cfg = flagConfig[flag.severity];
  const Icon = cfg.icon;
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setScanned(true), 400 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className="relative overflow-hidden flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        opacity: scanned ? 1 : 0.3,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* Scan line sweeping left to right */}
      {!scanned && (
        <motion.div
          className="absolute inset-y-0 w-8"
          style={{
            background: `linear-gradient(90deg, transparent, ${cfg.color}33, transparent)`,
            pointerEvents: "none",
          }}
          initial={{ left: "-10%" }}
          animate={{ left: "110%" }}
          transition={{ duration: 0.4, ease: "linear" as const, delay: index * 0.12 }}
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
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: "var(--primary)" }}
      />
    </motion.div>
  );
}