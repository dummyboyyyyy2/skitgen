import { safeJSONParse } from "@/lib/gemini";
import { callAI, DEFAULT_PROVIDER, isValidProvider } from "@/lib/ai";
import { getSoloGeminiKey } from "@/lib/geminiKeys";
import {
  buildComedyProfile,
  buildIdeaPrompt,
  buildTonePrompt,
  buildRefinePrompt,
  buildSampleAnalysisPrompt,
  buildDNASynthesisPrompt,
  buildDNAUpdatePrompt,
  buildScriptPrompt,
  buildAvoidNotePrompt,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 90;

// SHARED-ARCHITECTURE RULE: Solo and Couple should keep equivalent pipeline mechanics.
// Do not copy Solo creative prompts/DNA semantics into Couple; only port engineering improvements.
export async function POST(req) {
  try {
    const body = await req.json();
    const { action, provider: rawProvider, openrouterModel, useGemini } = body;
    // Only meaningful for the two OpenRouter-routed actions below; harmless
    // to have present for other actions since lib/ai.js only reads `model`
    // in its openrouter branch. Suppressed when useGemini is set, since
    // Gemini has no per-call model marketplace the way OpenRouter does.
    const modelOption = !useGemini && openrouterModel ? { model: openrouterModel } : {};

    // Solo routing is intentionally task-based:
    // - Gemini handles lightweight/structured work around the script.
    // - OpenRouter handles the actual creative writing and refinement —
    //   UNLESS the person has flipped the "Gemini (direct)" generation
    //   source toggle, in which case script/refine go straight to this
    //   app's own Gemini API key instead, avoiding OpenRouter's rate limit
    //   (shared across every app using its free-tier models) entirely.
    // The client no longer chooses the provider for other actions, so
    // provider choice for those can change without changing the UI.
    const provider = action === "script" || action === "refine"
      ? (useGemini ? "gemini" : "openrouter")
      : (isValidProvider(rawProvider) ? rawProvider : DEFAULT_PROVIDER.solo);

    switch (action) {
      case "ideas": {
        const { formatLabel, formatDesc, dna, avoidNotes = [] } = body;
        // Ideas used to run on the lite model tier — cheaper/faster, but a
        // meaningfully weaker model than the one that actually writes scripts.
        // Idea quality/voice-fit matters too much here to keep that tradeoff.
        const ai = await callAI({ provider, prompt: buildIdeaPrompt(formatLabel, formatDesc, dna, avoidNotes), maxTokens: 900, options: { temperature: 0.8, json: true, apiKey: getSoloGeminiKey("ideas") } });
        const parsed = safeJSONParse(ai.text, []);
        return Response.json({ ideas: Array.isArray(parsed) ? parsed : [], usage: ai.usage });
      }

      case "tone": {
        const { topic, formatLabel, formatDesc, dna } = body;
        const ai = await callAI({ provider, prompt: buildTonePrompt(topic, formatLabel, formatDesc, dna), maxTokens: 250, options: { lite: true, temperature: 0.2, apiKey: getSoloGeminiKey("tone") } });
        const parsed = safeJSONParse(ai.text);
        return Response.json({ tone: parsed?.tone || null, reason: parsed?.reason || null, usage: ai.usage });
      }

      case "script": {
        // Mode selection (when DNA exists) is folded into this same prompt/call —
        // see buildScriptPrompt — instead of a separate round trip beforehand.
        const { formatLabel, formatDesc, topic, context, suggestedTone, dna, avoidNotes = [], voiceClips = [] } = body;
        const prompt = buildScriptPrompt(formatLabel, formatDesc, topic, context, suggestedTone, dna, avoidNotes, voiceClips);
        const scriptTokenBudget = {
          "One-Liner": 500,
          "Text Overlay": 1500,
          "Roast": 1800,
          "Skit": 3000,
          "Rant": 3200,
        }[formatLabel] || 2400;
        const ai = await callAI({ provider, system: buildComedyProfile(dna), prompt, maxTokens: scriptTokenBudget, options: { temperature: 0.9, ...modelOption, apiKey: getSoloGeminiKey("script") } });
        const parsed = safeJSONParse(ai.text);
        // Validate the model response locally, but never send the draft through
        // a second creative model pass that could normalize or override learned DNA.
        return Response.json({ result: parsed ? JSON.stringify(parsed) : ai.text, usage: ai.usage });
      }

      case "distillAvoidNote": {
        const { script, reason = "" } = body;
        if (!script || !String(script).trim()) return Response.json({ error: "script is required" }, { status: 400 });
        const prompt = buildAvoidNotePrompt(String(script), String(reason || ""));
        const ai = await callAI({ provider, prompt, maxTokens: 120, options: { lite: true, temperature: 0.15, apiKey: getSoloGeminiKey("distillAvoidNote") } });
        return Response.json({ note: String(ai.text || "").trim(), usage: ai.usage });
      }

      case "refine": {
        const { originalResult, feedback, dna, selectedMode } = body;
        const prompt = buildRefinePrompt(originalResult, feedback, dna, selectedMode);
        const ai = await callAI({ provider, system: buildComedyProfile(dna), prompt, maxTokens: 2600, options: { temperature: 0.78, ...modelOption, apiKey: getSoloGeminiKey("refine") } });
        // Same repair-with-fallback pattern as "script" above.
        const refined = safeJSONParse(ai.text);
        return Response.json({ result: refined ? JSON.stringify(refined) : ai.text, usage: ai.usage });
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
        const ai = await callAI({ provider, prompt: buildSampleAnalysisPrompt(trimmedContent, title, formatLabel, formatDesc), maxTokens: 1800, options: { temperature: 0.2, apiKey: getSoloGeminiKey("analyzeSample") } });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the analysis. Try reanalyzing this sample." }, { status: 422 });
        return Response.json({ analysis: parsed, usage: ai.usage });
      }

      case "synthesizeDNA": {
        const { analyses, baseProfileSummary } = body;
        const prompt = buildDNASynthesisPrompt(analyses, baseProfileSummary);
        const ai = await callAI({ provider, prompt, maxTokens: 4000, options: { temperature: 0.2, apiKey: getSoloGeminiKey("synthesizeDNA") } });
        const parsed = safeJSONParse(ai.text);
        if (!parsed) return Response.json({ error: "Couldn't parse the DNA synthesis response." }, { status: 422 });
        return Response.json({ dna: parsed, usage: ai.usage });
      }

      case "updateDNA": {
        // Incremental merge — only sends the existing (already-compact) DNA plus the
        // NEW samples' analyses, not the full analyzed corpus. Much cheaper per rebuild.
        const { existingDNA, newAnalyses } = body;
        const prompt = buildDNAUpdatePrompt(existingDNA, newAnalyses);
        const ai = await callAI({ provider, prompt, maxTokens: 4000, options: { temperature: 0.2, apiKey: getSoloGeminiKey("updateDNA") } });
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
