import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  try {
    await sql`DELETE FROM couple_saved_ideas WHERE id = ${params.id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to delete saved Couple idea." }, { status: 500 });
  }
}
