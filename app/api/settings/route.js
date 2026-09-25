// Reads/writes which AI provider ("gemini" | "anthropic") each generator is
// currently set to use. One row per app in the `settings` table (see
// lib/schema.sql). If an app has no row yet, GET falls back to that app's
// original default provider (lib/ai.js: DEFAULT_PROVIDER) rather than erroring
// — so this is safe to deploy before anyone has ever changed a toggle.

import { sql } from "@/lib/db";
import { DEFAULT_PROVIDER } from "@/lib/ai";

// This legacy toggle only ever meant "Gemini vs Anthropic" for full
// generation and predates OpenRouter/task-based routing. Validate against
// that original scope directly rather than lib/ai.js's isValidProvider,
// which now also accepts "openrouter" — a value this table was never
// designed to hold and that the main generation flows don't read from here.
const isValidLegacyProvider = (value) => value === "gemini" || value === "anthropic";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT app, provider FROM settings`;
    const byApp = { solo: DEFAULT_PROVIDER.solo, couple: DEFAULT_PROVIDER.couple };
    for (const row of rows) {
      if (row.app === "solo" || row.app === "couple") byApp[row.app] = row.provider;
    }
    return Response.json(byApp);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load settings." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { app, provider } = body;

    if (app !== "solo" && app !== "couple") {
      return Response.json({ error: 'app must be "solo" or "couple".' }, { status: 400 });
    }
    if (!isValidLegacyProvider(provider)) {
      return Response.json({ error: 'provider must be "gemini" or "anthropic".' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO settings (app, provider, updated_at)
      VALUES (${app}, ${provider}, now())
      ON CONFLICT (app) DO UPDATE SET provider = EXCLUDED.provider, updated_at = now()
      RETURNING app, provider
    `;
    return Response.json(rows[0]);
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save settings." }, { status: 500 });
  }
}
