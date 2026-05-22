import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { analyzeSubmission } from "@/lib/analysis.functions";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/submit")({
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (text.trim().length < 10) {
      toast.error("Please enter at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      const { submissionId } = await analyzeSubmission({ inputText: text.trim() });
      toast.success("Analysis complete");
      navigate({ to: "/results/$id", params: { id: submissionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{backgroundColor: '#F4F6FB'}} className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="animate-slide-down">
          <h1 className="text-3xl font-bold" style={{color: '#0F172A', fontFamily: "'Syne', sans-serif"}}>New submission</h1>
          <p className="mt-2 text-sm" style={{color: '#9AA3B8'}}>
            Describe a person, company, or transaction. TrustLayer will return a trust score, risk level, and explanation.
          </p>
        </div>

        <div className="mt-6 rounded-lg p-6 animate-slide-up" style={{backgroundColor: '#FFFFFF', border: '1px solid #E4E9F2'}}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. A 3-month-old shell company headquartered in a low-tax jurisdiction requested a wire transfer of $48,000 from a new client invoice with no prior history…"
            rows={12}
            maxLength={5000}
            className="w-full resize-none rounded-lg p-4 text-sm leading-relaxed outline-none transition-smooth"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E9F2',
              color: '#0F172A',
              borderRadius: '12px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E4E9F2';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums" style={{color: '#9AA3B8'}}>{text.length} / 5000</span>
            <button
              onClick={submit}
              disabled={loading || text.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105"
              style={{
                backgroundColor: '#4F46E5',
                opacity: loading || text.trim().length < 10 ? 0.6 : 1
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
