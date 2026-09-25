// Unified entry point for both generators (SKIT GEN + Couple Content Generator).
//
// Both apps only ever send a single user turn per call (no true multi-turn
// history) — see app/api/generate/route.js and app/couples/page.js's callAPI().
// That means both providers' native shapes can be reached from one normalized
// { system, prompt } input:
//   - Gemini  wants (system, userContentString, maxTokens, options)
//   - Anthropic wants (system, messagesArray, maxTokens, options)
//
// This file does that normalization and picks the provider. lib/gemini.js and
// lib/anthropic.js are untouched — they stay the low-level clients.

import { callGemini } from "./gemini";
import { callClaude } from "./anthropic";
import { callOpenRouter } from "./openrouter";

// Each app's provider before any row exists yet in the Neon `settings` table
// (i.e. before Step 3's settings API has ever been written to for that app).
export const DEFAULT_PROVIDER = { solo: "gemini", couple: "anthropic" };

export function isValidProvider(value) {
  return value === "gemini" || value === "anthropic" || value === "openrouter";
}

export function getProviderKeyError(provider) {
  if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
    return "Gemini is selected, but GEMINI_API_KEY is not configured on the server. Add it to your server environment variables or switch this generator to Anthropic.";
  }
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return "Anthropic is selected, but ANTHROPIC_API_KEY is not configured on the server. Add it to your server environment variables or switch this generator to Gemini.";
  }
  if (provider === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      return "OpenRouter is selected for scriptwriting, but OPENROUTER_API_KEY is not configured on the server. Add it to your server environment variables.";
    }
  }
  return null;
}

/**
 * @param {Object} params
 * @param {"gemini"|"anthropic"|"openrouter"} params.provider - which provider to call.
 * @param {string|null} [params.system] - system prompt, if any.
 * @param {string} params.prompt - the single user-turn content.
 * @param {number} [params.maxTokens=1000]
 * @param {Object} [params.options]
 * @param {boolean} [params.options.lite=false] - Gemini only: use
 *        GEMINI_MODEL_LITE instead of GEMINI_MODEL for this call (cheaper/
 *        faster, separate free-tier quota — used for idea/tone-style
 *        suggestions in both generators). Anthropic has no lite/full split,
 *        so this is ignored when provider === "anthropic".
 * @param {number} [params.options.retries] - defaults match each client's
 *        own existing default (3 for Anthropic, 4 for Gemini) if omitted.
 * @param {Function} [params.options.onRetry] - Gemini only; passed through.
 * @param {string} [params.options.model] - OpenRouter only; overrides
 *        OPENROUTER_MODEL / the client's hardcoded default for this call.
 *        Ignored for gemini/anthropic, which have no per-call model choice.
 * @param {boolean} [params.options.json=false] - Gemini and OpenRouter only;
 *        requests structured JSON output (responseMimeType / response_format
 *        respectively). Not every free-tier OpenRouter model honors this, so
 *        callers should still run output through safeJSONParse. Ignored for
 *        anthropic, which has no equivalent API-level toggle.
 * @returns {Promise<{text:string,usage:Object,provider:string,model:string}>} normalized model response.
 */
export async function callAI({ provider, system, prompt, maxTokens = 1000, options = {} }) {
  const { lite = false, retries, onRetry, temperature, model, json = false, apiKey } = options;

  const keyError = getProviderKeyError(provider);
  if (keyError) throw new Error(keyError);

  if (provider === "anthropic") {
    const messages = [{ role: "user", content: prompt }];
    return callClaude(system, messages, maxTokens, {
      ...(retries !== undefined ? { retries } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      onRetry,
    });
  }

  if (provider === "gemini") {
    const model = lite ? process.env.GEMINI_MODEL_LITE || null : null;
    return callGemini(system, prompt, maxTokens, {
      ...(retries !== undefined ? { retries } : {}),
      onRetry,
      model,
      ...(temperature !== undefined ? { temperature } : {}),
      json,
      ...(apiKey ? { apiKey } : {}),
    });
  }

  if (provider === "openrouter") {
    return callOpenRouter(system, prompt, maxTokens, {
      ...(retries !== undefined ? { retries } : {}),
      onRetry,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(model ? { model } : {}),
      json,
    });
  }

  throw new Error(`Unknown provider: "${provider}". Expected "gemini", "anthropic", or "openrouter".`);
}

/**
 * Wraps callAI() with a one-shot Gemini -> OpenRouter fallback.
 *
 * Used for ideas/analyzeSample/synthesizeDNA/updateDNA/tone/vibe on both
 * Solo and Couple — these had zero fallback off Gemini before (unlike
 * script/refine, which already have their own Gemini<->OpenRouter toggle
 * via the `useGemini` flag). A sustained Gemini outage on any of these
 * previously meant the whole DNA-building flow was stuck with no escape
 * hatch, even when OpenRouter was healthy and configured.
 *
 * The fallback only triggers when the *attempted* provider was "gemini" —
 * if a caller explicitly requested something else (e.g. Solo's client-side
 * `provider` override), that choice is respected and errors propagate
 * exactly as callAI() would normally throw them. Gemini's own retries
 * (default 4, see lib/gemini.js) are exhausted first; this is a single
 * additional attempt via OpenRouter afterward, forced into JSON mode
 * (json: true) since these are all structured-output callers, using
 * OPENROUTER_MODEL_DNA (falling back to OPENROUTER_MODEL if unset) rather
 * than whatever's picked in the script/refine UI.
 *
 * @param {Object} params - same shape as callAI(), plus:
 * @param {string} [params.actionLabel] - used only in the server-side
 *        warning log so a silent Gemini outage is traceable (e.g. "ideas",
 *        "synthesizeDNA"). Purely cosmetic — has no effect on behavior.
 * @returns {Promise<{text:string,usage:Object,provider:string,model:string,fallbackFrom?:string}>}
 *          Same shape as callAI(); `fallbackFrom: "gemini"` is present only
 *          when the OpenRouter fallback actually served the response, so
 *          callers/logs can tell a silent Gemini outage happened.
 */
export async function callAIWithFallback({ provider, system, prompt, maxTokens, options = {}, actionLabel }) {
  try {
    return await callAI({ provider, system, prompt, maxTokens, options });
  } catch (err) {
    if (provider !== "gemini") throw err;
    console.warn(
      `[ai-fallback] Gemini failed for ${actionLabel || "request"} after its own retries (${err.message}); retrying once via OpenRouter.`
    );
    const ai = await callAI({
      provider: "openrouter",
      system,
      prompt,
      maxTokens,
      options: {
        ...options,
        // DNA-build calls need reliable JSON output above all else, so their
        // fallback model is tunable independently of whatever's picked in
        // the script/refine UI (which optimizes for writing quality, not
        // response_format compliance). Falls through to OPENROUTER_MODEL /
        // callOpenRouter's hardcoded default if unset. An explicit
        // options.model from the caller (none currently pass one) still wins.
        model: options.model || process.env.OPENROUTER_MODEL_DNA || undefined,
        json: true,
      },
    });
    return { ...ai, fallbackFrom: "gemini" };
  }
}
