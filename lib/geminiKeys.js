// Splits Gemini traffic across 4 API keys instead of one shared key for both
// generators. Without this, every Gemini-routed action in BOTH Solo and
// Couple (which is most of Solo's pipeline, and nearly all of Couple's non-
// script/refine pipeline) shares one quota — this spreads that load 2 keys
// per app, chosen by action so each key's traffic is predictable.
//
// GEMINI_API_KEY is kept as Solo's first key for backward compatibility
// (it's the key that's already configured in every existing environment).
// The other three are new and must be added in Vercel → Settings →
// Environment Variables.

const SOLO_KEY_A = process.env.GEMINI_API_KEY;
const SOLO_KEY_B = process.env.GEMINI_API_KEY_SOLO_2;
const COUPLE_KEY_A = process.env.GEMINI_API_KEY_COUPLE_1;
const COUPLE_KEY_B = process.env.GEMINI_API_KEY_COUPLE_2;

const SOLO_ACTION_KEY = {
  ideas: SOLO_KEY_A,
  tone: SOLO_KEY_A,
  analyzeSample: SOLO_KEY_A,
  script: SOLO_KEY_A, // only reached when the "Gemini (direct)" source toggle is on
  distillAvoidNote: SOLO_KEY_B,
  synthesizeDNA: SOLO_KEY_B,
  updateDNA: SOLO_KEY_B,
  refine: SOLO_KEY_B, // only reached when the "Gemini (direct)" source toggle is on
};

const COUPLE_ACTION_KEY = {
  ideas: COUPLE_KEY_A,
  vibe: COUPLE_KEY_A,
  tone: COUPLE_KEY_A,
  analyzeSample: COUPLE_KEY_A,
  script: COUPLE_KEY_A, // only reached when the "Gemini (direct)" source toggle is on
  synthesizeDNA: COUPLE_KEY_B,
  updateDNA: COUPLE_KEY_B,
  distillAvoidNote: COUPLE_KEY_B,
  refine: COUPLE_KEY_B, // only reached when the "Gemini (direct)" source toggle is on
};

// Falls back to each app's "A" key for any action not explicitly listed
// above (e.g. a new action added later), rather than throwing.
export function getSoloGeminiKey(action) {
  return SOLO_ACTION_KEY[action] || SOLO_KEY_A;
}

export function getCoupleGeminiKey(action) {
  return COUPLE_ACTION_KEY[action] || COUPLE_KEY_A;
}
