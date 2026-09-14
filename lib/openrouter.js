const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt) => Math.min(1500 * Math.pow(2, attempt), 10000);

/**
 * Calls OpenRouter's OpenAI-compatible Chat Completions API.
 * The model is configurable with OPENROUTER_MODEL so we can test/swap
 * scriptwriting models without changing application code.
 */
export async function callOpenRouter(system, userContent, maxTokens = 1500, options = {}) {
  const {
    retries = 2,
    onRetry = null,
    temperature,
    model: modelOverride = null,
  } = options;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  const model = modelOverride || process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: userContent });

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    ...(temperature !== undefined ? { temperature } : {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
          ...(process.env.OPENROUTER_SITE_NAME ? { "X-Title": process.env.OPENROUTER_SITE_NAME } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      if (attempt < retries) {
        const delay = getRetryDelay(attempt);
        if (onRetry) onRetry({ attempt: attempt + 1, maxAttempts: retries, reason: "network", delay });
        await sleep(delay);
        continue;
      }
      throw new Error(`OpenRouter network error: ${networkError.message || "connection failed"}`);
    }

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const u = data?.usage || {};
      return {
        text,
        usage: {
          inputTokens: Number(u.prompt_tokens || 0),
          outputTokens: Number(u.completion_tokens || 0),
          totalTokens: Number(u.total_tokens || 0) ||
            Number(u.prompt_tokens || 0) + Number(u.completion_tokens || 0),
        },
        provider: "openrouter",
        model,
      };
    }

    const retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
    if (retryable && attempt < retries) {
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
      detail = errData?.error?.message || errData?.message || "";
    } catch {}

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const err = new Error(
        `OpenRouter rate limit reached. ${retryAfter ? `The provider asked us to retry after ${retryAfter} seconds. ` : ""}Please try again later.`
      );
      err.code = "RATE_LIMIT_EXHAUSTED";
      err.provider = "openrouter";
      err.retryAfter = retryAfter ? Number(retryAfter) : null;
      throw err;
    }

    throw new Error(
      detail
        ? `OpenRouter API error ${response.status}: ${detail}`
        : `OpenRouter API error ${response.status}`
    );
  }

  throw new Error("OpenRouter request failed after retries.");
}
