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

// Parse the AI explanation into a structured object.
// If your AI returns JSON with { summary, detail, flags } — it parses directly.
// Otherwise it falls back to prose splitting + keyword-derived flags.
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
    // Not JSON — fall through to prose parsing
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

const flagConfig: Record<
  FlagSeverity,
  { icon: typeof AlertTriangle; color: string; bg: string; border: string }
> = {
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
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
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

  return (
    <div
      className="min-h-screen px-6 py-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-3xl">

        {/* ── Back link ───────────────────────────────────────────────────── */}
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

        {/* ── Skeleton ────────────────────────────────────────────────────── */}
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

        {/* ── Error ───────────────────────────────────────────────────────── */}
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

        {/* ── Not found ───────────────────────────────────────────────────── */}
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

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {!isLoading && data && (
          <motion.div
            className="mt-6 space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >

            {/* ══ 1. SCORE HERO ════════════════════════════════════════════ */}
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
                {/* Risk-tinted radial background wash */}
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
                      {/* Score + badge + label */}
                      <div className="flex items-end gap-5 flex-wrap">
                        <AnimatedScore
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

                      {/* Risk zone bar */}
                      <div className="mt-6">
                        <RiskZoneBar score={r.trust_score} />
                      </div>
                    </>
                  ) : (
                    /* Pending state */
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

            {/* ══ 2. SIGNAL FLAGS ══════════════════════════════════════════ */}
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
                  <motion.div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    variants={{
                      show: { transition: { staggerChildren: 0.07 } },
                    }}
                    initial="hidden"
                    animate="show"
                  >
                    {parsed.flags.map((flag, i) => (
                      <SignalChip key={i} flag={flag} index={i} />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ══ 3. EXPLANATION ═══════════════════════════════════════════ */}
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

                  {/* Summary callout */}
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

                  {/* Detail body */}
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

            {/* ══ 4. SUBMITTED TEXT (collapsed by default) ═════════════════ */}
            <motion.div variants={fadeUp}>
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Toggle header */}
                <button
                  onClick={() => setTextOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-smooth hover:bg-[var(--accent-light)]"
                  style={{ color: "var(--foreground)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileText
                      className="h-4 w-4"
                      style={{ color: "var(--primary)" }}
                    />
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

                {/* Collapsible body */}
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

            {/* ══ 5. CTAs ══════════════════════════════════════════════════ */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              {/* Primary */}
              <Link
                to="/submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105 active:scale-95"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <ArrowRight className="h-4 w-4" />
                New submission
              </Link>

              {/* Secondary — ghost */}
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

// ─── RiskZoneBar ──────────────────────────────────────────────────────────────
// Segmented bar: 40% high-risk / 30% medium / 30% low
// Animated fill + needle that lands at the exact score position
function RiskZoneBar({ score }: { score: number }) {
  return (
    <div>
      <div className="relative flex h-3 w-full overflow-hidden rounded-full">
        {/* Zone backgrounds */}
        <div
          style={{
            width: "40%",
            backgroundColor: "var(--risk-high-bg)",
            borderRight: "2px solid var(--background)",
          }}
        />
        <div
          style={{
            width: "30%",
            backgroundColor: "var(--risk-medium-bg)",
            borderRight: "2px solid var(--background)",
          }}
        />
        <div
          style={{
            width: "30%",
            backgroundColor: "var(--risk-low-bg)",
          }}
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
            opacity: 0.85,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />

        {/* Needle */}
        <motion.div
          className="absolute top-0 h-full"
          style={{
            width: 2,
            backgroundColor: "var(--foreground)",
            opacity: 0.65,
            borderRadius: 2,
          }}
          initial={{ left: "0%" }}
          animate={{ left: `${score}%` }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </div>

      {/* Zone labels */}
      <div
        className="mt-1.5 flex text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span style={{ width: "40%" }}>High risk</span>
        <span style={{ width: "30%", textAlign: "center" }}>Medium</span>
        <span style={{ width: "30%", textAlign: "right" }}>Low risk</span>
      </div>
    </div>
  );
}

// ─── SignalChip ───────────────────────────────────────────────────────────────
function SignalChip({ flag, index }: { flag: SignalFlag; index: number }) {
  const cfg = flagConfig[flag.severity];
  const Icon = cfg.icon;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.28, delay: index * 0.06 },
        },
      }}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon
        className="h-3.5 w-3.5 flex-shrink-0"
        style={{ color: cfg.color }}
      />
      <span
        className="text-xs font-medium"
        style={{ color: "var(--foreground)" }}
      >
        {flag.label}
      </span>
    </motion.div>
  );
}

// ─── AnimatedScore ────────────────────────────────────────────────────────────
// Counts up 0 → score with ease-out cubic over ~1.1s
function AnimatedScore({ score, color }: { score: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const duration = 1100;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el!.textContent = String(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(tick);
      else el!.textContent = String(score);
    }

    requestAnimationFrame(tick);
  }, [score]);

  return (
    <span
      ref={ref}
      className="data-mono"
      style={{
        fontSize: 80,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        color,
        fontFamily: "Syne, sans-serif",
      }}
    >
      0
    </span>
  );
}

// ─── PendingPulse ─────────────────────────────────────────────────────────────
function PendingPulse() {
  return (
    <motion.div
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
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