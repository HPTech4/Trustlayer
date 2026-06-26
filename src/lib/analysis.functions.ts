import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const InputSchema = z.object({ inputText: z.string().min(10).max(5000) });

interface AIResult {
  trust_score: number;
  risk_level: "low" | "medium" | "high";
  explanation: string;
}

const VALID_RISK_LEVELS = ["low", "medium", "high"] as const;

async function callAI(inputText: string): Promise<AIResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: {
            text: "You are TrustLayer, a risk analysis engine. Given any text (a person, company, or transaction description), assess trustworthiness and risk. Be objective and concise. Respond with ONLY a raw JSON object — no markdown, no code fences, no commentary before or after. The JSON object must contain exactly these fields: trust_score (integer 0-100, where 100 is completely trustworthy), risk_level (must be exactly one of: 'low', 'medium', or 'high'), and explanation (2-4 sentences).",
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

  const cleaned = textContent.replace(/```json\s*|```/g, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Raw Gemini text that failed to parse:", textContent);
    throw new Error("Could not parse Gemini response as JSON");
  }

  const trustScore = Number(parsed.trust_score);
  if (Number.isNaN(trustScore)) {
    throw new Error(`Invalid trust_score from Gemini: ${parsed.trust_score}`);
  }

  const riskLevelRaw = String(parsed.risk_level ?? "").toLowerCase().trim();
  if (!VALID_RISK_LEVELS.includes(riskLevelRaw as (typeof VALID_RISK_LEVELS)[number])) {
    throw new Error(`Invalid risk_level from Gemini: ${parsed.risk_level}`);
  }

  if (!parsed.explanation || typeof parsed.explanation !== "string") {
    throw new Error("Missing or invalid explanation from Gemini");
  }

  return {
    trust_score: Math.max(0, Math.min(100, Math.round(trustScore))),
    risk_level: riskLevelRaw as "low" | "medium" | "high",
    explanation: parsed.explanation.trim(),
  };
}

export async function analyzeSubmission(inputData: unknown): Promise<{
  submissionId: string;
  trustScore: number;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
}> {
  const data = InputSchema.parse(inputData);

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) throw new Error("Unauthorized");
  const userId = session.session.user.id;

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
    const { error: updateErr } = await supabase
      .from("submissions")
      .update({ status: "completed" })
      .eq("id", sub.id);
    if (updateErr) throw updateErr;

    return {
      submissionId: sub.id,
      trustScore: ai.trust_score,
      riskLevel: ai.risk_level,
      explanation: ai.explanation,
    };
  } catch (e) {
    await supabase.from("submissions").update({ status: "failed" }).eq("id", sub.id);
    throw e instanceof Error ? e : new Error("Analysis failed");
  }
}