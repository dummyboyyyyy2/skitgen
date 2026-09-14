// Backend orchestration for the Couple Content Generator ONLY.
// This mirrors Solo's task-based /api/generate architecture, but every prompt,
// route, database table, and output remains Couple-specific.

import { safeJSONParse } from "@/lib/gemini";
import { callAI } from "@/lib/ai";
import {
  COUPLE_COMEDY_PROFILE,
  COUPLE_COMEDY_VERIFIER,
  buildCoupleIdeaPrompt,
  buildCoupleVibePrompt,
  buildCoupleTonePrompt,
  buildCoupleScriptPrompt,
  buildCoupleRefinePrompt,
  buildCoupleVerificationPrompt,
  buildCoupleSampleAnalysisPrompt,
  buildCoupleDNASynthesisPrompt,
  buildCoupleDNAUpdatePrompt,
  buildCoupleAvoidNotePrompt,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

const providerFor = (action) =>
  ["script", "refine"].includes(action) ? "openrouter" : "gemini";

const providerError = (err) => {
  const message = err?.message || "Unexpected API error.";
  const isConfig = /API_KEY is not configured|API_KEY is not set/.test(message);
  return Response.json({
    error: message,
    ...(err?.code ? { code: err.code } : {}),
    ...(err?.provider ? { provider: err.provider } : {}),
    ...(err?.retryAfter != null ? { retryAfter: err.retryAfter } : {}),
  }, { status: err?.code === "RATE_LIMIT_EXHAUSTED" ? 429 : isConfig ? 503 : 500 });
};

// SHARED-ARCHITECTURE RULE: this route mirrors Solo pipeline mechanics for consistency.
// Couple remains creatively independent: keep its DNA schema, prompts, examples, and output semantics Couple-specific.
export async function POST(req) {
  try {
    const body = await req.json();
    const action = body?.action;
    const provider = providerFor(action);
    // Only meaningful for the two OpenRouter-routed actions below; harmless
    // to have present for other actions since lib/ai.js only reads `model`
    // in its openrouter branch.
    const modelOption = body?.openrouterModel ? { model: body.openrouterModel } : {};

    switch (action) {
      case "ideas": {
        const { formatLabel, formatDesc, dna, avoidNotes = [] } = body;
        const ai = await callAI({
          provider,
          prompt: buildCoupleIdeaPrompt(formatLabel, formatDesc, dna, avoidNotes),
          maxTokens: 900,
          options: { lite: true, temperature: 0.85 },
        });
        const parsed = safeJSONParse(ai.text, []);
        return Response.json({ ideas: Array.isArray(parsed) ? parsed : [], usage: ai.usage });
      }

      case "vibe": {
        const { situation, vibes } = body;
        if (!String(situation || "").trim()) return Response.json({ error: "situation is required" }, { status: 400 });
        const ai = await callAI({
          provider,
          prompt: buildCoupleVibePrompt(String(situation).trim(), String(vibes || "")),
          maxTokens: 220,
          options: { lite: true, temperature: 0.2 },
        });
        const parsed = safeJSONParse(ai.text);
        return Response.json({ vibeId: parsed?.vibeId || null, reason: parsed?.reason || null, usage: ai.usage });
      }

      case "tone": {
        const { situation, formatLabel, formatDesc, creativeDna = "" } = body;
        const ai = await callAI({
          provider,
          prompt: buildCoupleTonePrompt(String(situation || "").trim(), formatLabel, formatDesc, creativeDna),
          maxTokens: 220,
          options: { lite: true, temperature: 0.3 },
        });
        const parsed = safeJSONParse(ai.text);
        return Response.json({ tone: parsed?.tone || null, reason: parsed?.reason || null, usage: ai.usage });
      }

      case "script": {
        const prompt = buildCoupleScriptPrompt(body);
        const scriptTokenBudget = body.formatLabel === "Text Overlay" ? 1800 : 3200;
        const draftAI = await callAI({
          provider,
          system: COUPLE_COMEDY_PROFILE,
          prompt,
          maxTokens: scriptTokenBudget,
          options: { temperature: 0.9, ...modelOption },
        });
        const text = draftAI.text;
        const verifyTokenBudget = Math.max(500, Math.round(scriptTokenBudget * 0.7));
        const verifiedAI = await callAI({
          provider,
          system: COUPLE_COMEDY_VERIFIER,
          prompt: buildCoupleVerificationPrompt(text, prompt, body.avoidNotes || []),
          maxTokens: verifyTokenBudget,
          options: { temperature: 0.3, retries: 2, ...modelOption },
        });
        const verified = safeJSONParse(verifiedAI.text);
        const finalText = verified ? JSON.stringify(verified) : text;
        return Response.json({
          text: finalText,
          usage: {
            inputTokens: (draftAI.usage?.inputTokens || 0) + (verifiedAI.usage?.inputTokens || 0),
            outputTokens: (draftAI.usage?.outputTokens || 0) + (verifiedAI.usage?.outputTokens || 0),
            totalTokens: (draftAI.usage?.totalTokens || 0) + (verifiedAI.usage?.totalTokens || 0),
          },
        });
      }

      case "refine": {
        const { originalResult, feedback, dna } = body;
        const ai = await callAI({
          provider,
          system: COUPLE_COMEDY_PROFILE,
          prompt: buildCoupleRefinePrompt(originalResult, feedback, dna),
          maxTokens: 3000,
          options: { temperature: 0.78, ...modelOption },
        });
        return Response.json({ text: ai.text, usage: ai.usage });
      }

      case "analyzeSample": {
        const content = String(body.content || "");
        const trimmed = content.length > 6000
          ? content.slice(0, 6000) + "\n\n[...truncated for analysis, sample exceeded length cap...]"
          : content;
        const ai = await callAI({
          provider,
          prompt: buildCoupleSampleAnalysisPrompt(trimmed, body.title, body.sampleType, body.formatLabel, body.formatDesc),
          maxTokens: 1800,
          options: { temperature: 0.2 },
        });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the Couple Comedy DNA analysis. Try reanalyzing this sample." }, { status: 422 });
        return Response.json({ analysis: parsed, usage: ai.usage });
      }

      case "synthesizeDNA": {
        const ai = await callAI({
          provider,
          prompt: buildCoupleDNASynthesisPrompt(body.analyses || []),
          maxTokens: 4000,
          options: { temperature: 0.2 },
        });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the Couple Comedy DNA synthesis response." }, { status: 422 });
        return Response.json({ dna: parsed, usage: ai.usage });
      }

      case "updateDNA": {
        const ai = await callAI({
          provider,
          prompt: buildCoupleDNAUpdatePrompt(body.existingDNA, body.newAnalyses || []),
          maxTokens: 4000,
          options: { temperature: 0.2 },
        });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the Couple Comedy DNA update response." }, { status: 422 });
        return Response.json({ dna: parsed, usage: ai.usage });
      }

      case "distillAvoidNote": {
        if (!String(body.script || "").trim()) return Response.json({ error: "script is required" }, { status: 400 });
        const ai = await callAI({
          provider,
          prompt: buildCoupleAvoidNotePrompt(String(body.script), String(body.reason || "")),
          maxTokens: 120,
          options: { lite: true, temperature: 0.15 },
        });
        return Response.json({ note: String(ai.text || "").trim(), usage: ai.usage });
      }

      default:
        return Response.json({ error: `Unknown Couple action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return providerError(err);
  }
}
