import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useState, type FormEvent } from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof Error === false) throw err; // re-throw the redirect
    }
  },
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClasses =
  "mt-2 w-full rounded-lg border bg-[var(--input)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:bg-[var(--card)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40";

const inputBorder = (hasError: boolean) =>
  hasError
    ? "border-[var(--risk-high-border)] focus:border-[var(--risk-high)]"
    : "border-[var(--input-border)] focus:border-[var(--input-focus)]";

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Enter your email.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return "Enter your password.";
  if (value.length < 6) return "Password must be at least 6 characters.";
  return undefined;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const emailId = useId();
  const passwordId = useId();

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setInfoMessage(null);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = mode === "forgot" ? undefined : validatePassword(password);
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setInfoMessage(`We sent a password reset link to ${email}. Check your inbox.`);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/confirm" },
        });
        if (error) throw error;
        // Land the person back on sign-in with a clear next step, instead of
        // leaving the signup form (and password field) sitting on screen.
        setPassword("");
        setMode("signin");
        setInfoMessage(`We sent a confirmation link to ${email}. Confirm it, then sign in below.`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "signin" ? "Sign in to your account" : mode === "signup" ? "Create an account" : "Reset your password";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-sm animate-slide-up">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]">
            <Shield className="h-6 w-6 text-[var(--primary-foreground)]" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-['Sora'] text-2xl font-bold text-[var(--foreground)]">TrustLayer</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{heading}</p>
        </div>

        {infoMessage ? (
          <div
            role="status"
            className="mb-4 rounded-lg border border-[var(--risk-low-border)] bg-[var(--risk-low-bg)] px-4 py-3 text-sm text-[var(--risk-low)]"
          >
            {infoMessage}
          </div>
        ) : null}

        <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
          <div>
            <label htmlFor={emailId} className="text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
              className={`${inputClasses} ${inputBorder(Boolean(errors.email))}`}
              placeholder="you@example.com"
            />
            {errors.email ? (
              <p id={`${emailId}-error`} className="mt-1.5 text-xs text-[var(--risk-high)]">
                {errors.email}
              </p>
            ) : null}
          </div>

          {mode !== "forgot" ? (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={passwordId} className="text-sm font-medium text-[var(--foreground)]">
                  Password
                </label>
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="rounded-sm text-xs font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <input
                id={passwordId}
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? `${passwordId}-error` : mode === "signup" ? `${passwordId}-hint` : undefined
                }
                className={`${inputClasses} ${inputBorder(Boolean(errors.password))}`}
                placeholder="••••••••"
              />
              {errors.password ? (
                <p id={`${passwordId}-error`} className="mt-1.5 text-xs text-[var(--risk-high)]">
                  {errors.password}
                </p>
              ) : mode === "signup" ? (
                <p id={`${passwordId}-hint`} className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                  At least 6 characters.
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        {mode === "forgot" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("signin")}
            className="mt-6 w-full rounded-sm text-center text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full rounded-sm text-center text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        )}
      </div>
    </div>
  );
}