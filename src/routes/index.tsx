import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Shield,
  ShieldCheck,
  Zap,
  Lock,
  KeyRound,
  EyeOff,
  Ban,
  ArrowRight,
  FileText,
  Cpu,
  Gauge,
  ScanLine,
  MessageSquareText,
  ChevronDown,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Fail open: if the session check itself errors (network blip, outage),
    // we should still render the landing page rather than crash the route.
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error === false) throw err; // re-throw the redirect
    }
  },
  component: Landing,
});

/* ----------------------------------------------------------------------- */
/* Static content — declared outside the component so it isn't re-created  */
/* on every render, and so each section's data lives next to its meaning.  */
/* ----------------------------------------------------------------------- */

const TECH_TRUST_ITEMS = [
  { icon: Cpu, label: "Powered by Gemini 3 Flash" },
  { icon: Lock, label: "Built on Supabase Row-Level Security" },
  { icon: Zap, label: "Real-time analysis" },
  { icon: ShieldCheck, label: "Encrypted at rest" },
];

const DIFFERENTIATION_POINTS = [
  {
    icon: MessageSquareText,
    title: "Explainable, not just a verdict",
    desc: "Most scam detectors stop at a red flag. TrustLayer writes out the specific signals it found, in plain English, so you understand the call instead of just trusting it.",
  },
  {
    icon: Gauge,
    title: "A score you can reason about",
    desc: "Every submission gets a 0–100 trust score and a risk level, not a binary safe/unsafe guess — so borderline cases read as borderline, not as a coin flip.",
  },
  {
    icon: ScanLine,
    title: "Built for real-world patterns",
    desc: "Gemini checks links, messages, and transaction details against known phishing and fraud patterns in real time, not a static blocklist.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: FileText,
    title: "Paste a link or message",
    desc: "Drop in a suspicious link, text, email, or transaction detail — anything you're unsure about.",
  },
  {
    icon: Cpu,
    title: "Gemini analyzes it",
    desc: "Gemini 3 Flash checks it against known phishing and fraud patterns in real time.",
  },
  {
    icon: Gauge,
    title: "Get your verdict",
    desc: "A trust score, a risk level, and a plain-written explanation — back in seconds.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time scoring",
    desc: "Each link, message, or transaction is checked end-to-end in seconds.",
  },
  {
    icon: Shield,
    title: "Explainable results",
    desc: "Every verdict comes with a clear, written rationale — never a black box.",
  },
  {
    icon: Lock,
    title: "Yours alone",
    desc: "Strict row-level security — only you see what you submit.",
  },
];

const WHY_TRUST_POINTS = [
  { icon: Cpu, label: "AI-powered analysis" },
  { icon: MessageSquareText, label: "Explainable decisions" },
  { icon: ShieldCheck, label: "Secure architecture" },
  { icon: Lock, label: "Privacy-first design" },
  { icon: Zap, label: "Fast, real-time scanning" },
];

const SECURITY_CARDS = [
  {
    icon: Lock,
    title: "Row-Level Security",
    desc: "Database policies enforce that every row you submit is scoped to your account — not just your app code.",
  },
  {
    icon: EyeOff,
    title: "Private scan history",
    desc: "Your past submissions and verdicts are visible only to you, never aggregated into a public feed.",
  },
  {
    icon: KeyRound,
    title: "Encrypted storage",
    desc: "Data is encrypted at rest and in transit between your browser, our servers, and Gemini.",
  },
  {
    icon: Ban,
    title: "No data selling",
    desc: "We don't sell, rent, or share your submissions with advertisers or data brokers. Full stop.",
  },
  {
    icon: ShieldCheck,
    title: "Secure authentication",
    desc: "Sign-in is handled by Supabase Auth, with session tokens that never touch third-party scripts.",
  },
];

type RiskLevel = "low" | "medium" | "high";

const RISK_STYLES: Record<
  RiskLevel,
  { ring: string; badgeBg: string; badgeBorder: string; badgeText: string; dot: string }
