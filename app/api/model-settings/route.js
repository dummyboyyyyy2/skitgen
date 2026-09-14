// Reads/writes which OpenRouter model each generator's script/refine calls
// are currently set to use. One row per app in the `model_settings` table
// (see lib/schema.sql). Mirrors app/api/settings/route.js's provider-toggle
// pattern. If an app has no row yet, GET falls back to OPENROUTER_MODEL /
// lib/openrouter.js's hardcoded default — safe to deploy before anyone has
// ever touched the dropdown.

import { sql } from "@/lib/db";

export const runtime = "nodejs";

const FALLBACK_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

export async function GET() {
  try {
    const rows = await sql`SELECT app, model FROM model_settings`;
    const byApp = { solo: FALLBACK_MODEL, couple: FALLBACK_MODEL };
    for (const row of rows) {
      if (row.app === "solo" || row.app === "couple") byApp[row.app] = row.model;
    }
    return Response.json(byApp);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load model settings." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { app, model } = body;

    if (app !== "solo" && app !== "couple") {
      return Response.json({ error: 'app must be "solo" or "couple".' }, { status: 400 });
    }
    if (!model || typeof model !== "string" || !model.trim()) {
      return Response.json({ error: "model is required." }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO model_settings (app, model, updated_at)
      VALUES (${app}, ${model.trim()}, now())
      ON CONFLICT (app) DO UPDATE SET model = EXCLUDED.model, updated_at = now()
      RETURNING app, model
    `;
    return Response.json(rows[0]);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save model setting." }, { status: 500 });
  }
}
