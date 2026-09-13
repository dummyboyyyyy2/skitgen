// Splits Gemini traffic across 4 API keys instead of one shared key for both
// generators. Without this, every Gemini-routed action in BOTH Solo and
// Couple (which is most of Solo's pipeline, and nearly all of Couple's non-
// script/refine pipeline) shares one quota — this spreads that load 2 keys
// per app.
//
// Assignment is balanced by WEIGHT, not just action count. There's no
// per-action call-volume logging (Vercel's request logs only see the route,
// not the `action` field inside the POST body), so maxTokens-per-call is
// used as the load proxy instead — a synthesizeDNA/updateDNA call (4000
// tokens) is meaningfully heavier on a key's quota than a distillAvoidNote
// call (120 tokens), independent of how often each is actually invoked.
// A first pass that just split the action list in half by count put ~5350
// tokens/call on one Solo key and ~10720 on the other; the assignment below
// balances both apps to within a few percent instead.
//
// GEMINI_API_KEY is kept as Solo's first key for backward compatibility
// (it's the key that's already configured in every existing environment).
// The other three are new and must be added in Vercel → Settings →
// Environment Variables.

const SOLO_KEY_A = process.env.GEMINI_API_KEY;
const SOLO_KEY_B = process.env.GEMINI_API_KEY_SOLO_2;
const COUPLE_KEY_A = process.env.GEMINI_API_KEY_COUPLE_1;
const COUPLE_KEY_B = process.env.GEMINI_API_KEY_COUPLE_2;

// Solo — key A ≈ 7870 maxTokens/call combined, key B ≈ 8200.
const SOLO_ACTION_KEY = {
  synthesizeDNA: SOLO_KEY_A, // 4000
  refine: SOLO_KEY_A, // 2600 — only reached when the "Gemini (direct)" source toggle is on
  ideas: SOLO_KEY_A, // 900
  tone: SOLO_KEY_A, // 250
  distillAvoidNote: SOLO_KEY_A, // 120
  updateDNA: SOLO_KEY_B, // 4000
  script: SOLO_KEY_B, // ~2400 avg — only reached when the "Gemini (direct)" source toggle is on
  analyzeSample: SOLO_KEY_B, // 1800
};

// Couple — key A ≈ 8340 maxTokens/call combined, key B ≈ 8420.
const COUPLE_ACTION_KEY = {
  synthesizeDNA: COUPLE_KEY_A, // 4000
  refine: COUPLE_KEY_A, // 3000 — only reached when the "Gemini (direct)" source toggle is on
  ideas: COUPLE_KEY_A, // 900
  vibe: COUPLE_KEY_A, // 220
  tone: COUPLE_KEY_A, // 220
  updateDNA: COUPLE_KEY_B, // 4000
  script: COUPLE_KEY_B, // ~2500 avg — only reached when the "Gemini (direct)" source toggle is on
  analyzeSample: COUPLE_KEY_B, // 1800
  distillAvoidNote: COUPLE_KEY_B, // 120
};

// Falls back to each app's "A" key for any action not explicitly listed
// above (e.g. a new action added later), rather than throwing.
export function getSoloGeminiKey(action) {
  return SOLO_ACTION_KEY[action] || SOLO_KEY_A;
}

export function getCoupleGeminiKey(action) {
  return COUPLE_ACTION_KEY[action] || COUPLE_KEY_A;
}