> = {
  low: {
    ring: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    badgeText: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  medium: {
    ring: "border-amber-200",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-700",
    dot: "bg-amber-500",
  },
  high: {
    ring: "border-red-200",
    badgeBg: "bg-red-50",
    badgeBorder: "border-red-200",
    badgeText: "text-red-700",
    dot: "bg-red-500",
  },
};

const VERDICTS: { score: number; level: RiskLevel; label: string; desc: string }[] = [
  {
    score: 87,
    level: "low",
    label: "Low risk",
    desc: "Verified domain, matches known sender, no suspicious redirects.",
  },
  {
    score: 54,
    level: "medium",
    label: "Medium risk",
    desc: "Newly registered domain, urgency language, but no confirmed scam match.",
  },
  {
    score: 19,
    level: "high",
    label: "High risk",
    desc: "Mimics a known brand, asks for credentials, flagged phishing pattern.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Does TrustLayer store my data?",
    answer:
      "We store the submissions and verdicts needed to show you your scan history. Each row is protected by Supabase row-level security, so only your account can read it.",
  },
  {
    question: "Can I scan emails?",
    answer:
      "Yes. Paste the email text, sender address, or any link inside it, and TrustLayer will analyze it for phishing and fraud signals the same way it handles any other message.",
  },
  {
    question: "Can I scan transaction requests?",
    answer:
      "Yes. Paste in payment requests, invoice details, or transfer instructions you're unsure about, and TrustLayer checks them against known fraud patterns.",
  },
  {
    question: "How does the trust score work?",
    answer:
      "Gemini 3 Flash evaluates the submission against known phishing and fraud signals and returns a 0–100 score along with a risk level. Higher scores mean fewer risk signals were found.",
  },
  {
    question: "Is my information private?",
    answer:
      "Yes. Your submissions are scoped to your account through row-level security, encrypted at rest and in transit, and never sold or shared with advertisers.",
  },
  {
    question: "How accurate are results?",
    answer:
      "TrustLayer is a decision-support tool, not a guarantee. It's tuned to catch known phishing and fraud patterns, but no detector is perfect — always use judgment alongside the verdict, especially for high-stakes requests.",
  },
];

const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Security & privacy", href: "#security" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
  {
    heading: "Support",
    links: [{ label: "Help center", href: "/support" }],
  },
];

/* ----------------------------------------------------------------------- */
/* Small reusable building blocks                                          */
/* ----------------------------------------------------------------------- */

function IconTile({
  icon: Icon,
  className = "bg-emerald-50 text-emerald-600",
}: {
  icon: typeof Shield;
  className?: string;
}) {
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-7 w-7" />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: typeof Shield;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-7 transition-shadow hover:shadow-[0_10px_25px_rgba(16,185,129,0.12)]">
      <IconTile icon={icon} />
      <div className="mt-5 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-base leading-relaxed text-slate-600">{desc}</div>
    </div>
  );
}

