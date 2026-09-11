import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT id, title, notes, content, format, analysis, analysis_error, created_at
                            FROM samples ORDER BY created_at ASC`;
    return Response.json({ samples: rows });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load samples." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const id = `sample_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const title = (body.title || "").trim() || "Untitled sample";
    const notes = (body.notes || "").trim();
    const content = (body.content || "").trim();
    // Optional — which of Solo's FORMATS (lib/prompts.js) this sample represents.
    // NULL means "Unspecified", which is a real, intentional choice here (not
    // a missing value to backfill).
    const format = body.format ? String(body.format) : null;
    if (!content) return Response.json({ error: "content is required" }, { status: 400 });

    const rows = await sql`
      INSERT INTO samples (id, title, notes, content, format)
      VALUES (${id}, ${title}, ${notes}, ${content}, ${format})
      RETURNING id, title, notes, content, format, analysis, analysis_error, created_at
    `;
    return Response.json({ sample: rows[0] });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to add sample." }, { status: 500 });
  }
}

// Bulk clear — mirrors Couple's /api/couple/samples DELETE. Intentionally
// supports a full reset flow (samples + comedy_dna together), not just
// per-sample deletion via /api/samples/[id].
export async function DELETE() {
  try {
    await sql`DELETE FROM samples`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to clear samples." }, { status: 500 });
  }
}
