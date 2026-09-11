import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const analysis = body.analysis !== undefined ? JSON.stringify(body.analysis) : null;
    const analysisError = body.analysisError !== undefined ? String(body.analysisError || "") : null;
    const rows = await sql`
      UPDATE couple_samples
      SET analysis = CASE WHEN ${analysis} IS NULL THEN analysis ELSE ${analysis}::jsonb END,
          analysis_error = CASE WHEN ${analysisError} IS NULL THEN analysis_error ELSE ${analysisError} END
      WHERE id = ${params.id}
      RETURNING id, content, sample_type, format, analysis, analysis_error, created_at
    `;
    if (!rows.length) return Response.json({ error: "Sample not found." }, { status: 404 });
    const row = rows[0];
    return Response.json({ sample: {
      id: row.id, text: row.content, type: row.sample_type, format: row.format,
      analysis: row.analysis, analysis_error: row.analysis_error, addedAt: row.created_at
    }});
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to update Couple sample." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await sql`DELETE FROM couple_samples WHERE id = ${params.id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to delete Couple sample." }, { status: 500 });
  }
}
