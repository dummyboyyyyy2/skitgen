import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  try {
    await sql`DELETE FROM scripts WHERE id = ${params.id}`;
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to delete saved skit." }, { status: 500 });
  }
}
