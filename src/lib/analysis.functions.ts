import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({ inputText: z.string().min(10).max(5000) });

interface AIResult {
  trust_score: number;
  risk_level: "low" | "medium" | "high";
  explanation: string;
}

async function callAI(inputText: string): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: {
            text: "You are TrustLayer, a risk analysis engine. Given any text (a person, company, or transaction description), assess trustworthiness and risk. Be objective and concise. Always respond with a JSON object containing: trust_score (0-100), risk_level ('low', 'medium', or 'high'), and explanation (2-4 sentences).",
          },
        },
        contents: [
          {
            parts: [
              {
                text: inputText,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error("Malformed Gemini response");

  let parsed;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw new Error("Could not parse Gemini response as JSON");
  }

  return {
    trust_score: Math.max(0, Math.min(100, Number(parsed.trust_score))),
    risk_level: parsed.risk_level,
    explanation: String(parsed.explanation),
  };
}

export const analyzeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }: { data: typeof InputSchema._type; context: any }) => {
    const { supabase, userId } = context;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key not configured");

    const { data: sub, error: insErr } = await supabase
      .from("submissions")
      .insert({ user_id: userId, input_text: data.inputText, status: "pending" })
      .select()
      .single();
    if (insErr || !sub) throw new Error(insErr?.message ?? "Could not create submission");

    try {
      const ai = await callAI(data.inputText);
      const { error: rErr } = await supabase.from("results").insert({
        submission_id: sub.id,
        trust_score: ai.trust_score,
        risk_level: ai.risk_level,
        explanation: ai.explanation,
      });
      if (rErr) throw rErr;
      const { error: updateErr } = await supabase.from("submissions").update({ status: "completed" }).eq("id", sub.id);
      if (updateErr) throw updateErr;
      return { submissionId: sub.id };
    } catch (e) {
      await supabase.from("submissions").update({ status: "failed" }).eq("id", sub.id);
      throw e instanceof Error ? e : new Error("Analysis failed");
    }
  });
