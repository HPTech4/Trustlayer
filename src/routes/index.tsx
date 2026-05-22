import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Zap, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="gradient-bg min-h-screen">
      {/* Header */}
      <header className="animate-slide-down border-b" style={{backgroundColor: '#FFFFFF', borderColor: '#E4E9F2'}}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{backgroundColor: '#4F46E5'}}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="brand-name text-lg" style={{color: '#0F172A'}}>TrustLayer</span>
          </div>
          <Link to="/login" className="text-sm font-medium transition-smooth" style={{color: '#4F46E5'}} onMouseEnter={(e) => e.currentTarget.style.color = '#4338CA'} onMouseLeave={(e) => e.currentTarget.style.color = '#4F46E5'}>
            Sign in →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b" style={{backgroundColor: '#FFFFFF', borderColor: '#E4E9F2'}}>
        <main className="mx-auto max-w-4xl px-6 py-20">
          {/* Badge */}
          <div className="animate-fade-in flex justify-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm animate-pulse-glow" style={{backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4F46E5'}}>
              <span className="h-2 w-2 rounded-full" style={{backgroundColor: '#4F46E5'}} /> 
              Powered by Gemini 3 Flash
            </div>
          </div>

          {/* Hero Headline */}
          <div className="animate-slide-up text-center">
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl" style={{fontFamily: "'Syne', sans-serif", color: '#0F172A'}}>
              Score <span style={{color: '#4F46E5'}}>trust.</span>
              <br />
              Surface <span style={{color: '#6366F1'}}>risk.</span>
              <br />
              Instantly.
            </h1>
          </div>

          {/* Description */}
          <p className="animate-slide-up delay-100 mx-auto mt-8 max-w-2xl text-center text-lg" style={{color: '#6B7280'}}>
            Paste a description of a person, company, or transaction. TrustLayer returns a trust score, risk level, and a clear explanation in seconds.
          </p>

          {/* CTA Button */}
          <div className="animate-slide-up delay-200 mt-10 flex justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-base font-semibold text-white transition-smooth hover:scale-105"
              style={{
                backgroundColor: '#4F46E5',
              }}
            >
              Get started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </main>
      </section>

      {/* Features Grid */}
      <section style={{backgroundColor: '#F4F6FB'}}>
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="animate-slide-up delay-300 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: "Real-time scoring", desc: "Each submission is analyzed end-to-end in seconds.", iconBg: '#EEF2FF', iconColor: '#4F46E5' },
              { icon: Shield, title: "Explainable results", desc: "Every score comes with a clear, written rationale.", iconBg: '#FDF4FF', iconColor: '#A855F7' },
              { icon: Lock, title: "Yours alone", desc: "Strict row-level security — only you see your data.", iconBg: '#EFF6FF', iconColor: '#3B82F6' },
            ].map((f, idx) => (
              <div 
                key={f.title}
                className="group rounded-2xl p-6 transition-smooth cursor-pointer"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E9F2',
                  borderRadius: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(79, 70, 229, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg transition-smooth" style={{backgroundColor: f.iconBg}}>
                  <f.icon className="h-6 w-6" style={{color: f.iconColor}} />
                </div>
                <div className="mt-4 text-sm font-semibold" style={{color: '#0F172A'}}>{f.title}</div>
                <div className="mt-2 text-sm leading-relaxed" style={{color: '#9AA3B8'}}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="animate-fade-in delay-400 mt-16 text-center">
            <p className="text-sm" style={{color: '#9AA3B8'}}>
              Trusted by security professionals and compliance teams
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
