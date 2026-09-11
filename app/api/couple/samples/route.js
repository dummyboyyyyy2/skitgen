import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT id, content, sample_type, format, analysis, analysis_error, created_at FROM couple_samples ORDER BY created_at ASC`;
    return Response.json({
      samples: rows.map(row => ({ id: row.id, text: row.content, type: row.sample_type, format: row.format, analysis: row.analysis, analysis_error: row.analysis_error, addedAt: row.created_at })),
    });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load Couple samples." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const content = (body.content || body.text || "").trim();
    if (!content) return Response.json({ error: "content is required" }, { status: 400 });
    const id = body.id ? String(body.id) : `couple_sample_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const type = String(body.type || body.sampleType || "positive");
    // Optional — which of Couple's own FORMATS (app/couples/page.js) this
    // sample represents. NULL means "Unspecified", a real, intentional choice.
    const format = body.format ? String(body.format) : null;
    const rows = await sql`
      INSERT INTO couple_samples (id, content, sample_type, format)
      VALUES (${id}, ${content}, ${type}, ${format})
      ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, sample_type = EXCLUDED.sample_type, format = EXCLUDED.format
      RETURNING id, content, sample_type, format, analysis, analysis_error, created_at
    `;
    const row = rows[0];
    return Response.json({ sample: { id: row.id, text: row.content, type: row.sample_type, format: row.format, analysis: row.analysis, analysis_error: row.analysis_error, addedAt: row.created_at } });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Couple sample." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await sql`DELETE FROM couple_samples`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to clear Couple samples." }, { status: 500 });
  }
}
