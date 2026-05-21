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
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New submission</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe a person, company, or transaction. TrustLayer will return a trust score, risk level, and explanation.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. A 3-month-old shell company headquartered in a low-tax jurisdiction requested a wire transfer of $48,000 from a new client invoice with no prior history…"
          rows={12}
          maxLength={5000}
          className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm leading-relaxed outline-none ring-ring focus:ring-2"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">{text.length} / 5000</span>
          <button
            onClick={submit}
            disabled={loading || text.trim().length < 10}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}
