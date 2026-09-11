import { sql } from "@/lib/db";

export const runtime = "nodejs";

function serializeScript(row) {
  let result = row.result;
  try { result = JSON.parse(result); } catch {}
  return {
    id: row.id,
    result,
    topic: row.topic || "",
    context: row.context || "",
    format: row.format || null,
    modeUsed: row.mode_used || null,
    savedAt: row.created_at,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT id, result, topic, context, format, mode_used, created_at FROM scripts ORDER BY created_at DESC LIMIT 50`;
    return Response.json({ scripts: rows.map(serializeScript) });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to load saved skits." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.result) return Response.json({ error: "result is required" }, { status: 400 });
    const id = body.id ? String(body.id) : `skit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = typeof body.result === "string" ? body.result : JSON.stringify(body.result);
    const rows = await sql`
      INSERT INTO scripts (id, result, topic, context, format, mode_used, created_at)
      VALUES (${id}, ${result}, ${(body.topic || "").trim()}, ${(body.context || "").trim()}, ${body.format || null}, ${body.modeUsed || null}, now())
      ON CONFLICT (id) DO UPDATE SET result = EXCLUDED.result, topic = EXCLUDED.topic, context = EXCLUDED.context, format = EXCLUDED.format, mode_used = EXCLUDED.mode_used, created_at = now()
      RETURNING id, result, topic, context, format, mode_used, created_at
    `;
    return Response.json({ script: serializeScript(rows[0]) });
  } catch (err) {
    return Response.json({ error: err?.message || "Failed to save skit." }, { status: 500 });
  }
}
