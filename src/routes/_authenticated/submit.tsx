import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { analyzeSubmission } from "@/lib/analysis.functions";
import { toast } from "sonner";
import { Send, Loader2, ChevronDown, Sparkles, Clock } from "lucide-react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { RiskBadge } from "@/components/risk-badge";

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/submit")({
  component: SubmitPage,
});

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_CHARS = 5000;
const MIN_CHARS = 10;
const WARN_CHARS = 4000;
const DANGER_CHARS = 4800;
const RESULT_DISPLAY_MS = 2000;

const EXAMPLE_PROMPTS = [
  "A 3-month-old shell company in a low-tax jurisdiction requested a $48,000 wire transfer from a new client with no prior history.",
  "A supplier with 5-star reviews on their website but no verifiable business registration or physical address.",
  "An influencer promoting a crypto token they claim to have personally vetted, with 2M followers but zero engagement.",
];

const TIPS = [
  "Include the entity type — person, company, or transaction.",
  "Add any red flags you've already noticed.",
  "More context means a more accurate trust score.",
];

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = "idle" | "typing" | "analyzing" | "result";

interface AnalysisResult {
  submissionId: string;
  trustScore: number;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
function SubmitPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [tipsOpen, setTipsOpen] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const charCount = text.length;
  const isReady = charCount >= MIN_CHARS && phase === "idle" || phase === "typing";
  const isLoading = phase === "analyzing";

  // Spring-animated character counter
  const springCount = useSpring(0, { stiffness: 200, damping: 20 });
  const displayCount = useTransform(springCount, (v) => Math.round(v));

  useEffect(() => {
    springCount.set(charCount);
  }, [charCount, springCount]);

  // Derive counter color
  const counterColor =
    charCount >= DANGER_CHARS
      ? "var(--risk-high)"
      : charCount >= WARN_CHARS
      ? "var(--risk-medium)"
      : "var(--muted-foreground)";

  // Progress bar fill color
  const progressColor =
    charCount >= DANGER_CHARS
      ? "var(--risk-high)"
      : charCount >= WARN_CHARS
      ? "var(--risk-medium)"
      : "var(--primary)";

  const progressPct = Math.min((charCount / MAX_CHARS) * 100, 100);

