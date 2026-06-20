import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  // No beforeLoad session redirect here on purpose: this page relies on the
  // short-lived recovery session Supabase creates when the person clicks the
  // emailed reset link, and that session shouldn't bounce them to /dashboard.
  component: ResetPasswordPage,
});

const EMAIL_TIMEOUT_MS = 2500;

const inputClasses =
  "mt-2 w-full rounded-lg border bg-[#F8FBF9] px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/40";

const inputBorder = (hasError: boolean) =>
  hasError ? "border-red-300 focus:border-red-500" : "border-emerald-900/10 focus:border-emerald-500";

function validatePassword(value: string): string | undefined {
  if (!value) return "Enter a new password.";
  if (value.length < 6) return "Password must be at least 6 characters.";
  return undefined;
}

function validateConfirmPassword(confirm: string, original: string): string | undefined {
  if (!confirm) return "Confirm your new password.";
  if (confirm !== original) return "Passwords don't match.";
  return undefined;
}

type Status = "checking" | "ready" | "invalid" | "success";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const passwordId = useId();
  const confirmId = useId();

  useEffect(() => {
    // Supabase parses the recovery token from the URL on client init and
    // fires a PASSWORD_RECOVERY auth event — that's the reliable signal that
    // this visit came from a valid, unexpired reset link.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // Fallback for the case where that event fired before this listener was
    // attached: if a session already exists, treat the link as valid too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((current) => (current === "checking" ? "ready" : current));
    });

    // If neither the event nor an existing session shows up in time, the
    // link is missing, expired, or already used.
    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, EMAIL_TIMEOUT_MS);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);
    if (passwordError || confirmError) {
      setErrors({ password: passwordError, confirmPassword: confirmError });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3FAF5] px-4 py-12">
      <div className="w-full max-w-sm animate-slide-up">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3FAF5]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center rounded-xl border border-emerald-900/10 bg-white p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600">
            <Shield className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-['Sora'] text-2xl font-bold text-slate-900">TrustLayer</h1>
          <p className="mt-2 text-sm text-slate-500">
            {status === "success" ? "Password updated" : "Set a new password"}
          </p>
        </div>

        {status === "checking" ? (
          <div className="rounded-xl border border-emerald-900/10 bg-white p-8 text-center text-sm text-slate-500">
            Checking your reset link…
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="rounded-xl border border-emerald-900/10 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Back to sign in
            </Link>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="rounded-xl border border-emerald-900/10 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              Your password has been updated. You can now sign in with it.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Continue to sign in
            </button>
          </div>
        ) : null}

        {status === "ready" ? (
          <form
            onSubmit={submit}
            noValidate
            className="space-y-4 rounded-xl border border-emerald-900/10 bg-white p-8"
          >
            <div>
              <label htmlFor={passwordId} className="text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id={passwordId}
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${passwordId}-error` : `${passwordId}-hint`}
                className={`${inputClasses} ${inputBorder(Boolean(errors.password))}`}
                placeholder="••••••••"
              />
              {errors.password ? (
                <p id={`${passwordId}-error`} className="mt-1.5 text-xs text-red-600">
                  {errors.password}
                </p>
              ) : (
                <p id={`${passwordId}-hint`} className="mt-1.5 text-xs text-slate-500">
                  At least 6 characters.
                </p>
              )}
            </div>

            <div>
              <label htmlFor={confirmId} className="text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id={confirmId}
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? `${confirmId}-error` : undefined}
                className={`${inputClasses} ${inputBorder(Boolean(errors.confirmPassword))}`}
                placeholder="••••••••"
              />
              {errors.confirmPassword ? (
                <p id={`${confirmId}-error`} className="mt-1.5 text-xs text-red-600">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}