// Live OpenRouter model catalog for the model-picker dropdown used by both
// Solo and Couple. Deliberately NOT hardcoded to a fixed list of model IDs —
// that would go stale fast as OpenRouter's free catalog rotates. Instead
// this filters by CATEGORY, using real signals from the API response, so it
// stays reasonably curated without needing a code change every time a model
// is added or retired.
//
// Filtered to: free-tier + text-output + none of the categories below that
// don't fit script/dialogue generation. This can still admit a mediocre
// generalist model, and can't verify "is actually funny" (no such field
// exists) — but it reliably keeps out categories that are flatly wrong for
// this app, which is what was actually showing up before (a music-generation
// model, a content-moderation classifier, a coding-specialist model, and a
// model that flatly rejects non-agentic completions).

export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache = { models: null, fetchedAt: 0 };

function isFreeModel(m) {
  return (
    m.id.endsWith(":free") ||
    (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
  );
}

// Known non-fits that can't be caught by the generic patterns below because
// the model's own name/metadata doesn't spell out the reason:
const KNOWN_NON_FIT_PREFIXES = [
  // Confirmed by live testing: this family's free tier returns an explicit
  // 403 for ordinary chat/completion calls — "only available on agentic
  // harnesses" — so it can never work here regardless of any other filter.
  "thinkingmachines/",
  // Poolside is a code-generation-specialized lab; their model names (e.g.
  // "Laguna") don't contain the word "code", so the CODE_SPECIALIST_NAME
  // check below wouldn't catch them on name alone.
  "poolside/",
];

// Category exclusions checked against id + name + description, lowercased.
// Each entry is [pattern, reason] purely for maintainability/debugging.
const EXCLUDE_PATTERNS = [
  [/\b(music|lyria|composer|melody|songwriting)\b/, "music/audio generation, not text chat"],
  [/\b(text-to-speech|tts|voice clone|voice-over)\b/, "voice/speech synthesis"],
  [/\bembedding(s)?\b/, "embedding model, not a chat/completion model"],
  [/\b(rerank(er)?)\b/, "search re-ranking model"],
  [/\b(content[- ]safety|moderation|classifier|nsfw filter|guardrail)\b/, "moderation/classifier utility model, not a generator"],
  [/\bcoder\b/, "code-specialized model"],
  [/\bagentic (coding|harness)\b/, "built for agentic tool-use harnesses, not standalone chat"],
  [/\bfree models? router\b/, "meta-router — picks an unpredictable underlying model per request"],
];

// A model whose NAME (not description) has "Code" as its own distinct word
// is almost always a code-specialized variant (e.g. "Cohere: North Mini
// Code"), as opposed to a general model that merely mentions code support
// somewhere in its longer description.
const CODE_SPECIALIST_NAME = /\bcode\b/i;

// Vision-specialized branch of an otherwise general family (e.g. an "-VL"
// suffix). The plain-text siblings in the same family stay eligible.
const VISION_SPECIALIST_SUFFIX = /(^|[\s:-])vl\b/i;

// Gemini specifically (not Gemma — a different, genuinely distinct model
// family) is excluded here on purpose: this app now has a separate
// "Gemini (direct)" generation-source toggle that calls Gemini through this
// app's own API key instead of OpenRouter, which avoids OpenRouter's
// shared-across-everyone free-tier rate limit entirely. Leaving Gemini in
// this dropdown too would just be a second, worse way to reach the same
// model (still subject to OpenRouter's limit) sitting next to the better one.
const GEMINI_BRAND_NAME = /\bgemini\b/i;

function isScriptSuitable(m) {
  const outputModalities = m.architecture?.output_modalities || [];
  if (outputModalities.length && !outputModalities.includes("text")) return false;
  if (outputModalities.includes("audio") || outputModalities.includes("image")) return false;
  if (Array.isArray(m.supported_voices) && m.supported_voices.length) return false;

  if (KNOWN_NON_FIT_PREFIXES.some((p) => m.id.startsWith(p))) return false;
  if (CODE_SPECIALIST_NAME.test(m.name || "")) return false;
  if (VISION_SPECIALIST_SUFFIX.test(m.name || "") || VISION_SPECIALIST_SUFFIX.test(m.id || "")) return false;
  if (GEMINI_BRAND_NAME.test(m.name || "") || GEMINI_BRAND_NAME.test(m.id || "")) return false;

  const haystack = `${m.id} ${m.name || ""} ${m.description || ""}`.toLowerCase();
  return !EXCLUDE_PATTERNS.some(([pattern]) => pattern.test(haystack));
}

export async function GET() {
  const now = Date.now();
  if (cache.models && now - cache.fetchedAt < CACHE_TTL_MS) {
    return Response.json({ models: cache.models, cached: true });
  }

  try {
    const headers = { "Content-Type": "application/json" };
    // Unauthenticated requests to /models work too, but sending the key (when
    // present) avoids any chance of a stricter anonymous rate limit.
    if (process.env.OPENROUTER_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }

    // output_modalities=text asks OpenRouter to pre-filter server-side;
    // isScriptSuitable() below re-checks the same thing client-side as a
    // safety net, since this alone doesn't catch TTS/classifier/agentic-only
    // models that technically still list "text" as an output modality.
    const res = await fetch("https://openrouter.ai/api/v1/models?output_modalities=text", { headers });
    if (!res.ok) {
      throw new Error(`OpenRouter model list request failed (${res.status})`);
    }

    const json = await res.json();
    const models = (Array.isArray(json?.data) ? json.data : [])
      .filter((m) => m && typeof m.id === "string")
      .filter(isFreeModel)
      .filter(isScriptSuitable)
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length ?? m.top_provider?.context_length ?? null,
        isFree: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache = { models, fetchedAt: now };
    return Response.json({ models, cached: false });
  } catch (err) {
    // Serve a stale cache rather than breaking the dropdown outright.
    if (cache.models) {
      return Response.json({ models: cache.models, cached: true, stale: true });
    }
    return Response.json({ error: err?.message || "Failed to load OpenRouter models." }, { status: 502 });
  }
}

