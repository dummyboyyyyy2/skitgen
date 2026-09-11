import { sql } from "@/lib/db";

export const runtime = "nodejs";

function serializeIdea(row) {
  let result = row.result;
  try { result = JSON.parse(result); } catch {}
  return {
    id: row.id,
    result,
    situation: row.situation || "",
    vibe: row.vibe || null,
    format: row.format || "acted-skit",
    savedAt: row.saved_at,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT id, result, situation, vibe, format, saved_at FROM couple_saved_ideas ORDER BY saved_at DESC LIMIT 50`;
    return Response.json({ ideas: rows.map(serializeIdea) });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load saved Couple ideas." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.result) return Response.json({ error: "result is required" }, { status: 400 });
    const id = body.id ? String(body.id) : `couple_idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = typeof body.result === "string" ? body.result : JSON.stringify(body.result);
    const rows = await sql`
      INSERT INTO couple_saved_ideas (id, result, situation, vibe, format, saved_at)
      VALUES (${id}, ${result}, ${(body.situation || "").trim()}, ${body.vibe || null}, ${body.format || "acted-skit"}, now())
      ON CONFLICT (id) DO UPDATE SET result = EXCLUDED.result, situation = EXCLUDED.situation, vibe = EXCLUDED.vibe, format = EXCLUDED.format, saved_at = now()
      RETURNING id, result, situation, vibe, format, saved_at
    `;
    return Response.json({ idea: serializeIdea(rows[0]) });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save Couple idea." }, { status: 500 });
  }
}
