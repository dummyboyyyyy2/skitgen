import { safeJSONParse } from "@/lib/gemini";
import { callAI, DEFAULT_PROVIDER, isValidProvider } from "@/lib/ai";
import {
  COMEDY_PROFILE,
  buildIdeaPrompt,
  buildTonePrompt,
  buildRefinePrompt,
  buildSampleAnalysisPrompt,
  buildDNASynthesisPrompt,
  buildDNAUpdatePrompt,
  buildScriptPrompt,
  buildAvoidNotePrompt,
  buildScriptVerificationPrompt,
} from "@/lib/prompts";

export const runtime = "nodejs";
// Script generation now makes two sequential calls (draft + verification), so
// this needs more headroom than a single-call route. 90s comfortably covers
// both at the largest per-format token budgets below on a slow provider day.
// Note: if you're on Vercel's Hobby plan, function duration is capped at 60s
// regardless of this value — bump to Pro (or trim VERIFY_TOKEN_FRACTION below
// further) if you see timeouts on Rant/Skit.
export const maxDuration = 90;

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, provider: rawProvider } = body;
    // Caller (app/page.js) passes along whatever GET /api/settings returned for
    // "solo"; fall back to Solo's own default if omitted or invalid, so this
    // route still works standalone (e.g. direct API calls, tests).
    const provider = isValidProvider(rawProvider) ? rawProvider : DEFAULT_PROVIDER.solo;

    switch (action) {
      case "ideas": {
        const { formatLabel, formatDesc, dna, avoidNotes = [] } = body;
        const ai = await callAI({ provider, prompt: buildIdeaPrompt(formatLabel, formatDesc, dna, avoidNotes), maxTokens: 900, options: { lite: true, temperature: 0.8 } });
        const parsed = safeJSONParse(ai.text, []);
        return Response.json({ ideas: Array.isArray(parsed) ? parsed : [], usage: ai.usage });
      }

      case "tone": {
        const { topic, formatLabel, formatDesc, dna } = body;
        const ai = await callAI({ provider, prompt: buildTonePrompt(topic, formatLabel, formatDesc, dna), maxTokens: 250, options: { lite: true, temperature: 0.2 } });
        const parsed = safeJSONParse(ai.text);
        return Response.json({ tone: parsed?.tone || null, reason: parsed?.reason || null, usage: ai.usage });
      }

      case "script": {
        // Mode selection (when DNA exists) is folded into this same prompt/call —
        // see buildScriptPrompt — instead of a separate round trip beforehand.
        const { formatLabel, formatDesc, topic, context, suggestedTone, dna, avoidNotes = [] } = body;
        const prompt = buildScriptPrompt(formatLabel, formatDesc, topic, context, suggestedTone, dna, avoidNotes);
        const scriptTokenBudget = {
          "One-Liner": 700,
          "POV": 1800,
          "Character Bit": 2200,
          "Roast": 1800,
          "Commentary": 2200,
          "Skit": 3000,
          "Rant": 3200,
        }[formatLabel] || 2400;
        const draftAI = await callAI({ provider, system: COMEDY_PROFILE, prompt, maxTokens: scriptTokenBudget, options: { temperature: 0.9 } });
        const text = draftAI.text;
        // The verification pass repairs, it doesn't extend — a fixed-up script
        // is never meaningfully longer than the draft it started from. Capping
        // its budget below the draft's own keeps the two-call round trip well
        // inside maxDuration instead of letting a repair run as long as a
        // fresh generation would.
        const verifyTokenBudget = Math.max(500, Math.round(scriptTokenBudget * 0.7));
        const verifiedAI = await callAI({
          provider,
          system: COMEDY_PROFILE,
          prompt: buildScriptVerificationPrompt(text, avoidNotes, prompt),
          maxTokens: verifyTokenBudget,
          options: { temperature: 0.15, retries: 2 },
        });
        return Response.json({
          result: verifiedAI.text || text,
          usage: {
            inputTokens: (draftAI.usage?.inputTokens || 0) + (verifiedAI.usage?.inputTokens || 0),
            outputTokens: (draftAI.usage?.outputTokens || 0) + (verifiedAI.usage?.outputTokens || 0),
            totalTokens: (draftAI.usage?.totalTokens || 0) + (verifiedAI.usage?.totalTokens || 0),
          },
        });
      }

      case "distillAvoidNote": {
        const { script, reason = "" } = body;
        if (!script || !String(script).trim()) return Response.json({ error: "script is required" }, { status: 400 });
        const prompt = buildAvoidNotePrompt(String(script), String(reason || ""));
        const ai = await callAI({ provider, prompt, maxTokens: 120, options: { lite: true, temperature: 0.15 } });
        return Response.json({ note: String(ai.text || "").trim(), usage: ai.usage });
      }

      case "refine": {
        const { originalScript, feedback, dna, selectedMode } = body;
        const prompt = buildRefinePrompt(originalScript, feedback, dna, selectedMode);
        const ai = await callAI({ provider, system: COMEDY_PROFILE, prompt, maxTokens: 2600, options: { temperature: 0.78 } });
        return Response.json({ result: ai.text, usage: ai.usage });
      }

      case "analyzeSample": {
        const { content, title, formatLabel, formatDesc } = body;
        // Cap input length on the one-time analysis call — comedic voice comes through
        // well within the first ~6000 chars; longer pastes just add cost, not signal.
        const MAX_SAMPLE_CHARS = 6000;
        const trimmedContent =
          content.length > MAX_SAMPLE_CHARS
            ? content.slice(0, MAX_SAMPLE_CHARS) + "\n\n[...truncated for analysis, sample exceeded length cap...]"
            : content;
        const ai = await callAI({ provider, prompt: buildSampleAnalysisPrompt(trimmedContent, title, formatLabel, formatDesc), maxTokens: 1800, options: { temperature: 0.2 } });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the analysis. Try reanalyzing this sample." }, { status: 422 });
        return Response.json({ analysis: parsed, usage: ai.usage });
      }

      case "synthesizeDNA": {
        const { analyses, baseProfileSummary } = body;
        const prompt = buildDNASynthesisPrompt(analyses, baseProfileSummary);
        const ai = await callAI({ provider, prompt, maxTokens: 4000, options: { temperature: 0.2 } });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the DNA synthesis response." }, { status: 422 });
        return Response.json({ dna: parsed, usage: ai.usage });
      }

      case "updateDNA": {
        // Incremental merge — only sends the existing (already-compact) DNA plus the
        // NEW samples' analyses, not the full analyzed corpus. Much cheaper per rebuild.
        const { existingDNA, newAnalyses } = body;
        const prompt = buildDNAUpdatePrompt(existingDNA, newAnalyses);
        const ai = await callAI({ provider, prompt, maxTokens: 4000, options: { temperature: 0.2 } });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the DNA update response." }, { status: 422 });
        return Response.json({ dna: parsed, usage: ai.usage });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err?.message || "Unknown server error.";
    const isProviderConfigError = /API_KEY is not configured|API_KEY is not set/.test(message);
    return Response.json({
      error: message,
      ...(err?.code ? { code: err.code } : {}),
      ...(err?.provider ? { provider: err.provider } : {}),
      ...(err?.retryAfter != null ? { retryAfter: err.retryAfter } : {}),
    }, { status: err?.code === "RATE_LIMIT_EXHAUSTED" ? 429 : isProviderConfigError ? 503 : 500 });
  }
}
