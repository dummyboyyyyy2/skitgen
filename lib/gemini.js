const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt) => Math.min(2000 * Math.pow(2, attempt), 16000); // 2s → 4s → 8s → 16s

/**
 * Calls Gemini's generateContent endpoint.
 * Mirrors the shape of the old Anthropic callAPI(): (system, userContent, maxTokens, options) => text
 */
export async function callGemini(system, userContent, maxTokens = 1500, options = {}) {
  const { retries = 4, onRetry = null, model: modelOverride = null, temperature, json = false, apiKey: apiKeyOverride = null } = options;

  // gemini-2.5-flash was retired for new API keys/projects ahead of its Oct
  // 16, 2026 shutdown (see .env.local) — this hardcoded last-resort fallback
  // must track the current working model, since a missing GEMINI_MODEL env
  // var (e.g. not set in the Vercel project, only in .env.local) silently
  // lands here instead of failing loudly.
  const model = modelOverride || process.env.GEMINI_MODEL || "gemini-3.6-flash";
  // Callers pass a specific key (see lib/geminiKeys.js) to split traffic
  // across multiple Gemini API keys instead of every action sharing one.
  // Falls back to the original single-key env var for any caller that
  // doesn't pass one.
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini 3.x ("thinking") models reserve part of the response budget for
  // internal reasoning before writing the actual answer. On the small token
  // budgets used here (structured JSON, short scripts), the default thinking
  // level can consume most/all of maxOutputTokens and leave too little room
  // to write out the real response — producing truncated/unparseable output.
  // "low" keeps reasoning light and leaves the budget for the actual text.
  // Gemini 2.5-series models use a different parameter (thinkingBudget) and
  // can error on an unrecognized thinkingLevel field, so only send this for
  // the 3.x family.
  const isThinkingLevelModel = /^gemini-3/.test(model);

  const body = {
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(isThinkingLevelModel ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      // Structurally guarantees valid JSON output instead of relying on the
      // prompt asking nicely — a prompt that also tells the model to
      // self-check its output before finalizing can otherwise tempt it into
      // writing that checking process as visible prose around the JSON,
      // which breaks safeJSONParse even though the API call itself succeeds.
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      if (attempt < retries) {
        const delay = getRetryDelay(attempt);
        if (onRetry) onRetry({ attempt: attempt + 1, maxAttempts: retries, reason: "network", delay });
        await sleep(delay);
        continue;
      }
      throw new Error(`Network error: ${networkError.message || "connection failed"}`);
    }

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("") || "";
      // MAX_TOKENS means the response was cut off mid-output — for JSON
      // callers this almost always means safeJSONParse is about to fail and
      // silently fall back to []. Surfacing it here (instead of only ever
      // seeing an empty result) is what makes that failure debuggable.
      const finishReason = data?.candidates?.[0]?.finishReason || null;
      if (finishReason === "MAX_TOKENS") {
        console.warn(`[gemini] response truncated (MAX_TOKENS) — model=${model}, maxOutputTokens=${maxTokens}`);
      }
      const u = data?.usageMetadata || {};
      return {
        text,
        finishReason,
        usage: {
          inputTokens: Number(u.promptTokenCount || 0),
          outputTokens: Number(u.candidatesTokenCount || 0),
          totalTokens: Number(u.totalTokenCount || 0) ||
            Number(u.promptTokenCount || 0) + Number(u.candidatesTokenCount || 0),
        },
        provider: "gemini",
        model,
      };
    }

    const shouldRetry = [429, 500, 502, 503].includes(response.status);
    if (shouldRetry && attempt < retries) {
      const delay = getRetryDelay(attempt);
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxAttempts: retries,
          reason: response.status === 429 ? "rate-limit" : "server",
          status: response.status,
          delay,
        });
      }
      await sleep(delay);
      continue;
    }

    let detail = "";
    try {
      const errData = await response.json();
      detail = errData?.error?.message || "";
    } catch {}
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const err = new Error(
        `Gemini rate limit reached. ${retryAfter ? `The provider asked us to retry after ${retryAfter} seconds. ` : ""}Please wait and try again, or switch to Anthropic.`
      );
      err.code = "RATE_LIMIT_EXHAUSTED";
      err.provider = "gemini";
      err.retryAfter = retryAfter ? Number(retryAfter) : null;
      throw err;
    }
    throw new Error(detail ? `Gemini API error ${response.status}: ${detail}` : `Gemini API error ${response.status}`);
  }

  throw new Error("Gemini request failed after retries.");
}

export function safeJSONParse(text, fallback = null) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    try {
      const start = Math.min(
        ...["{", "["].map((c) => {
          const i = text.indexOf(c);
          return i === -1 ? Infinity : i;
        })
      );
      const endBrace = text.lastIndexOf("}");
      const endBracket = text.lastIndexOf("]");
      const end = Math.max(endBrace, endBracket);
      if (start !== Infinity && end !== -1) {
        return JSON.parse(text.slice(start, end + 1));
      }
    } catch {}
    return fallback;
  }
}
