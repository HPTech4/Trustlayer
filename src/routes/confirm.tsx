import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/confirm")({
  component: ConfirmPage,
});

type Status = "checking" | "success" | "error";

function ConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Supabase automatically parses the token from the URL hash on load
    // and fires an auth state change — we just need to listen for it
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setStatus("success");
      }
    });

    // Fallback — if the token was already consumed before listener attached
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }
      if (data.session) {
        setStatus((current) => (current === "checking" ? "success" : current));
      }
    });

    // If nothing resolves in 4 seconds, the link is invalid or expired
    const timeout = setTimeout(() => {
      setStatus((current) => {
        if (current === "checking") {
          setErrorMessage("This confirmation link is invalid or has expired.");
          return "error";
        }
        return current;
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3FAF5] px-4 py-12">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center rounded-xl border border-emerald-900/10 bg-white p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600">
            <Shield className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-['Sora'] text-2xl font-bold text-slate-900">
            TrustLayer
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {status === "checking"
              ? "Verifying your email…"
              : status === "success"
              ? "Email confirmed"
              : "Confirmation failed"}
          </p>
        </div>

        {/* Checking */}
        {status === "checking" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-900/10 bg-white p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-500">
              Confirming your account, just a moment…
            </p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-900/10 bg-white p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Welcome to TrustLayer!
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                Your email has been confirmed. You're all set to start analysing trust.
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Go to dashboard
            </button>
            <Link
              to="/login"
              className="text-xs text-slate-400 transition-colors hover:text-emerald-700"
            >
              Or sign in manually
            </Link>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-900/10 bg-white p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Link invalid or expired
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                {errorMessage ?? "This confirmation link has already been used or has expired."}
              </p>
            </div>
            <Link
              to="/login"
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Back to sign in
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}