  // Estimated time copy
  const estimatedTime =
    charCount < 100
      ? "~5s"
      : charCount < 500
      ? "~10s"
      : charCount < 2000
      ? "~15s"
      : "~20s";

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    if (val.length >= MIN_CHARS && phase === "idle") setPhase("typing");
    if (val.length < MIN_CHARS && phase === "typing") setPhase("idle");
  }

  function fillPrompt(prompt: string) {
    setText(prompt);
    setPhase("typing");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function submit() {
    if (charCount < MIN_CHARS || isLoading) return;
    setPhase("analyzing");
    try {
      const { submissionId, trustScore, riskLevel, explanation } =
        await analyzeSubmission({ inputText: text.trim() });
      setResult({ submissionId, trustScore, riskLevel, explanation });
      setPhase("result");
      setTimeout(() => {
        navigate({ to: "/results/$id", params: { id: submissionId } });
      }, RESULT_DISPLAY_MS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
      setPhase(charCount >= MIN_CHARS ? "typing" : "idle");
    }
  }

  return (
    <div
      className="min-h-screen px-6 py-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            New submission
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Describe a person, company, or transaction — TrustLayer returns a
            trust score, risk level, and explanation.
          </p>
        </motion.div>

        {/* ── Two-column layout ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">

          {/* ── LEFT — Form ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          >
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                opacity: isLoading ? 0.7 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                disabled={isLoading || phase === "result"}
                placeholder="e.g. A 3-month-old shell company headquartered in a low-tax jurisdiction requested a wire transfer of $48,000 from a new client invoice with no prior history…"
                rows={12}
                maxLength={MAX_CHARS}
                className="w-full resize-none rounded-lg p-4 text-sm leading-relaxed outline-none"
                style={{
                  backgroundColor: "var(--input)",
                  border: "1px solid var(--input-border)",
                  color: "var(--foreground)",
                  borderRadius: "10px",
                  fontFamily: "Space Grotesk, sans-serif",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--input-focus)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(30,122,69,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--input-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              {/* Progress bar */}
              <div
                className="mt-2 overflow-hidden rounded-full"
                style={{ height: 3, backgroundColor: "var(--border)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: progressColor }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              {/* Counter + submit row */}
              <div className="mt-3 flex items-center justify-between">
                <motion.span
                  className="data-mono text-xs tabular-nums"
                  style={{ color: counterColor }}
                >
                  <motion.span>{displayCount}</motion.span> / {MAX_CHARS}
                </motion.span>

                <motion.button
                  onClick={submit}
                  disabled={charCount < MIN_CHARS || isLoading || phase === "result"}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
                  style={{
                    backgroundColor:
                      charCount < MIN_CHARS || phase === "result"
                        ? "var(--muted)"
                        : "var(--primary)",
                    cursor:
                      charCount < MIN_CHARS || isLoading || phase === "result"
                        ? "not-allowed"
                        : "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.span
                        key="loader"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="send"
                        initial={{ opacity: 0, rotate: 90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: -90 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Send className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isLoading ? "Analyzing…" : "Analyze"}
                </motion.button>
              </div>
            </div>

            {/* ── Collapsible tips ──────────────────────────────────────── */}
            <div
              className="mt-3 overflow-hidden rounded-xl"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
              }}
            >
              <button
                onClick={() => setTipsOpen((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-smooth"
                style={{ color: "var(--foreground)" }}
              >
                <span className="flex items-center gap-2">
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: "var(--primary)" }}
                  />
                  What makes a good submission?
                </span>
                <motion.span
                  animate={{ rotate: tipsOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown
                    className="h-4 w-4"
                    style={{ color: "var(--muted-foreground)" }}
                  />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {tipsOpen && (
                  <motion.div
                    key="tips"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ul
                      className="space-y-2 px-5 pb-4"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      {TIPS.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 pt-3 text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <span
                            className="data-mono mt-0.5 text-xs font-bold"
                            style={{ color: "var(--primary)" }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── RIGHT — Chat/assistant panel ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >

            {/* Assistant panel */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                minHeight: 280,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--accent-light)" }}
                >
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--primary)" }}
                  />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: "Syne, sans-serif", color: "var(--foreground)" }}
                >
                  TrustLayer
                </span>
                <span
                  className="ml-auto flex items-center gap-1 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--primary)" }}
                  />
                  Ready
                </span>
              </div>

              {/* Phase: idle — show prompt chips */}
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div
                    key="chips"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p
                      className="mb-3 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Try an example to get started:
                    </p>
                    <motion.div
                      className="flex flex-col gap-2"
                      variants={{
                        show: { transition: { staggerChildren: 0.08 } },
                      }}
                      initial="hidden"
                      animate="show"
                    >
                      {EXAMPLE_PROMPTS.map((prompt, i) => (
                        <motion.button
                          key={i}
                          variants={{
                            hidden: { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0 },
                          }}
                          onClick={() => fillPrompt(prompt)}
                          className="rounded-lg px-3 py-2.5 text-left text-xs leading-relaxed transition-smooth"
                          style={{
                            backgroundColor: "var(--accent-light)",
                            border: "1px solid var(--accent-light-border)",
                            color: "var(--foreground)",
                            cursor: "pointer",
                          }}
                          whileHover={{
                            backgroundColor: "var(--accent-light-border)",
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {prompt.slice(0, 80)}…
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {/* Phase: typing — show word count + estimated time */}
                {phase === "typing" && (
                  <motion.div
                    key="typing-info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-4"
                  >
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Looking good. Hit Analyze when you're ready.
                    </p>
                    <div className="flex flex-col gap-3">
                      <StatRow
                        label="Words"
                        value={text.trim().split(/\s+/).filter(Boolean).length}
                      />
                      <StatRow label="Characters" value={charCount} />
                      <StatRow label="Est. analysis time" value={estimatedTime} />
                    </div>
                    <div
                      className="rounded-lg p-3 text-xs leading-relaxed"
                      style={{
                        backgroundColor: "var(--accent-light)",
                        border: "1px solid var(--accent-light-border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Clock
                        className="mb-1 h-3.5 w-3.5 inline-block mr-1"
                        style={{ color: "var(--primary)" }}
                      />
                      More detail leads to a higher-confidence analysis.
                    </div>
                  </motion.div>
                )}

                {/* Phase: analyzing — thinking dots */}
                {phase === "analyzing" && (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center gap-4 py-8"
                  >
                    <ThinkingDots />
                    <p
                      className="text-xs text-center"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Analyzing your submission…
                      <br />
                      <span style={{ color: "var(--primary)" }}>
                        This takes {estimatedTime}
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* Phase: result — brief result card before redirect */}
                {phase === "result" && result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col gap-3"
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      Analysis complete ✓
                    </p>
                    <div
                      className="rounded-lg p-4 space-y-3"
                      style={{
                        backgroundColor: "var(--accent-light)",
                        border: "1px solid var(--accent-light-border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Trust score
                        </span>
                        <span
                          className="data-mono text-2xl font-bold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {result.trustScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Risk level
                        </span>
                        <RiskBadge level={result.riskLevel} />
                      </div>
                      <p
                        className="text-xs leading-relaxed pt-1"
                        style={{
                          color: "var(--muted-foreground)",
                          borderTop: "1px solid var(--accent-light-border)",
                          paddingTop: 8,
                        }}
                      >
                        {result.explanation.slice(0, 120)}
                        {result.explanation.length > 120 ? "…" : ""}
                      </p>
                    </div>
                    <p
                      className="text-xs text-center"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Redirecting to full results…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── ThinkingDots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <motion.div
      className="flex items-center gap-1.5"
      variants={{
        animate: { transition: { staggerChildren: 0.18, repeat: Infinity, repeatType: "mirror" } },
      }}
      initial="initial"
      animate="animate"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: "var(--primary)",
          }}
          variants={{
            initial: { opacity: 0.3, scale: 0.8 },
            animate: {
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
              transition: { duration: 0.9, repeat: Infinity, delay: i * 0.18 },
            },
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── StatRow ─────────────────────────────────────────────────────────────────
function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <span
        className="data-mono text-xs font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}