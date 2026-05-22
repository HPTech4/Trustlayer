import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{backgroundColor: '#F4F6FB'}}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center rounded-xl p-8" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{backgroundColor: '#4F46E5'}}>
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold brand-name" style={{color: '#0F172A'}}>TrustLayer</h1>
          <p className="mt-2 text-sm" style={{color: '#9AA3B8'}}>
            {mode === "signin" ? "Sign in to your account" : "Create an account"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl p-8" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg px-4 py-3 text-sm outline-none transition-smooth"
              style={{
                backgroundColor: '#F8F9FC',
                border: '1px solid #E4E9F2',
                color: '#0F172A'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E4E9F2';
                e.currentTarget.style.backgroundColor = '#F8F9FC';
              }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg px-4 py-3 text-sm outline-none transition-smooth"
              style={{
                backgroundColor: '#F8F9FC',
                border: '1px solid #E4E9F2',
                color: '#0F172A'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E4E9F2';
                e.currentTarget.style.backgroundColor = '#F8F9FC';
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-smooth"
            style={{
              backgroundColor: '#4F46E5',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#4338CA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4F46E5';
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 w-full text-center text-sm transition-smooth"
          style={{color: '#9AA3B8'}}
          onMouseEnter={(e) => e.currentTarget.style.color = '#4F46E5'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9AA3B8'}
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