function VerdictCard({
  score,
  level,
  label,
  desc,
  rotate,
}: {
  score: number;
  level: RiskLevel;
  label: string;
  desc: string;
  rotate?: "left" | "right" | "none";
}) {
  const s = RISK_STYLES[level];
  const rotateClass =
    rotate === "left" ? "md:-rotate-3" : rotate === "right" ? "md:rotate-3" : "md:z-10";
  return (
    <div
      className={`w-full max-w-sm rounded-2xl border ${s.ring} bg-white p-7 shadow-sm transition-transform hover:z-10 hover:scale-105 hover:rotate-0 md:-ml-6 md:first:ml-0 ${rotateClass}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="font-mono text-4xl font-semibold text-slate-900" aria-hidden="true">
          {score}
        </span>
        <div
          className={`flex items-center gap-2 rounded-full border ${s.badgeBorder} ${s.badgeBg} px-4 py-1.5`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
          <span className={`font-mono text-sm ${s.badgeText}`}>{label}</span>
        </div>
      </div>
      <p className="text-base leading-relaxed text-slate-600">
        <span className="sr-only">Trust score {score} out of 100. </span>
        {desc}
      </p>
    </div>
  );
}

function AccordionItem({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = `${id}-panel`;
  const buttonId = `${id}-trigger`;
  return (
    <div className="border-b border-emerald-900/10">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold text-slate-900 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3FAF5] rounded-sm"
        >
          <span>{question}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 flex-shrink-0 text-emerald-600 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="pb-5 pr-10 text-base leading-relaxed text-slate-600"
      >
        {answer}
      </div>
    </div>
  );
}

function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white px-7">
      {items.map((item, idx) => (
        <AccordionItem
          key={item.question}
          id={`faq-${idx}`}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === idx}
          onToggle={() => setOpenIndex((current) => (current === idx ? null : idx))}
        />
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      {eyebrow ? (
        <div className="mb-3 font-mono text-sm font-semibold uppercase tracking-wider text-emerald-600">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="font-['Sora'] text-4xl font-extrabold text-slate-900">{title}</h2>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Page                                                                     */
/* ----------------------------------------------------------------------- */

function Landing() {
  return (
    <div className="min-h-screen bg-[#F3FAF5]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="animate-slide-down border-b border-emerald-900/10 bg-[#F3FAF5]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
              <Shield className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-['Sora'] text-xl font-bold text-slate-900">TrustLayer</span>
          </div>
          <nav aria-label="Primary" className="flex items-center gap-4">
            <Link
              to="/login"
              className="rounded-sm text-base font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-base font-semibold text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-emerald-900/10">
          <svg
            className="pointer-events-none absolute -right-24 top-10 hidden h-[420px] w-[420px] opacity-[0.07] lg:block"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M100 10 L170 35 V95 C170 140 140 170 100 190 C60 170 30 140 30 95 V35 Z"
              fill="#10B981"
            />
            <path
              d="M70 100 L92 122 L132 78"
              stroke="#F3FAF5"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <svg
            className="pointer-events-none absolute -left-16 bottom-0 hidden h-64 w-64 opacity-[0.06] lg:block"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="6" fill="none" />
            <circle cx="100" cy="100" r="55" stroke="#10B981" strokeWidth="6" fill="none" />
          </svg>

          <div className="relative mx-auto max-w-4xl px-6 py-14 sm:py-20">
            <div className="animate-fade-in flex justify-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/60 px-5 py-2.5 text-base text-emerald-700 animate-pulse-glow">
                <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                Powered by Gemini 3 Flash
              </div>
            </div>

            <div className="animate-slide-up text-center">
              <h1
                id="hero-heading"
                className="font-['Sora'] text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl lg:text-8xl"
              >
                Is that link safe?
                <br />
                Find out — <span className="text-emerald-600">instantly.</span>
              </h1>
            </div>

            <p className="animate-slide-up delay-100 mx-auto mt-8 max-w-2xl text-center text-base text-slate-600 sm:text-lg md:text-xl">
              Most scam detectors give you a warning and nothing else. TrustLayer
              gives you a trust score, a risk level, and a plain-English
              explanation of exactly what it found — in seconds.
            </p>

            <div className="animate-slide-up delay-200 mt-10 flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-9 sm:py-4 sm:text-lg"
                >
                  Get started
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-6 py-3 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-9 sm:py-4 sm:text-lg"
                >
                  Sign in
                </Link>
              </div>
              <span className="text-base text-slate-600">
                Free to get started — no credit card required.
              </span>
            </div>

            {/* Live demo card: now shows the actual pipeline, not just the end state */}
            <div className="animate-slide-up delay-300 mx-auto mt-14 max-w-xl overflow-hidden rounded-xl border border-emerald-900/10 bg-white text-left shadow-sm">
              <div className="border-b border-emerald-900/10 px-6 py-4 text-sm text-slate-500">
                Sample submission
              </div>
              <div className="px-6 py-5 font-mono text-base leading-relaxed text-slate-700">
                "secure-bankverify-update.com — Urgent: your account will be
                suspended in 24 hours, click to verify your details..."
              </div>

              <ol className="grid grid-cols-1 divide-y divide-emerald-900/10 border-t border-emerald-900/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                <li className="flex items-center gap-3 px-6 py-4">
                  <Cpu className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm text-slate-600">Gemini analyzes the text and link</span>
                </li>
                <li className="flex items-center gap-3 px-6 py-4">
                  <Gauge className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm text-slate-600">A 0–100 trust score is calculated</span>
                </li>
                <li className="flex items-center gap-3 px-6 py-4">
                  <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm text-slate-600">You get a verdict and the reasoning</span>
                </li>
              </ol>

              <div className="flex items-center justify-between border-t border-emerald-900/10 px-6 py-5">
                <div>
                  <div className="mb-1 text-sm text-slate-500">Trust score</div>
                  <div className="font-mono text-3xl font-semibold text-slate-900">8</div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                  <span className="font-mono text-sm text-red-700">High risk</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech trust strip — replaces fabricated company logos with real,
            verifiable claims about how the product is built. */}
        <section aria-label="Built on" className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500">
              Built on technology you can verify
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {TECH_TRUST_ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-slate-700">
                  <item.icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <span className="font-['Sora'] text-base font-semibold">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Differentiation / positioning */}
        <section className="border-b border-emerald-900/10">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionHeading
              eyebrow="Why TrustLayer"
              title="Most scam detectors give warnings. TrustLayer explains why."
              subtitle="A red flag without a reason still leaves you guessing. Every TrustLayer verdict comes with the specific signals behind it."
            />
            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
              {DIFFERENTIATION_POINTS.map((h) => (
                <FeatureCard key={h.title} icon={h.icon} title={h.title} desc={h.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="border-b border-emerald-900/10">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 id="how-it-works-heading" className="sr-only">
              How it works
            </h2>
            <SectionHeading title="How it works" subtitle="Three steps between a paste and a verdict." />

            <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((s, idx) => (
                <li key={s.title} className="text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                    <s.icon className="h-7 w-7 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="mb-1 font-mono text-sm text-slate-500">Step {idx + 1}</div>
                  <div className="mb-2 text-lg font-semibold text-slate-900">{s.title}</div>
                  <div className="text-base leading-relaxed text-slate-600">{s.desc}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-heading" className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 id="features-heading" className="sr-only">
              Features
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* Sample verdicts */}
        <section aria-labelledby="verdicts-heading" className="border-b border-emerald-900/10">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 id="verdicts-heading" className="sr-only">
              Sample verdicts
            </h2>
            <SectionHeading
              title="See the range of outputs"
              subtitle="Every score ships with a level and a reason — not just a number."
            />

            <div className="mt-16 flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center md:gap-0">
              {VERDICTS.map((v, idx) => (
                <VerdictCard
                  key={v.label}
                  {...v}
                  rotate={idx === 0 ? "left" : idx === 2 ? "right" : "none"}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Security & privacy */}
        <section id="security" aria-labelledby="security-heading" className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <SectionHeading
              eyebrow="Security & privacy"
              title="Your data stays yours."
            />
            <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">
              Anything you submit — a link, a message, a transaction — is scoped
              to your account from the database up. Nobody else can read it,
              and we don't monetize it.
            </p>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY_CARDS.map((c) => (
                <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* Why trust TrustLayer — compact strip, deliberately lighter-weight
            than the Security section above so the two don't read as the
            same content twice. */}
        <section aria-labelledby="why-trust-heading" className="border-b border-emerald-900/10">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 id="why-trust-heading" className="sr-only">
              Why teams trust TrustLayer
            </h2>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {WHY_TRUST_POINTS.map((p) => (
                <li key={p.label} className="flex items-center gap-2 text-slate-700">
                  <p.icon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <span className="text-base font-medium">{p.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 id="faq-heading" className="text-center font-['Sora'] text-4xl font-extrabold text-slate-900">
              Frequently asked questions
            </h2>
            <div className="mt-12">
              <Accordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600">
                  <Shield className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <span className="font-['Sora'] text-base font-bold text-slate-900">TrustLayer</span>
              </div>
              <a
                href="mailto:hello@trustlayer.app"
                className="mt-4 inline-flex items-center gap-2 rounded-sm text-sm text-slate-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                hello@trustlayer.app
              </a>
            </div>

            {FOOTER_LINKS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <div className="font-['Sora'] text-sm font-semibold text-slate-900">
                  {col.heading}
                </div>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="rounded-sm text-sm text-slate-600 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-12 border-t border-emerald-900/10 pt-6 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} TrustLayer. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}