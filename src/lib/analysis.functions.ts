import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Validate the user input before touching the database or AI service.
const InputSchema = z.object({ inputText: z.string().min(10).max(5000) });

// Shape returned by the Gemini model after parsing its JSON response.
interface AIResult {
  trust_score: number;
  risk_level: "low" | "medium" | "high";
  explanation: string;
}

// Restrict accepted risk levels to the values the UI expects.
const VALID_RISK_LEVELS = ["low", "medium", "high"] as const;

// Send the user text to Gemini and normalize the response into our app format.
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
    text: `You are TrustLayer, a fraud and risk analysis engine specialized in scams common in Nigeria and West Africa. Given any text (a message, person description, company, investment pitch, or transaction), assess trustworthiness and risk.

Watch specifically for these patterns:
- Romance scams: urgency to move off-platform, requests for money/gift cards, inconsistent personal details, avoiding video calls
- Investment/crypto fraud: guaranteed high returns, pressure to act fast, unregistered platforms, referral/pyramid structure
- Fake job offers: upfront payment for training/equipment, vague company details, unsolicited offers with high pay
- Phishing: fake bank/delivery alerts, urgent account suspension threats, suspicious links, requests for OTP/PIN
- Advance-fee fraud: promises of large sums (inheritance, lottery, contracts) requiring an upfront fee to release
- Fake customs/clearance fees: requests for payment to release a package or shipment

Be objective, evidence-based, and concise. Do not classify something as high risk just because it involves money — legitimate transactions exist. Base your assessment on concrete red flags in the text, not assumptions.

If the text is too short, vague, or lacks any identifiable content to assess (e.g. a greeting, single word, or small talk with no claims, requests, or transactional content), do NOT default to a middle score. Instead, return trust_score of 95, risk_level "low", and explanation stating there is insufficient content to perform a risk assessment.

Respond with ONLY a raw JSON object — no markdown, no code fences, no commentary before or after. The JSON object must contain exactly these fields: trust_score (integer 0-100, where 100 is completely trustworthy), risk_level (must be exactly one of: 'low', 'medium', or 'high'), and explanation (2-4 sentences citing the specific red flags found, or stating why it appears legitimate).`,
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

// Entry point for the submission flow: create a pending record, analyze it,
// persist the result, and then mark the submission as complete or failed.
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