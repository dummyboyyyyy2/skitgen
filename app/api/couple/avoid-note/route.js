import { callAI, DEFAULT_PROVIDER, isValidProvider } from "@/lib/ai";
import { buildAvoidNotePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { script, reason = "", provider: rawProvider } = await req.json();
    if (!script || !String(script).trim()) return Response.json({ error: "script is required" }, { status: 400 });
    const provider = isValidProvider(rawProvider) ? rawProvider : DEFAULT_PROVIDER.couple;
    const ai = await callAI({ provider, prompt: buildAvoidNotePrompt(String(script), String(reason || "")), maxTokens: 120, options: { lite: true } });
    return Response.json({ note: String(ai.text || "").trim(), usage: ai.usage });
  } catch (err) {
    const message = err?.message || "Failed to distill Avoid note.";
    const isProviderConfigError = /API_KEY is not configured|API_KEY is not set/.test(message);
    return Response.json({
      error: message,
      ...(err?.code ? { code: err.code } : {}),
      ...(err?.provider ? { provider: err.provider } : {}),
      ...(err?.retryAfter != null ? { retryAfter: err.retryAfter } : {}),
    }, { status: err?.code === "RATE_LIMIT_EXHAUSTED" ? 429 : isProviderConfigError ? 503 : 500 });
  }
}
