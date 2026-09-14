// Live OpenRouter model catalog for the model-picker dropdown used by both
// Solo and Couple. Deliberately NOT hardcoded — this always reflects what
// OpenRouter currently offers, so new/retired models show up without a
// code change. Filtered server-side to free-tier models only (":free" slugs,
// or $0 prompt+completion pricing) — this includes Google's free Gemini
// variants (e.g. google/gemini-2.0-flash-exp:free), since those are served
// through the same OpenRouter catalog, not a separate Gemini-specific list.
// A short in-memory cache just avoids hitting OpenRouter on every
// keystroke/page load; it resets on cold start, which is fine since the
// catalog itself changes on the order of days, not seconds.

export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache = { models: null, fetchedAt: 0 };

function isFreeModel(m) {
  return (
    m.id.endsWith(":free") ||
    (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
  );
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

    const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
    if (!res.ok) {
      throw new Error(`OpenRouter model list request failed (${res.status})`);
    }

    const json = await res.json();
    const models = (Array.isArray(json?.data) ? json.data : [])
      .filter((m) => m && typeof m.id === "string")
      .filter(isFreeModel)
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

