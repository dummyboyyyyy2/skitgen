// API route for the Couple Content Generator (/couples) ONLY.
// Separate from /api/generate, /api/dna, /api/samples, which belong to SKIT GEN.
// Holds provider API keys server-side and owns the Couple generation/DNA
// orchestration. Couple data and prompts remain completely separate from Solo.
// Ordinary generation receives the already-built brief from the page; DNA
// training actions are built here from the shared structured-DNA prompt helpers.

import { safeJSONParse } from "@/lib/gemini";
import { callAI, DEFAULT_PROVIDER, isValidProvider } from "@/lib/ai";
import {
  buildCoupleSampleAnalysisPrompt,
  buildCoupleDNASynthesisPrompt,
  buildCoupleDNAUpdatePrompt,
} from "@/lib/prompts";

export const runtime = "nodejs";
// Two sequential calls when verify=true (draft + quality-control pass), same
// as /api/generate — see the note there. Hobby-plan Vercel deployments cap
// this at 60s regardless of the value set here.
export const maxDuration = 90;

export async function POST(req) {
  try {
    const { system, messages, maxTokens, provider: rawProvider, temperature, verify = false } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages is required." }, { status: 400 });
    }

    // Falls back to Couple's own default if omitted or invalid, same pattern
    // as /api/generate — keeps this route working standalone even without a
    // provider field (e.g. direct API calls, tests).
    const provider = isValidProvider(rawProvider) ? rawProvider : DEFAULT_PROVIDER.couple;

    // Single user-turn only (enforced app-wide, see comment above).
    const originalPrompt = messages[0].content;

    // Structured Couple Comedy DNA actions mirror Solo's analyze/synthesize/update
    // pipeline while keeping Couple's provider/data completely separate.
    if (system === "__COUPLE_DNA_ACTION__") {
      let payload = {};
      try { payload = JSON.parse(originalPrompt); } catch {}
      let prompt = "";
      let max = maxTokens || 1800;
      if (payload.action === "analyzeSample") {
        const content = String(payload.content || "");
        const trimmed = content.length > 6000
          ? content.slice(0, 6000) + "\n\n[...truncated for analysis...]"
          : content;
        prompt = buildCoupleSampleAnalysisPrompt(trimmed, payload.title, payload.sampleType, payload.formatLabel, payload.formatDesc);
      } else if (payload.action === "synthesizeDNA") {
        prompt = buildCoupleDNASynthesisPrompt(payload.analyses || []);
        max = maxTokens || 4000;
      } else if (payload.action === "updateDNA") {
        prompt = buildCoupleDNAUpdatePrompt(payload.existingDNA, payload.newAnalyses || []);
        max = maxTokens || 4000;
      } else {
        return Response.json({ error: "Unknown Couple DNA action." }, { status: 400 });
      }
      const dnaAI = await callAI({ provider, prompt, maxTokens: max, options: { temperature: 0.2 } });
      const parsed = safeJSONParse(dnaAI.text);
      if (!parsed) return Response.json({ error: "Couldn't parse the Couple Comedy DNA response." }, { status: 422 });
      if (payload.action === "analyzeSample") return Response.json({ analysis: parsed, usage: dnaAI.usage });
      return Response.json({ dna: parsed, usage: dnaAI.usage });
    }

    const draftAI = await callAI({
      provider,
      system,
      prompt: originalPrompt,
      maxTokens: maxTokens || 1000,
      options: { ...(temperature !== undefined ? { temperature } : {}) },
    });
    const text = draftAI.text;

    if (verify) {
      const verificationSystem = `You are the final quality-control editor for a specific couple comedy creator. Preserve their established voice and the strongest parts of the draft. You are not here to make the writing more polished or generic.`;
      const verificationPrompt = `Review this generated couple-comedy concept against the ORIGINAL GENERATION BRIEF below. The brief contains the requested format, situation, tone, Comedy DNA, and any Avoid List constraints.

ORIGINAL GENERATION BRIEF:
${originalPrompt}

DRAFT:
${text}

QUALITY CHECK:
- Fix only meaningful violations of the brief or explicit Avoid List.
- Remove generic AI-comedy behavior, forced dialogue, unnecessary twists, fake escalation, or unfilmable behavior when present.
- Keep strong specificity, natural couple behavior, and good jokes exactly when they work.
- If the draft is already good, return it unchanged.
- Preserve the exact JSON structure required by the original brief.

Return ONLY valid JSON. No markdown or explanation.`;
      // Same reasoning as /api/generate: a repair pass fixes fields, it
      // doesn't grow the concept, so it doesn't need the full draft budget.
      const verifyTokenBudget = Math.max(500, Math.round((maxTokens || 1000) * 0.7));
      const verifiedAI = await callAI({
        provider,
        system: verificationSystem,
        prompt: verificationPrompt,
        maxTokens: verifyTokenBudget,
        options: { temperature: 0.15, retries: 2 },
      });
      const cleanedVerified = String(verifiedAI.text || "").trim();
      const looksLikeJson = cleanedVerified.startsWith("{") && cleanedVerified.endsWith("}");
      return Response.json({
        text: looksLikeJson ? cleanedVerified : text,
        usage: {
          inputTokens: (draftAI.usage?.inputTokens || 0) + (verifiedAI.usage?.inputTokens || 0),
          outputTokens: (draftAI.usage?.outputTokens || 0) + (verifiedAI.usage?.outputTokens || 0),
          totalTokens: (draftAI.usage?.totalTokens || 0) + (verifiedAI.usage?.totalTokens || 0),
        },
      });
    }

    return Response.json({ text, usage: draftAI.usage });
  } catch (err) {
    const message = err?.message || "Unexpected server error.";
    const isProviderConfigError = /API_KEY is not configured|API_KEY is not set/.test(message);
    return Response.json({
      error: message,
      ...(err?.code ? { code: err.code } : {}),
      ...(err?.provider ? { provider: err.provider } : {}),
      ...(err?.retryAfter != null ? { retryAfter: err.retryAfter } : {}),
    }, { status: err?.code === "RATE_LIMIT_EXHAUSTED" ? 429 : isProviderConfigError ? 503 : 500 });
  }
}
