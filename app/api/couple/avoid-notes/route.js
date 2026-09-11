import { sql } from "@/lib/db";

export const runtime = "nodejs";
const MAX_AVOID_NOTES = 10;

export async function GET() {
  try {
    const rows = await sql`SELECT id, note, source_script, created_at FROM couple_avoid_notes ORDER BY created_at DESC LIMIT ${MAX_AVOID_NOTES}`;
    return Response.json({ notes: rows });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load Avoid notes." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const note = String(body.note || "").trim();
    if (!note) return Response.json({ error: "note is required" }, { status: 400 });
    const id = body.id ? String(body.id) : `couple_avoid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rows = await sql`
      INSERT INTO couple_avoid_notes (id, note, source_script, created_at)
      VALUES (${id}, ${note}, ${(body.sourceScript || "").trim()}, now())
      ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note, source_script = EXCLUDED.source_script
      RETURNING id, note, source_script, created_at
    `;
    await sql`
      DELETE FROM couple_avoid_notes
      WHERE id NOT IN (SELECT id FROM couple_avoid_notes ORDER BY created_at DESC LIMIT ${MAX_AVOID_NOTES})
    `;
    return Response.json({ note: rows[0] });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Avoid note." }, { status: 500 });
  }
}
