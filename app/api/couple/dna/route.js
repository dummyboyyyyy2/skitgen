import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`SELECT dna, included_sample_ids, trained_at FROM couple_dna WHERE id = 1`;
    if (!rows.length) return Response.json({ dna: null, includedSampleIds: [], trainedAt: null });
    return Response.json({
      dna: rows[0].dna,
      includedSampleIds: rows[0].included_sample_ids || [],
      trainedAt: rows[0].trained_at,
    });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load Couple Comedy DNA." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.dna || typeof body.dna !== "object") {
      return Response.json({ error: "dna must be a JSON object" }, { status: 400 });
    }
    const includedSampleIds = Array.isArray(body.includedSampleIds) ? body.includedSampleIds : [];
    const rows = await sql`
      INSERT INTO couple_dna (id, dna, included_sample_ids, trained_at)
      VALUES (1, ${JSON.stringify(body.dna)}::jsonb, ${JSON.stringify(includedSampleIds)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET
        dna = EXCLUDED.dna,
        included_sample_ids = EXCLUDED.included_sample_ids,
        trained_at = now()
      RETURNING dna, included_sample_ids, trained_at
    `;
    return Response.json({
      dna: rows[0].dna,
      includedSampleIds: rows[0].included_sample_ids || [],
      trainedAt: rows[0].trained_at,
    });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Couple Comedy DNA." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await sql`DELETE FROM couple_dna WHERE id = 1`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to clear Couple Comedy DNA." }, { status: 500 });
  }
}
