// Low-level Anthropic client. Returns normalized text + usage metadata so callers
// can surface actual token consumption without exposing API keys.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRetryDelay = (attempt) => Math.min(2000 * Math.pow(2, attempt), 16000);

export async function callClaude(system, messages, maxTokens = 1000, options = {}) {
  const { retries = 3, temperature, onRetry = null } = options;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const body = {
    model, max_tokens: maxTokens, messages,
    ...(temperature !== undefined ? { temperature } : {}),
  };
  if (system) body.system = system;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      if (attempt < retries) {
        const delay = getRetryDelay(attempt);
        onRetry?.({ attempt: attempt + 1, maxAttempts: retries, reason: "network", delay });
        await sleep(delay);
        continue;
      }
      throw new Error(`Network error: ${networkError.message || "connection failed"}`);
    }

    if (response.ok) {
      const data = await response.json();
      const text = (data.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      const u = data.usage || {};
      return {
        text,
        usage: {
          inputTokens: Number(u.input_tokens || 0),
          outputTokens: Number(u.output_tokens || 0),
          totalTokens: Number(u.input_tokens || 0) + Number(u.output_tokens || 0),
        },
        provider: "anthropic",
        model,
      };
    }

    const shouldRetry = [429, 500, 502, 503, 529].includes(response.status);
    if (shouldRetry && attempt < retries) {
      const delay = getRetryDelay(attempt);
      onRetry?.({
        attempt: attempt + 1,
        maxAttempts: retries,
        reason: response.status === 429 ? "rate-limit" : "server",
        status: response.status,
        delay,
      });
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
        `Anthropic rate limit reached. ${retryAfter ? `The provider asked us to retry after ${retryAfter} seconds. ` : ""}Please wait and try again, or switch to Gemini.`
      );
      err.code = "RATE_LIMIT_EXHAUSTED";
      err.provider = "anthropic";
      err.retryAfter = retryAfter ? Number(retryAfter) : null;
      throw err;
    }

    throw new Error(detail ? `Anthropic API error ${response.status}: ${detail}` : `Anthropic API error ${response.status}`);
  }

  throw new Error("Anthropic request failed after retries.");
}
