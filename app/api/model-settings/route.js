// Reads/writes which OpenRouter model each generator's script/refine calls
// are currently set to use, plus which generation SOURCE it uses —
// "openrouter" (the model dropdown, third-party free models) or "gemini"
// (direct calls to this app's own Gemini API key, bypassing OpenRouter
// entirely — no shared free-tier rate limit with every other app using the
// same OpenRouter free models). One row per app in the `model_settings`
// table (see lib/schema.sql). Mirrors app/api/settings/route.js's
// provider-toggle pattern. If an app has no row yet, GET falls back to
// OPENROUTER_MODEL / lib/openrouter.js's hardcoded default and "openrouter"
// as the source — safe to deploy before anyone has ever touched the toggle.

import { sql } from "@/lib/db";

export const runtime = "nodejs";

const FALLBACK_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
const VALID_SOURCES = ["openrouter", "gemini"];

export async function GET() {
  try {
    const rows = await sql`SELECT app, model, source FROM model_settings`;
    const byApp = {
      solo: { model: FALLBACK_MODEL, source: "openrouter" },
      couple: { model: FALLBACK_MODEL, source: "openrouter" },
    };
    for (const row of rows) {
      if (row.app === "solo" || row.app === "couple") {
        byApp[row.app] = { model: row.model, source: row.source || "openrouter" };
      }
    }
    return Response.json(byApp);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load model settings." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { app, model, source } = body;

    if (app !== "solo" && app !== "couple") {
      return Response.json({ error: 'app must be "solo" or "couple".' }, { status: 400 });
    }
    if (!model || typeof model !== "string" || !model.trim()) {
      return Response.json({ error: "model is required." }, { status: 400 });
    }
    const resolvedSource = VALID_SOURCES.includes(source) ? source : "openrouter";

    const rows = await sql`
      INSERT INTO model_settings (app, model, source, updated_at)
      VALUES (${app}, ${model.trim()}, ${resolvedSource}, now())
      ON CONFLICT (app) DO UPDATE SET model = EXCLUDED.model, source = EXCLUDED.source, updated_at = now()
      RETURNING app, model, source
    `;
    return Response.json(rows[0]);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save model setting." }, { status: 500 });
  }
}
