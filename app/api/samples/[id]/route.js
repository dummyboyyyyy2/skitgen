import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    if (body.analysis !== undefined) {
      const rows = await sql`
        UPDATE samples SET analysis = ${JSON.stringify(body.analysis)}::jsonb, analysis_error = NULL
        WHERE id = ${id}
        RETURNING id, title, notes, content, format, analysis, analysis_error, created_at
      `;
      return Response.json({ sample: rows[0] });
    }

    if (body.analysisError !== undefined) {
      const rows = await sql`
        UPDATE samples SET analysis_error = ${body.analysisError}
        WHERE id = ${id}
        RETURNING id, title, notes, content, format, analysis, analysis_error, created_at
      `;
      return Response.json({ sample: rows[0] });
    }

    if (body.resetAnalysis) {
      const rows = await sql`
        UPDATE samples SET analysis = NULL, analysis_error = NULL
        WHERE id = ${id}
        RETURNING id, title, notes, content, format, analysis, analysis_error, created_at
      `;
      return Response.json({ sample: rows[0] });
    }

    return Response.json({ error: "No recognized update field." }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to update sample." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    await sql`DELETE FROM samples WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to delete sample." }, { status: 500 });
  }
}
