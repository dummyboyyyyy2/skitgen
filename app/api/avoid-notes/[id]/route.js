import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  try {
    await sql`DELETE FROM avoid_notes WHERE id = ${String(params.id)}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to delete Avoid note." }, { status: 500 });
  }
}
