import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT dna, included_sample_ids, trained_at FROM comedy_dna WHERE id = 1`;
    if (rows.length === 0) return Response.json({ dna: null, includedSampleIds: [], trainedAt: null });
    return Response.json({
      dna: rows[0].dna,
      includedSampleIds: rows[0].included_sample_ids || [],
      trainedAt: rows[0].trained_at,
    });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load Comedy DNA." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.dna) return Response.json({ error: "dna is required" }, { status: 400 });
    const includedSampleIds = body.includedSampleIds || [];

    const rows = await sql`
      INSERT INTO comedy_dna (id, dna, included_sample_ids, trained_at)
      VALUES (1, ${JSON.stringify(body.dna)}::jsonb, ${JSON.stringify(includedSampleIds)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET dna = EXCLUDED.dna, included_sample_ids = EXCLUDED.included_sample_ids, trained_at = now()
      RETURNING dna, included_sample_ids, trained_at
    `;
    return Response.json({
      dna: rows[0].dna,
      includedSampleIds: rows[0].included_sample_ids || [],
      trainedAt: rows[0].trained_at,
    });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Comedy DNA." }, { status: 500 });
  }
}

// Mirrors Couple's /api/couple/dna DELETE — clears the single DNA row so a
// full reset (used with /api/samples DELETE) leaves no stale profile behind.
export async function DELETE() {
  try {
    await sql`DELETE FROM comedy_dna WHERE id = 1`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to clear Comedy DNA." }, { status: 500 });
  }
}
