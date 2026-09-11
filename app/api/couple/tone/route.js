import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT notes, updated_at FROM couple_tone_notes WHERE id = 1`;
    return Response.json({ notes: rows.length ? rows[0].notes || "" : "", updatedAt: rows.length ? rows[0].updated_at : null });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load Couple tone notes." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const notes = String(body.notes || "");
    const rows = await sql`
      INSERT INTO couple_tone_notes (id, notes, updated_at)
      VALUES (1, ${notes}, now())
      ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()
      RETURNING notes, updated_at
    `;
    return Response.json({ notes: rows[0].notes, updatedAt: rows[0].updated_at });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Couple tone notes." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await sql`DELETE FROM couple_tone_notes WHERE id = 1`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to clear Couple tone notes." }, { status: 500 });
  }
}
