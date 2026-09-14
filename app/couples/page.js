"use client";

import { useState, useEffect, useRef } from "react";
import ModeSwitcher from "@/lib/ModeSwitcher";
import ModelSelect from "@/lib/ModelSelect";

// Cap on how many samples can feed the Couple Comedy DNA per training run —
// separate cap from Solo's own (app/page.js). Past this, more samples tend to
// average out distinctive quirks instead of sharpening them, and every
// training run resends every sample's full text in one prompt (see analyze()
// below), so this also keeps that prompt from growing unbounded.
const MAX_TRAINING_SAMPLES = 20;

// ─── DATA ──────────────────────────────────────────────────────────────────

const VIBES = [
  { id: "surprise-me", label: "Surprise Me", emoji: "🎲", desc: "AI picks the best combo" },
  { id: "bait-switch", label: "Bait & Switch", emoji: "🎭", desc: "Setup one thing, deliver another" },
  { id: "expectation-reality", label: "Expectation vs Reality", emoji: "😅", desc: "How you thought vs how it went" },
  { id: "petty", label: "Petty", emoji: "😏", desc: "Technically correct. Annoyingly so." },
  { id: "deadpan", label: "Deadpan", emoji: "😐", desc: "The non-reaction is the joke" },
  { id: "personality-clash", label: "Personality Clash", emoji: "⚡", desc: "Two completely different humans" },
  { id: "chaos", label: "Chaos", emoji: "🤪", desc: "One bad decision. Then another." },
];

const FORMATS = [
  { id: "acted-skit", label: "Acted Skit", emoji: "🎬", desc: "Dialogue, physical acting, reactions, escalation" },
  { id: "text-overlay", label: "Text Overlay", emoji: "📱", desc: "On-screen text beats over background video, visual storytelling, minimal spoken lines" },
];

const LOCATIONS = [
  { id: "ai", label: "AI Choose", emoji: "🤖" },
  { id: "home", label: "Home", emoji: "🛋️" },
  { id: "kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "bedroom", label: "Bedroom", emoji: "🛏️" },
  { id: "bathroom", label: "Getting Ready", emoji: "🪥" },
  { id: "car", label: "Car", emoji: "🚗" },
  { id: "cafe", label: "Café", emoji: "☕" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "grocery", label: "Grocery Store", emoji: "🛒" },
  { id: "bar", label: "Bar", emoji: "🍹" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "family-dinner", label: "Family Dinner", emoji: "👨‍👩‍👧" },
  { id: "wedding", label: "Wedding", emoji: "💒" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "park", label: "Park", emoji: "🌿" },
  { id: "gym", label: "Gym", emoji: "🏋️" },
  { id: "mall", label: "Mall", emoji: "🛍️" },
  { id: "airport", label: "Airport", emoji: "✈️" },
  { id: "hotel", label: "Hotel", emoji: "🏨" },
  { id: "road-trip", label: "Road Trip", emoji: "🗺️" },
  { id: "vacation", label: "Vacation", emoji: "🌴" },
  { id: "ikea", label: "IKEA", emoji: "🪑" },
  { id: "drive-thru", label: "Drive-Thru", emoji: "🌙" },
  { id: "waiting-room", label: "Waiting Room", emoji: "🏥" },
  { id: "concert", label: "Concert / Festival", emoji: "🎵" },
  { id: "amusement-park", label: "Amusement Park", emoji: "🎡" },
  { id: "holiday", label: "Holiday Gathering", emoji: "🎄" },
];

const PERSONALITIES = [
  { id: "deadpan", label: "Deadpan" },
  { id: "dramatic", label: "Dramatic" },
  { id: "overconfident", label: "Overconfident" },
  { id: "anxious", label: "Anxious Overthinker" },
  { id: "literal", label: "Literal" },
  { id: "sarcastic", label: "Sarcastic" },
  { id: "competitive", label: "Competitive" },
  { id: "oblivious", label: "Oblivious" },
  { id: "too-honest", label: "Too Honest" },
  { id: "people-pleaser", label: "People Pleaser" },
  { id: "petty", label: "Petty" },
  { id: "calm", label: "Calm Under Pressure" },
  { id: "distracted", label: "Distracted" },
  { id: "rule-follower", label: "Rule Follower" },
  { id: "chaotic", label: "Chaotic" },
];

const DYNAMICS = [
  { id: "ai", label: "AI Choose" },
  { id: "confident-confused", label: "One confident / one confused" },
  { id: "logical-vibes", label: "Logical / Vibes" },
  { id: "dramatic-unreactive", label: "Dramatic / Unreactive" },
  { id: "both-stubborn", label: "Stubborn for different reasons" },
  { id: "helping-worse", label: "Helping makes things worse" },
  { id: "memory-gap", label: "Memory discrepancy" },
  { id: "trying-leave", label: "Trying to leave / keeps creating problems" },
  { id: "both-wrong", label: "Both know they're wrong, won't admit it" },
  { id: "innocent-exposes", label: "Innocent question exposes the other" },
  { id: "affectionate-annoying", label: "Affectionate but annoying" },
  { id: "escalation", label: "Escalation" },
  { id: "literal-interpretation", label: "Literal interpretation" },
  { id: "subject-changing", label: "Subject changing" },
  { id: "simple-vs-complicated", label: "Simple answer vs complicated answer" },
  { id: "bad-lying", label: "Bad lying" },
  { id: "different-ready", label: "Different definitions of 'ready'" },
  { id: "different-nothing", label: "Different definitions of 'nothing'" },
  { id: "remembers-doesnt", label: "One remembers / one absolutely does not" },
];

const INTENSITIES = [
  { id: "subtle", label: "Subtle" },
  { id: "realistic", label: "Realistic" },
  { id: "heightened", label: "Heightened" },
  { id: "chaotic", label: "Chaotic" },
  { id: "absurd", label: "Absurd" },
];

const FLAVORS = [
  { id: "playful", label: "Playful" },
  { id: "dry", label: "Dry" },
  { id: "affectionate", label: "Affectionate" },
  { id: "petty", label: "Petty" },
  { id: "awkward", label: "Awkward" },
  { id: "sarcastic", label: "Sarcastic" },
  { id: "competitive", label: "Competitive" },
  { id: "wholesome", label: "Wholesome" },
];

const BLUEPRINTS = [
  { id: "ai", label: "AI Choose" },
  { id: "immediate-conflict", label: "Immediate Conflict" },
  { id: "bait-switch", label: "Bait & Switch" },
  { id: "misunderstanding", label: "Misunderstanding Escalation" },
  { id: "innocent-disaster", label: "Innocent Question → Disaster" },
  { id: "tiny-ridiculous", label: "Tiny Problem → Ridiculous Escalation" },
  { id: "negotiation", label: "Couple Negotiation" },
  { id: "investigation", label: "Investigation / Evidence" },
  { id: "silent-chain", label: "Silent Reaction Chain" },
  { id: "expectation-reality", label: "Expectation → Reality" },
  { id: "unexpected-beat", label: "Normal Situation → Unexpected Final Beat" },
];

const REFINEMENTS = [
  { id: "funnier", label: "Make Funnier", emoji: "😂" },
  { id: "realistic", label: "More Realistic", emoji: "🎯" },
  { id: "chaotic", label: "More Chaotic", emoji: "🤪" },
  { id: "relatable", label: "More Relatable", emoji: "🫂" },
  { id: "shorter", label: "Shorter", emoji: "✂️" },
  { id: "visual", label: "More Visual", emoji: "🎬" },
  { id: "hook", label: "Stronger Hook", emoji: "🪝" },
  { id: "ending", label: "Stronger Ending", emoji: "💥" },
  { id: "dialogue", label: "More Natural Dialogue", emoji: "💬" },
];

const LOADING_MSGS = [
  "Finding the actual argument...",
  "Making sure this feels like a real couple...",
  "Looking for the escalation...",
  "Cutting the unnecessary dialogue...",
  "Finding the better ending...",
  "Checking if this is actually filmable...",
  "Adding the part people will send to their partner...",
  "Making sure nobody explains the joke...",
  "Picking the right awkward pause...",
  "Finding the specific version of this...",
  "Making the ending land harder...",
  "Removing the sitcom dialogue...",
];

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────



// ─── COLORS ────────────────────────────────────────────────────────────────

// Same design tokens as SKIT GEN (app/page.js) — same hex values as the
// CSS variables in app/layout.js (kept as plain hex, not var(), because a
// few spots below tint these via string-concatenated alpha suffixes like
// `${C.pink}10`, which only works on literal hex, not a var() reference).
// Key names kept as-is (pink/purple/etc.) to avoid touching every call site;
// only the values changed, from the old standalone light/pink theme to
// SKIT GEN's dark surfaces + single gold accent.
const C = {
  pink: "#f0b429",    // = var(--accent)   — primary accent (was magenta pink)
  purple: "#34d399",  // = var(--success)  — secondary/DNA accent (was purple)
  ink: "#14100a",      // dark text for use ON accent-colored backgrounds
  dark: "#f5f5f5",      // = var(--text-primary)
  mid: "#a0a0a0",        // = var(--text-secondary)
  muted: "#666666",      // = var(--text-muted)
  border: "#222222",     // = var(--border)
  bg: "#0d0d0d",           // = var(--surface-1) — recessed input surface
  white: "#111111",        // = var(--surface-2) — card surface (was white cards)
  green: "#34d399",        // = var(--success)
};

// ─── UTILS ─────────────────────────────────────────────────────────────────

function parseJSON(text) {
  try {
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(clean);
  } catch {
    // Fallback rescue must handle array responses ([...]) as well as object
    // responses ({...}) — generateIdeas() expects a top-level array, every
    // other caller here expects an object. Mirrors Solo's safeJSONParse
    // (lib/gemini.js), which already covers both.
    try {
      const start = Math.min(
        ...["{", "["].map((c) => {
          const i = text.indexOf(c);
          return i === -1 ? Infinity : i;
        })
      );
      const endBrace = text.lastIndexOf("}");
      const endBracket = text.lastIndexOf("]");
      const end = Math.max(endBrace, endBracket);
      if (start !== Infinity && end !== -1) {
        return JSON.parse(text.slice(start, end + 1));
      }
    } catch {}
    return null;
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatAIError(data, status) {
  if (data?.code === "RATE_LIMIT_EXHAUSTED") {
    const providerName = data.provider === "openrouter" ? "OpenRouter" : data.provider === "anthropic" ? "Anthropic" : "Gemini";
    const wait = Number.isFinite(Number(data.retryAfter)) && Number(data.retryAfter) > 0
      ? ` The provider asked us to wait about ${Math.ceil(Number(data.retryAfter))} seconds.`
      : "";
    return `${providerName} rate limit reached — this API is temporarily maxed out for this request.${wait} Please wait a little and try again.`;
  }
  return data?.error || `API error ${status} — please try again.`;
}

function formatTokenUsage(usage) {
  const total = Number(usage?.totalTokens || 0);
  return total > 0 ? `${total.toLocaleString()} tokens used` : null;
}

// Calls our own /api/couple route (server holds ANTHROPIC_API_KEY) instead of
// api.anthropic.com directly — the browser can't call Anthropic's API on its
// own (no key, and it's not CORS-enabled for direct client calls).
async function callAPI(action, payload = {}) {
  const res = await fetch("/api/couple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(formatAIError(data, res.status));
    err.code = data?.code;
    err.provider = data?.provider;
    throw err;
  }
  return { text: data.text || "", usage: data.usage || null, data };
}

// Couple persistence is Neon-backed. The browser only keeps transient UI state;
// durable samples, DNA, saved ideas, and tone notes are loaded/saved through
// the /api/couple/* routes.

// ─── SMALL COMPONENTS ──────────────────────────────────────────────────────

const sLabel = {
  fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: C.muted, marginBottom: "8px", display: "block",
};

function Chip({ label, emoji, selected, onClick, color = C.pink }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px", borderRadius: "100px",
      border: `1.5px solid ${selected ? color : C.border}`,
      background: selected ? color : C.white,
      color: selected ? C.ink : C.dark,
      fontSize: "13px", fontWeight: selected ? 700 : 500,
      cursor: "pointer", display: "inline-flex", alignItems: "center",
      gap: "5px", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.12s",
    }}>
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

function Tag({ label, color = C.pink }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: "6px",
      background: `${color}18`, color, fontSize: "11px", fontWeight: 700,
    }}>{label}</span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
      padding: "5px 12px", borderRadius: "8px", border: `1px solid ${C.border}`,
      background: copied ? C.green : C.white, color: copied ? C.ink : C.muted,
      fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────

function ResultCard({ result, onRefine, refining, onSave, saved, onAvoid, avoidSubmitting, usage }) {
  const [tab, setTab] = useState("script");
  const [showAvoid, setShowAvoid] = useState(false);
  const [avoidReason, setAvoidReason] = useState("");
  const [customRefine, setCustomRefine] = useState("");

  const scriptText = result.script || "";
  const postText = `${result.caption || ""}\n\n${(result.hashtags || []).map(h => `#${h.replace(/^#/, "")}`).join(" ")}`;
  const breakdownText = [
    result.premise && `PREMISE\n${result.premise}`,
    result.characters?.length && `\nCHARACTERS\n${result.characters.map(c => `${c.role}: ${c.trait}`).join("\n")}`,
    result.beats?.length && `\nBEATS\n${result.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
    result.visual_actions?.length && `\nVISUAL MOMENTS\n${result.visual_actions.join("\n")}`,
    result.shot_list?.length && `\nSHOT LIST\n${result.shot_list.join("\n")}`,
    result.ending && `\nENDING\n${result.ending}`,
    result.props?.length && `\nPROPS\n${result.props.join(", ")}`,
  ].filter(Boolean).join("");

  const tabText = { script: scriptText, breakdown: breakdownText, post: postText };

  return (
    <div style={{ background: C.white, borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border-soft)", marginBottom: "12px" }}>

      {/* Header */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: C.dark, lineHeight: 1.3, flex: 1 }}>
            {result.title || "Untitled"}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {usage && formatTokenUsage(usage) && <span style={{ fontSize: "10px", color: C.muted, border: `1px solid ${C.border}`, borderRadius: "999px", padding: "4px 8px", whiteSpace: "nowrap" }}>{formatTokenUsage(usage)}</span>}
            <CopyBtn text={tabText[tab]} />
            <button onClick={onSave} style={{
              padding: "5px 12px", borderRadius: "8px",
              border: `1px solid ${saved ? C.green : C.border}`,
              background: saved ? `${C.green}15` : C.white,
              color: saved ? C.green : C.muted,
              fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            }}>{saved ? "✓ Saved" : "Save"}</button>
          </div>
        </div>

        {/* Hook */}
        <div style={{ background: `${C.pink}08`, borderRadius: "10px", padding: "10px 13px", marginBottom: "10px" }}>
          <span style={{ ...sLabel, marginBottom: "3px" }}>Hook</span>
          <div style={{ fontSize: "13px", color: C.mid, lineHeight: 1.6 }}>{result.hook}</div>
        </div>

        {/* Meta tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {result.estimated_runtime && <Tag label={`⏱ ${result.estimated_runtime}`} color={C.purple} />}
          {result.filming_difficulty && (
            <Tag label={`📹 ${result.filming_difficulty}`} color={result.filming_difficulty === "Easy" ? C.green : result.filming_difficulty === "Hard" ? C.pink : C.purple} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {[{ id: "script", label: "Script" }, { id: "breakdown", label: "Breakdown" }, { id: "post", label: "Post" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "11px 0", border: "none", background: "none",
            borderBottom: tab === t.id ? `2px solid ${C.pink}` : "2px solid transparent",
            color: tab === t.id ? C.pink : C.muted,
            fontSize: "13px", fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", fontFamily: "inherit", marginBottom: "-1px", transition: "all 0.12s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "16px 18px" }}>
        {tab === "script" && (
          <div style={{ fontSize: "14px", lineHeight: 1.85, whiteSpace: "pre-wrap", color: C.dark }}>
            {result.script || "No script generated."}
          </div>
        )}

        {tab === "breakdown" && (
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: C.dark }}>
            {result.premise && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Premise</span>
                <div style={{ fontStyle: "italic", color: C.mid }}>{result.premise}</div>
              </div>
            )}
            {result.characters?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Characters</span>
                {result.characters.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "5px" }}>
                    <span style={{ fontWeight: 700, color: C.mid, minWidth: "90px" }}>{c.role}</span>
                    <span style={{ color: C.muted }}>{c.trait}</span>
                  </div>
                ))}
              </div>
            )}
            {result.beats?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Beats</span>
                {result.beats.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px" }}>
                    <span style={{ color: C.pink, fontWeight: 800, minWidth: "18px", fontSize: "12px" }}>{i + 1}</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}
            {result.visual_actions?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Visual Moments</span>
                {result.visual_actions.map((v, i) => (
                  <div key={i} style={{ paddingLeft: "10px", borderLeft: `2px solid ${C.purple}`, marginBottom: "6px", color: C.mid }}>{v}</div>
                ))}
              </div>
            )}
            {result.shot_list?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Shot List</span>
                {result.shot_list.map((s, i) => <div key={i} style={{ marginBottom: "5px" }}>📷 {s}</div>)}
              </div>
            )}
            {result.ending && (
              <div style={{ marginBottom: "14px" }}>
                <span style={sLabel}>Ending</span>
                <div style={{ background: `${C.pink}08`, padding: "10px 13px", borderRadius: "10px" }}>{result.ending}</div>
              </div>
            )}
            {result.props?.length > 0 && (
              <div>
                <span style={sLabel}>Props</span>
                <div style={{ color: C.muted }}>{result.props.join(", ")}</div>
              </div>
            )}
          </div>
        )}

        {tab === "post" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <span style={sLabel}>Caption</span>
              <div style={{ fontSize: "14px", lineHeight: 1.6, color: C.dark, padding: "12px 14px", background: `${C.purple}08`, borderRadius: "10px" }}>
                {result.caption || "—"}
              </div>
            </div>
            <div>
              <span style={sLabel}>Hashtags</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(result.hashtags || []).map((h, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: "100px", background: `${C.purple}12`, color: C.purple, fontSize: "12px", fontWeight: 600 }}>
                    #{h.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Negative feedback / Avoid */}
      {tab === "script" && (
        <div style={{ padding: "0 18px 14px" }}>
          {!showAvoid ? (
            <button onClick={() => setShowAvoid(true)} disabled={avoidSubmitting} style={{
              border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: "8px",
              padding: "7px 11px", fontSize: "11px", fontWeight: 600, cursor: avoidSubmitting ? "not-allowed" : "pointer", fontFamily: "inherit"
            }}>
              👎 Not this one
            </button>
          ) : (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: "10px", padding: "12px 13px", background: `${C.pink}05` }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: C.dark, marginBottom: "5px" }}>What didn't work? <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></div>
              <div style={{ fontSize: "11px", color: C.muted, lineHeight: 1.5, marginBottom: "9px" }}>Your note helps make the next scripts better. You can also just send the thumbs-down.</div>
              <textarea
                value={avoidReason}
                onChange={(e) => setAvoidReason(e.target.value)}
                placeholder="e.g. too predictable, too mean, felt forced..."
                rows={2}
                disabled={avoidSubmitting}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: `1px solid ${C.border}`, borderRadius: "8px", padding: "9px 10px", fontSize: "12px", fontFamily: "inherit", color: C.dark, background: C.white, outline: "none", marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "7px" }}>
                <button onClick={() => { onAvoid(result.script || "", avoidReason); setShowAvoid(false); setAvoidReason(""); }} disabled={avoidSubmitting} style={{ flex: 1, border: "none", background: C.pink, color: C.ink, borderRadius: "8px", padding: "8px", fontSize: "11px", fontWeight: 700, cursor: avoidSubmitting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {avoidSubmitting ? "Learning from this ···" : "Save to Avoid List"}
                </button>
                <button onClick={() => { setShowAvoid(false); setAvoidReason(""); }} disabled={avoidSubmitting} style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: "8px", padding: "8px 12px", fontSize: "11px", cursor: avoidSubmitting ? "not-allowed" : "pointer", fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refinement */}
      <div style={{ padding: "0 18px 18px" }}>
        <span style={{ ...sLabel, display: "block", marginBottom: "8px" }}>Refine</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {REFINEMENTS.map(r => (
            <button key={r.id} onClick={() => !refining && onRefine(r.id)} disabled={refining} style={{
              padding: "6px 12px", borderRadius: "8px",
              border: `1.5px solid ${C.border}`, background: C.white,
              color: refining ? C.muted : C.dark,
              fontSize: "12px", fontWeight: 500,
              cursor: refining ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "4px", transition: "all 0.1s",
            }}>
              <span>{r.emoji}</span><span>{r.label}</span>
            </button>
          ))}
        </div>
        <textarea
          value={customRefine}
          onChange={(e) => setCustomRefine(e.target.value)}
          placeholder="Make the ending crazier..."
          rows={2}
          disabled={refining}
          style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", fontSize: "12px", fontFamily: "inherit", color: C.dark, background: C.white, outline: "none", marginTop: "10px", marginBottom: "8px", lineHeight: 1.5 }}
        />
        <button
          onClick={() => { if (!refining && customRefine.trim()) { onRefine("custom", customRefine.trim()); setCustomRefine(""); } }}
          disabled={refining || !customRefine.trim()}
          style={{
            width: "100%", border: "none", background: C.pink, color: C.ink, borderRadius: "8px",
            padding: "9px", fontSize: "12px", fontWeight: 700, fontFamily: "inherit",
            cursor: refining || !customRefine.trim() ? "not-allowed" : "pointer",
            opacity: refining || !customRefine.trim() ? 0.5 : 1,
          }}
        >
          {refining ? "Rewriting ···" : "✦ Rewrite"}
        </button>
      </div>
    </div>
  );
}

// ─── SAVED PANEL ───────────────────────────────────────────────────────────

function SavedPanel({ ideas, onOpen, onDelete, onClose }) {
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 100vw)",
      background: C.white, border: "1px solid var(--border-soft)",
      zIndex: 200, display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 800, color: C.dark }}>Saved Ideas ({ideas.length})</div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: C.muted, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
        {ideas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.muted, fontSize: "14px" }}>
            No saved ideas yet.<br />Generate and save one!
          </div>
        ) : ideas.map(idea => (
          <div key={idea.id} style={{ background: C.bg, borderRadius: "8px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: C.dark, marginBottom: "4px" }}>{idea.result?.title || "Untitled"}</div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "12px", lineHeight: 1.5 }}>{idea.result?.premise || ""}</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => onOpen(idea)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: C.pink, color: C.ink, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Open</button>
              <CopyBtn text={idea.result?.script || ""} />
              <button onClick={() => onDelete(idea.id)} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DNA TRAINER COMPONENT ─────────────────────────────────────────────────
// Layout mirrors Solo's ComedyDNAView (app/page.js) — same card structure,
// section labels, sample cards, and structured DNA display — kept
// self-contained here since Couple's samples/DNA live behind separate
// /api/couple/* routes. No positive/negative/neutral labeling on samples;
// every sample is treated as evidence and the API defaults its stored
// `type` to "positive" (see /api/couple/samples).

const DNA_C = {
  textFaint: "#3d3d3d",
  warning: "#f2a93b",
  warningDim: "#2a2010",
  danger: "#f0575f",
  dangerDim: "#2a1114",
};

const dnaCard = { background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "20px 22px" };
const dnaLabel = { fontSize: "11px", letterSpacing: "1.5px", color: C.muted, display: "block", marginBottom: "12px", fontWeight: 600 };
const dnaChip = { padding: "5px 14px", borderRadius: "20px", fontSize: "11px", background: C.bg, color: C.mid, border: `1px solid ${C.border}` };

function DnaPrimaryButton({ children, disabled, onClick, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "15px", borderRadius: "8px", border: "1px solid transparent",
      fontSize: "13px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
      background: disabled ? C.border : C.purple, color: disabled ? C.muted : C.ink,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", ...style,
    }}>{children}</button>
  );
}

function DnaSecondaryButton({ children, disabled, onClick, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "11px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
      border: `1px solid ${C.border}`, background: "transparent", color: C.dark,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", ...style,
    }}>{children}</button>
  );
}

function DnaGhostButton({ children, disabled, onClick, style, danger = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 4px", fontSize: "12px", fontWeight: 500,
      border: "none", background: "transparent", color: danger ? DNA_C.danger : C.muted,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", ...style,
    }}>{children}</button>
  );
}

function DnaStatBar({ label, value }) {
  const pct = Math.max(0, Math.min(10, value || 0)) * 10;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: C.mid, textTransform: "capitalize" }}>{String(label).replace(/_/g, " ")}</span>
        <span style={{ fontSize: "12px", color: C.muted }}>{value || 0}/10</span>
      </div>
      <div style={{ height: "6px", background: C.bg, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.purple, borderRadius: "3px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function DnaSampleStatusBadge({ sample, isIncluded }) {
  if (sample.analysis_error) {
    return <span style={{ fontSize: "11px", color: DNA_C.danger, fontWeight: 600 }}>! ANALYSIS FAILED</span>;
  }
  if (!sample.analysis) {
    return <span style={{ fontSize: "11px", color: DNA_C.warning, fontWeight: 600 }}>○ NEEDS ANALYSIS</span>;
  }
  if (isIncluded) {
    return <span style={{ fontSize: "11px", color: C.green, fontWeight: 600 }}>✓ IN DNA</span>;
  }
  return <span style={{ fontSize: "11px", color: C.mid, fontWeight: 600 }}>✓ ANALYZED</span>;
}

function DnaTrainer({ dnaProfile, onProfileUpdate, avoidNotes = [], deleteAvoidNote }) {
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleNotes, setSampleNotes] = useState("");
  const [input, setInput] = useState("");
  const [sampleFormat, setSampleFormat] = useState(null); // null = "Unspecified"
  const [addingSample, setAddingSample] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [buildingDNA, setBuildingDNA] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [err, setErr] = useState(null);
  const [includedSampleIds, setIncludedSampleIds] = useState([]);
  const [dnaNeedsRebuild, setDnaNeedsRebuild] = useState(false);
  const [expandedSampleId, setExpandedSampleId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedSampleId, setCopiedSampleId] = useState(null);
  const msgRef = useRef(null);

  const ANALYZE_MSGS = [
    "Studying the comedy instincts...",
    "Looking for the pattern behind the pattern...",
    "Finding what makes this couple tick...",
    "Mapping the humor DNA...",
    "Building the taste profile...",
    "Identifying the specific behavior...",
    "Learning the dialogue rhythm...",
    "Analyzing the endings...",
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/couple/samples");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to load samples (${res.status})`);
        if (!cancelled) setSamples(Array.isArray(data.samples) ? data.samples : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load samples.");
      } finally {
        if (!cancelled) setLoadingSamples(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/couple/dna")
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.dna) setIncludedSampleIds(Array.isArray(data.includedSampleIds) ? data.includedSampleIds : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const addSample = async () => {
    const text = input.trim();
    if (!text) return;
    setErr(null);
    try {
      const res = await fetch("/api/couple/samples", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          title: sampleTitle.trim() || `Couple sample ${samples.length + 1}`,
          notes: sampleNotes.trim(),
          format: sampleFormat,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to save sample (${res.status})`);
      setSamples(prev => [...prev, data.sample]);
      setInput("");
      setSampleTitle("");
      setSampleNotes("");
      setSampleFormat(null);
    } catch (e) { setErr(e.message || "Failed to save sample."); }
  };

  const deleteSample = async (id) => {
    try {
      const res = await fetch(`/api/couple/samples/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to delete sample (${res.status})`);
      setSamples(prev => prev.filter(x => x.id !== id));
      if (includedSampleIds.includes(id)) setDnaNeedsRebuild(true);
      setIncludedSampleIds(prev => prev.filter(x => x !== id));
    } catch (e) { setErr(e.message || "Failed to delete sample."); }
  };

  const dnaAction = async (payload, maxTokens = 1800) => {
    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, maxTokens }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(formatAIError(data, res.status));
      err.code = data?.code;
      err.provider = data?.provider;
      throw err;
    }
    return data;
  };

  // Analyzes a single sample and patches the result to the DB + local state.
  // Shared by the bulk analyze() loop below and the per-sample reanalyze button.
  const analyzeOneSample = async (sample, label) => {
    const formatObj = sample.format ? FORMATS.find(f => f.id === sample.format) : null;
    try {
      const data = await dnaAction({
        action: "analyzeSample",
        content: sample.text,
        title: sample.title || label || "Couple sample",
        sampleType: sample.type,
        formatLabel: formatObj?.label || null,
        formatDesc: formatObj?.desc || null,
      }, 1800);
      const patchRes = await fetch(`/api/couple/samples/${encodeURIComponent(sample.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: data.analysis, analysisError: "" }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) throw new Error(patchData?.error || "Failed to save sample analysis.");
      setSamples(prev => prev.map(x => x.id === sample.id ? patchData.sample : x));
      return patchData.sample;
    } catch (sampleErr) {
      const msg = sampleErr?.message || "Analysis failed.";
      await fetch(`/api/couple/samples/${encodeURIComponent(sample.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisError: msg }),
      }).catch(() => {});
      throw sampleErr instanceof Error ? sampleErr : new Error(msg);
    }
  };

  const reanalyzeSample = async (sample) => {
    if (analyzing || buildingDNA) return;
    setErr(null);
    setAnalyzeMsg(`Reanalyzing "${sample.title || "sample"}"...`);
    try {
      const resetRes = await fetch(`/api/couple/samples/${encodeURIComponent(sample.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAnalysis: true }),
      });
      const resetData = await resetRes.json().catch(() => ({}));
      if (!resetRes.ok) throw new Error(resetData?.error || "Failed to reset sample.");
      setSamples(prev => prev.map(x => x.id === sample.id ? resetData.sample : x));
      await analyzeOneSample(resetData.sample);
      setIncludedSampleIds(prev => prev.filter(id => id !== sample.id));
      setDnaNeedsRebuild(true);
      setAnalyzeMsg(`"${sample.title || "Sample"}" reanalyzed successfully.`);
    } catch (e) {
      setErr(e.message || "Reanalysis failed.");
    }
  };

  const handleCopySample = (sample) => {
    navigator.clipboard?.writeText(sample.text || "");
    setCopiedSampleId(sample.id);
    setTimeout(() => setCopiedSampleId(null), 2000);
  };

  // Step 1 of Training: analyze every sample that doesn't have an analysis
  // yet. Mirrors Solo's analyzeAllPending() — no DNA build here.
  const analyzeAllPending = async () => {
    if (analyzing || buildingDNA) return;
    const pending = samples.filter((s) => !s.analysis);
    if (pending.length === 0) return;

    setAnalyzing(true);
    setErr(null);
    setAnalyzeMsg(pick(ANALYZE_MSGS));
    msgRef.current = setInterval(() => setAnalyzeMsg(pick(ANALYZE_MSGS)), 2200);

    try {
      let working = [...samples];
      for (let i = 0; i < working.length; i++) {
        if (working[i].analysis && !working[i].analysis_error) continue;
        setAnalyzeMsg(`Analyzing sample ${i + 1} of ${working.length}...`);
        const s = working[i];
        try {
          working[i] = await analyzeOneSample(s, `Couple sample ${i + 1}`);
        } catch (sampleErr) {
          throw new Error(`Sample ${i + 1} analysis failed: ${sampleErr?.message || "Analysis failed."}`);
        }
      }
      setAnalyzeMsg(`Analyzed ${pending.length} new sample${pending.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setErr(e.message || "Analysis failed. Please try again.");
    } finally {
      clearInterval(msgRef.current);
      setAnalyzing(false);
    }
  };

  // Step 2 of Training: build/update Comedy DNA from already-analyzed
  // samples. Separate from analyzeAllPending() so each step is visible and
  // can be retried independently — mirrors Solo's split analyze/build flow.
  const buildDna = async (manualForceFull = false) => {
    if (analyzing || buildingDNA) return;
    const ready = samples.filter((s) => s.analysis);
    if (!ready.length) {
      setErr("No analyzed samples yet. Analyze your samples first.");
      return;
    }

    const forceFull = manualForceFull || !dnaProfile || dnaNeedsRebuild;
    const newSamples = ready.filter((s) => !includedSampleIds.includes(s.id));

    if (!forceFull && newSamples.length === 0) {
      setAnalyzeMsg("Comedy DNA is already up to date.");
      return;
    }

    // Cap check — block before spending a call, with an actionable message,
    // rather than silently dropping/rotating samples on the user's behalf.
    if (forceFull) {
      if (ready.length > MAX_TRAINING_SAMPLES) {
        setErr(
          `You have ${ready.length} analyzed samples, over the ${MAX_TRAINING_SAMPLES}-sample training cap. ` +
          `Delete ${ready.length - MAX_TRAINING_SAMPLES} sample${ready.length - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} (keep your strongest/most representative ones) before training.`
        );
        return;
      }
    } else {
      const totalAfter = includedSampleIds.length + newSamples.length;
      if (totalAfter > MAX_TRAINING_SAMPLES) {
        setErr(
          `Training on these ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"} would put you at ${totalAfter}, over the ${MAX_TRAINING_SAMPLES}-sample cap. ` +
          `Delete ${totalAfter - MAX_TRAINING_SAMPLES} older/weaker sample${totalAfter - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} first, or use "full rebuild from all samples" after pruning.`
        );
        return;
      }
    }

    setBuildingDNA(true);
    setErr(null);

    try {
      const chosen = forceFull ? ready : newSamples;
      const analyses = chosen.map((s) => {
        const formatObj = s.format ? FORMATS.find(f => f.id === s.format) : null;
        return {
          id: s.id,
          title: s.title || `Couple sample ${s.id}`,
          type: s.type,
          formatLabel: formatObj?.label || null,
          formatDesc: formatObj?.desc || null,
          analysis: s.analysis,
        };
      });

      setAnalyzeMsg(forceFull
        ? `Synthesizing Comedy DNA from ${ready.length} samples...`
        : `Updating Comedy DNA with ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"}...`);

      const data = forceFull
        ? await dnaAction({ action: "synthesizeDNA", analyses }, 4000)
        : await dnaAction({ action: "updateDNA", existingDNA: dnaProfile, newAnalyses: analyses }, 4000);

      const coveredIds = forceFull
        ? ready.map(s => s.id)
        : Array.from(new Set([...includedSampleIds, ...newSamples.map(s => s.id)]));

      const saveRes = await fetch("/api/couple/dna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dna: data.dna,
          includedSampleIds: coveredIds,
          sampleCount: coveredIds.length,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saveData?.error || "Failed to save Comedy DNA.");

      onProfileUpdate(saveData.dna);
      setIncludedSampleIds(saveData.includedSampleIds || coveredIds);
      setDnaNeedsRebuild(false);
      setAnalyzeMsg(forceFull
        ? `Comedy DNA built from ${ready.length} samples.`
        : `Comedy DNA updated with ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setErr(e.message || "DNA update failed. Your samples and analyses are safe — try again.");
    } finally {
      setBuildingDNA(false);
    }
  };

  const clearAll = async () => {
    if (analyzing || buildingDNA) return;
    try {
      const res = await fetch("/api/couple/samples", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear samples.");
      await fetch("/api/couple/dna", { method: "DELETE" });
      setSamples([]);
      setIncludedSampleIds([]);
      setDnaNeedsRebuild(false);
      onProfileUpdate(null);
    } catch (e) { setErr(e.message || "Failed to clear Comedy DNA."); }
  };

  const handleDeleteClick = (id) => {
    if (confirmDeleteId === id) {
      deleteSample(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const dna = dnaProfile;
  const sampleCount = samples.length;
  const newSampleCount = samples.filter((s) => s.analysis && !includedSampleIds.includes(s.id)).length;
  const unanalyzedCount = samples.filter((s) => !s.analysis).length;
  const analyzedCount = samples.filter((s) => s.analysis).length;
  const warningLevel = sampleCount > 25 ? "high" : sampleCount > 20 ? "mid" : null;

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <span style={dnaLabel}>01 — SAMPLES · 02 — TRAINING · 03 — YOUR DNA</span>
      </div>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Comedy DNA Trainer</div>
        <div style={{ fontSize: "13px", color: C.mid, lineHeight: "1.6" }}>
          Feed the AI your comedy samples — scripts, ideas, dialogue, captions, descriptions — and it will learn this couple's recurring comedic instincts.
        </div>
      </div>

      {/* ---- DNA dashboard ---- */}
      <div style={{ ...dnaCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "18px" }}>
          <div>
            <div style={{ ...dnaLabel, marginBottom: "8px" }}>COMEDY DNA</div>
            <div style={{ fontSize: "13px", color: C.mid, lineHeight: "1.7" }}>
              {sampleCount} sample{sampleCount === 1 ? "" : "s"} added<br />
              <span style={{ color: includedSampleIds.length >= MAX_TRAINING_SAMPLES ? DNA_C.warning : C.mid, fontWeight: includedSampleIds.length >= MAX_TRAINING_SAMPLES ? 700 : 400 }}>
                {includedSampleIds.length} / {MAX_TRAINING_SAMPLES} sample{includedSampleIds.length === 1 ? "" : "s"} trained
                {includedSampleIds.length >= MAX_TRAINING_SAMPLES ? " — cap reached" : ""}
              </span>
            </div>
          </div>
          {dna && (
            <div>
              <div style={{ ...dnaLabel, marginBottom: "8px" }}>CONFIDENCE</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>{dna.training_confidence || "?"}<span style={{ fontSize: "13px", color: DNA_C.textFaint, fontWeight: 500 }}> / 10</span></div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: !dna ? DNA_C.textFaint : (newSampleCount > 0 || dnaNeedsRebuild ? DNA_C.warning : C.green), display: "inline-block" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: !dna ? DNA_C.textFaint : (newSampleCount > 0 || dnaNeedsRebuild ? DNA_C.warning : C.green) }}>
              {!dna ? "NO DNA YET" : (newSampleCount > 0 || dnaNeedsRebuild) ? `${newSampleCount} NEW, NOT MERGED` : "UP TO DATE"}
            </span>
          </div>
        </div>
      </div>

      {warningLevel && (
        <div style={{
          fontSize: "12px", color: DNA_C.warning, background: DNA_C.warningDim, border: "1px solid #3a2f10",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "18px", lineHeight: "1.5",
        }}>
          More samples aren't automatically better. You're at {sampleCount} — add scripts that reveal a different side of this couple's comedy, not more of the same.
        </div>
      )}

      {/* ---- 01 Samples: add ---- */}

      {avoidNotes?.length > 0 && (
        <div style={{ ...dnaCard, marginBottom: "18px", borderLeft: `3px solid ${DNA_C.danger}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700 }}>AVOID LIST</div>
            <span style={{ fontSize: "10px", color: DNA_C.textFaint }}>{avoidNotes.length}/15</span>
          </div>
          {avoidNotes.map((n) => (
            <div key={n.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, fontSize: "12px", color: C.mid, lineHeight: "1.6" }}>— {n.note}</div>
              <button onClick={() => deleteAvoidNote(n.id)} style={{ border: "none", background: "transparent", color: C.muted, fontSize: "17px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }} aria-label="Delete Avoid note">×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...dnaCard, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: addingSample ? "16px" : 0 }}>
          <span style={dnaLabel}>ADD COMEDY SAMPLE</span>
          <DnaSecondaryButton onClick={() => setAddingSample(!addingSample)} style={{ padding: "7px 14px", fontSize: "11px" }}>
            {addingSample ? "cancel" : "+ add"}
          </DnaSecondaryButton>
        </div>
        {addingSample && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: C.mid, marginBottom: "6px" }}>What should I call it?</div>
              <input
                value={sampleTitle}
                onChange={e => setSampleTitle(e.target.value)}
                placeholder="e.g. 'One of our best deadpan bits'"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.dark, fontSize: "16px", padding: "12px 16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.mid, marginBottom: "6px" }}>What makes this representative?</div>
              <input
                value={sampleNotes}
                onChange={e => setSampleNotes(e.target.value)}
                placeholder="Optional — e.g. 'Funny but experimental'"
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.dark, fontSize: "16px", padding: "12px 16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.mid, marginBottom: "6px" }}>Paste script, describe a video, or share an idea</div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={"Examples:\n• A full script you wrote or filmed\n• 'She asked where to eat. He said anywhere. They went to three places.'\n• A caption that got a lot of tags\n• An idea you thought was funny but wasn't sure why\n• Something that didn't work and why — negative examples are just as valuable"}
                rows={8}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.dark, fontSize: "16px", padding: "12px 16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", lineHeight: "1.6" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.mid, marginBottom: "6px" }}>Format (optional)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSampleFormat(null)}
                  style={{
                    padding: "7px 13px", borderRadius: "100px",
                    border: sampleFormat === null ? `1.5px solid ${C.pink}` : `1px solid ${C.border}`,
                    background: sampleFormat === null ? `${C.pink}18` : C.bg,
                    color: sampleFormat === null ? C.pink : C.mid,
                    fontSize: "11px", fontWeight: sampleFormat === null ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Unspecified
                </button>
                {FORMATS.map((f) => {
                  const selected = sampleFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSampleFormat(f.id)}
                      style={{
                        padding: "7px 13px", borderRadius: "100px",
                        border: selected ? `1.5px solid ${C.pink}` : `1px solid ${C.border}`,
                        background: selected ? `${C.pink}18` : C.bg,
                        color: selected ? C.pink : C.mid,
                        fontSize: "11px", fontWeight: selected ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {f.emoji} {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: DNA_C.textFaint, lineHeight: "1.5" }}>
              Use samples that represent how you actually want this couple's content to sound.
            </div>
            <DnaPrimaryButton onClick={addSample} disabled={!input.trim()}>
              Add Sample
            </DnaPrimaryButton>
          </div>
        )}
      </div>

      {/* ---- 02 Training ---- */}
      {sampleCount > 0 && (
        <div style={{ ...dnaCard, marginBottom: "18px" }}>
          <span style={{ ...dnaLabel, marginBottom: "14px" }}>TRAINING</span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <DnaPrimaryButton
              onClick={analyzeAllPending}
              disabled={analyzing || buildingDNA || unanalyzedCount === 0}
              style={{ flex: "1 1 auto", minWidth: "160px" }}
            >
              {analyzing ? analyzeMsg : unanalyzedCount === 0 ? "All Samples Analyzed" : `Analyze ${unanalyzedCount} New Sample${unanalyzedCount === 1 ? "" : "s"}`}
            </DnaPrimaryButton>
            <DnaSecondaryButton
              onClick={() => buildDna()}
              disabled={buildingDNA || analyzing || analyzedCount === 0}
              style={{ flex: "1 1 auto", minWidth: "160px" }}
            >
              {buildingDNA ? analyzeMsg || "Updating DNA..." : !dna ? "Build Comedy DNA" : `Update Comedy DNA (${newSampleCount} new)`}
            </DnaSecondaryButton>
          </div>

          {dna && (
            <DnaGhostButton
              onClick={() => buildDna(true)}
              disabled={buildingDNA || analyzing || analyzedCount === 0}
              style={{ marginTop: "12px", color: DNA_C.textFaint }}
            >
              full rebuild from all {analyzedCount} samples
            </DnaGhostButton>
          )}

          <DnaGhostButton onClick={clearAll} disabled={analyzing || buildingDNA} style={{ marginTop: "12px", color: DNA_C.textFaint }}>
            reset — clear all samples & Comedy DNA
          </DnaGhostButton>

          {analyzeMsg && !analyzing && !buildingDNA && (
            <div style={{
              marginTop: "12px", padding: "10px 12px", borderRadius: "6px",
              background: C.bg, border: `1px solid ${C.border}`, fontSize: "12px",
              color: analyzeMsg.includes("built") || analyzeMsg.includes("updated") || analyzeMsg.includes("Analyzed") ? C.green : C.mid,
              lineHeight: "1.5",
            }}>
              {analyzeMsg}
            </div>
          )}
        </div>
      )}

      {err && (
        <div style={{ color: DNA_C.danger, fontSize: "13px", marginBottom: "18px", padding: "12px 16px", background: DNA_C.dangerDim, border: "1px solid #3a1a1e", borderRadius: "8px" }}>
          {err}
        </div>
      )}

      {/* ---- Samples list ---- */}
      {sampleCount > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <span style={dnaLabel}>SAMPLES ({sampleCount})</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {samples.map((sample, i) => {
              const isIncluded = includedSampleIds.includes(sample.id);
              return (
                <div key={sample.id} style={dnaCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#ddd" }}>{sample.title || `Sample ${i + 1}`}</div>
                        <DnaSampleStatusBadge sample={sample} isIncluded={isIncluded} />
                        {sample.format && (
                          <span style={{ ...dnaChip, fontSize: "10px", padding: "3px 10px" }}>
                            {FORMATS.find((f) => f.id === sample.format)?.label || sample.format}
                          </span>
                        )}
                      </div>
                      {sample.notes && <div style={{ fontSize: "11px", color: DNA_C.textFaint, marginBottom: "6px", fontStyle: "italic" }}>{sample.notes}</div>}
                      {sample.analysis ? (
                        <>
                          <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.5", marginBottom: "6px" }}>{sample.analysis.summary}</div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {sample.analysis.primary_comedy_instinct && (
                              <span style={{ ...dnaChip, fontSize: "10px", padding: "3px 10px" }}>{sample.analysis.primary_comedy_instinct}</span>
                            )}
                            {sample.analysis.representative_strength != null && (
                              <span style={{ ...dnaChip, fontSize: "10px", padding: "3px 10px" }}>strength {sample.analysis.representative_strength}/10</span>
                            )}
                          </div>
                        </>
                      ) : (
                        sample.analysis_error && (
                          <div style={{ fontSize: "11px", color: DNA_C.danger, marginTop: "2px", lineHeight: "1.5" }}>
                            {sample.analysis_error}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <DnaGhostButton onClick={() => handleCopySample(sample)} style={{ color: copiedSampleId === sample.id ? C.green : DNA_C.textFaint }}>
                        {copiedSampleId === sample.id ? "copied ✓" : "copy"}
                      </DnaGhostButton>
                      {sample.analysis && (
                        <DnaGhostButton onClick={() => setExpandedSampleId(expandedSampleId === sample.id ? null : sample.id)}>
                          {expandedSampleId === sample.id ? "hide analysis" : "view analysis"}
                        </DnaGhostButton>
                      )}
                      {sample.analysis && (
                        <DnaGhostButton onClick={() => reanalyzeSample(sample)} disabled={analyzing || buildingDNA}>reanalyze</DnaGhostButton>
                      )}
                    </div>
                    <DnaGhostButton
                      danger
                      onClick={() => handleDeleteClick(sample.id)}
                      style={{ color: confirmDeleteId === sample.id ? DNA_C.danger : DNA_C.textFaint, fontWeight: confirmDeleteId === sample.id ? 700 : 500 }}
                    >
                      {confirmDeleteId === sample.id ? "confirm delete?" : "delete"}
                    </DnaGhostButton>
                  </div>

                  {expandedSampleId === sample.id && sample.analysis && (
                    <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.border}`, fontSize: "12px", color: C.mid, lineHeight: "1.7" }}>
                      <div><strong style={{ color: "#888" }}>What makes it funny:</strong> {sample.analysis.what_makes_it_funny}</div>
                      <div style={{ marginTop: "8px" }}><strong style={{ color: "#888" }}>Character logic:</strong> {sample.analysis.character_logic}</div>
                      <div style={{ marginTop: "8px" }}><strong style={{ color: "#888" }}>Escalation:</strong> {sample.analysis.escalation_pattern}</div>
                      <div style={{ marginTop: "8px" }}><strong style={{ color: "#888" }}>Ending:</strong> {sample.analysis.ending_pattern}</div>
                      <div style={{ marginTop: "8px" }}><strong style={{ color: "#888" }}>Best decision:</strong> {sample.analysis.best_comedic_decision}</div>
                      {sample.analysis.recurring_behavior_patterns?.length > 0 && (
                        <div style={{ marginTop: "8px" }}><strong style={{ color: "#888" }}>Recurring patterns:</strong> {sample.analysis.recurring_behavior_patterns.join(", ")}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- 03 Your DNA ---- */}
      {dna && (
        <div>
          <span style={dnaLabel}>YOUR COMEDY DNA</span>

          <div style={{ ...dnaCard, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "10px" }}>CORE COMEDIC BRAIN</div>
            <p style={{ fontSize: "14px", color: "#ddd", lineHeight: "1.7", margin: "0 0 10px" }}>{dna.core_identity?.core_comedic_brain}</p>
            {dna.core_identity?.one_sentence_summary && (
              <p style={{ fontSize: "13px", color: C.mid, fontStyle: "italic", margin: 0 }}>{dna.core_identity.one_sentence_summary}</p>
            )}
            {dna.core_identity?.relationship_comedic_dynamic && (
              <p style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", margin: "10px 0 0" }}><strong style={{ color: "#999" }}>Relationship dynamic:</strong> {dna.core_identity.relationship_comedic_dynamic}</p>
            )}
            {dna.core_identity?.emotional_energy && (
              <p style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", margin: "8px 0 0" }}><strong style={{ color: "#999" }}>Emotional energy:</strong> {dna.core_identity.emotional_energy}</p>
            )}
          </div>

          {dna.strongest_comedic_instincts?.length > 0 && (
            <div style={{ ...dnaCard, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "14px" }}>STRONGEST INSTINCTS</div>
              {dna.strongest_comedic_instincts.map((inst, i) => (
                <div key={i} style={{ marginBottom: i < dna.strongest_comedic_instincts.length - 1 ? "16px" : 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#ddd", marginBottom: "4px" }}>{inst.instinct}</div>
                  <DnaStatBar label="" value={inst.strength} />
                  <div style={{ fontSize: "12px", color: C.mid, lineHeight: "1.5", marginTop: "-4px" }}>{inst.description}</div>
                </div>
              ))}
            </div>
          )}

          {dna.comedy_modes?.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <span style={{ ...dnaLabel, marginBottom: "8px" }}>COMEDY MODES</span>
              {dna.comedy_modes.map((mode, i) => (
                <div key={i} style={{ ...dnaCard, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#eee" }}>{mode.name}</span>
                    <span style={{ ...dnaChip, fontSize: "10px" }}>{mode.strength}/10</span>
                  </div>
                  <p style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", margin: "0 0 10px" }}>{mode.description}</p>
                  {mode.when_to_use?.length > 0 && (
                    <div style={{ fontSize: "11px", color: C.mid, marginBottom: "6px" }}><strong style={{ color: "#999" }}>When it works:</strong> {mode.when_to_use.join(", ")}</div>
                  )}
                  {mode.delivery_style && (
                    <div style={{ fontSize: "11px", color: C.mid, marginBottom: "6px" }}><strong style={{ color: "#999" }}>Delivery:</strong> {mode.delivery_style}</div>
                  )}
                  {mode.escalation_style && (
                    <div style={{ fontSize: "11px", color: C.mid, marginBottom: "6px" }}><strong style={{ color: "#999" }}>Escalation:</strong> {mode.escalation_style}</div>
                  )}
                  {mode.best_formats?.length > 0 && (
                    <div style={{ fontSize: "11px", color: C.mid }}><strong style={{ color: "#999" }}>Best formats:</strong> {mode.best_formats.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {dna.preferred_comedy_sources && (
            <div style={{ ...dnaCard, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "16px" }}>PREFERRED COMEDY SOURCES</div>
              {Object.entries(dna.preferred_comedy_sources).map(([key, val]) => (
                <DnaStatBar key={key} label={key} value={val} />
              ))}
            </div>
          )}

          {dna.delivery_dna && (
            <div style={{ ...dnaCard, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "12px" }}>DELIVERY DNA</div>
              {Object.entries(dna.delivery_dna).map(([key, val]) => (
                val ? <div key={key} style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", marginBottom: "6px" }}><strong style={{ color: "#999", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}:</strong> {val}</div> : null
              ))}
            </div>
          )}

          {dna.things_to_avoid?.length > 0 && (
            <div style={{ ...dnaCard, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "12px" }}>THINGS TO AVOID</div>
              {dna.things_to_avoid.map((item, i) => (
                <div key={i} style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", marginBottom: "6px" }}>— {item}</div>
              ))}
            </div>
          )}

          {dna.contradictions_or_contextual_modes?.length > 0 && (
            <div style={{ ...dnaCard, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "12px" }}>CONTEXTUAL DIFFERENCES</div>
              {dna.contradictions_or_contextual_modes.map((item, i) => (
                <div key={i} style={{ fontSize: "12px", color: C.mid, lineHeight: "1.6", marginBottom: "6px" }}>{item}</div>
              ))}
            </div>
          )}

          {dna.training_summary && (
            <div style={{ ...dnaCard, borderLeft: `3px solid ${C.muted}` }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.muted, fontWeight: 700, marginBottom: "10px" }}>TRAINING SUMMARY</div>
              <p style={{ fontSize: "13px", color: C.mid, lineHeight: "1.7", margin: 0 }}>{dna.training_summary}</p>
            </div>
          )}
        </div>
      )}

      {sampleCount === 0 && !dna && (
        <div style={{ ...dnaCard, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧬</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#ddd", marginBottom: "8px" }}>No samples yet</div>
          <div style={{ fontSize: "13px", color: C.mid, lineHeight: "1.65" }}>Add 3+ samples above to start building this couple's Comedy DNA.</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────

export default function CoupleContentGeneratorPage() {
  const [situation, setSituation] = useState("");
  const [vibe, setVibe] = useState(null);
  const [vibeReason, setVibeReason] = useState(null);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [toneNoteSuggestion, setToneNoteSuggestion] = useState(null);
  const [toneNoteLoading, setToneNoteLoading] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideas, setIdeas] = useState(null);
  const [format, setFormat] = useState("acted-skit");
  const [advOpen, setAdvOpen] = useState(false);
  const [location, setLocation] = useState("ai");
  const [personalities, setPersonalities] = useState([]);
  const [dynamic, setDynamic] = useState("ai");
  const [intensity, setIntensity] = useState(null);
  const [flavor, setFlavor] = useState(null);
  const [blueprint, setBlueprint] = useState("ai");
  const [creativeDna, setCreativeDna] = useState("");
  const [avoidNotes, setAvoidNotes] = useState([]);
  const [avoidSubmitting, setAvoidSubmitting] = useState(false);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dnaRes, savedRes, toneRes, avoidRes] = await Promise.all([
          fetch("/api/couple/dna"),
          fetch("/api/couple/saved"),
          fetch("/api/couple/tone"),
          fetch("/api/couple/avoid-notes"),
        ]);
        const [dna, saved, tone, avoid] = await Promise.all([dnaRes.json(), savedRes.json(), toneRes.json(), avoidRes.json()]);
        if (!dnaRes.ok) throw new Error(dna?.error || "Failed to load Comedy DNA.");
        if (!savedRes.ok) throw new Error(saved?.error || "Failed to load saved ideas.");
        if (!toneRes.ok) throw new Error(tone?.error || "Failed to load tone notes.");
        if (!avoidRes.ok) throw new Error(avoid?.error || "Failed to load Avoid notes.");
        if (cancelled) return;
        setDnaProfile(dna?.dna || null);
        setSavedIdeas(Array.isArray(saved?.ideas) ? saved.ideas : []);
        setCreativeDna(tone?.notes || "");
        setAvoidNotes(Array.isArray(avoid?.notes) ? avoid.notes : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load Couple data.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveCreativeDna = async (v) => {
    try {
      const res = await fetch("/api/couple/tone", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: v }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save tone notes.");
    } catch (e) { setErr(e.message || "Failed to save tone notes."); }
  };

  const [loading, setLoading] = useState(false);
  // Mirrored up from <ModelSelect> (lib/ModelSelect.js), which owns fetching
  // the live OpenRouter catalog and persisting the choice — this is just the
  // current value so generate() can thread it into script/refine calls.
  const [openrouterModel, setOpenrouterModel] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [lastUsage, setLastUsage] = useState(null);
  const [err, setErr] = useState(null);
  const [refining, setRefining] = useState(false);

  const [savedIdeas, setSavedIdeas] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedThisResult, setSavedThisResult] = useState(false);

  const [view, setView] = useState("generator");
  const [dnaProfile, setDnaProfile] = useState(null);

  const loadingRef = useRef(null);
  const canGenerate = situation.trim().length > 0 || vibe;

  useEffect(() => {
    if (loading) {
      setLoadingMsg(pick(LOADING_MSGS));
      loadingRef.current = setInterval(() => setLoadingMsg(pick(LOADING_MSGS)), 2000);
    } else clearInterval(loadingRef.current);
    return () => clearInterval(loadingRef.current);
  }, [loading]);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setErr(null);
    setSavedThisResult(false);
    try {
      const formatObj = FORMATS.find(f => f.id === format);
      const locationObj = LOCATIONS.find(x => x.id === location);
      const dynamicObj = DYNAMICS.find(x => x.id === dynamic);
      const blueprintObj = BLUEPRINTS.find(x => x.id === blueprint);
      const personalityLabels = personalities.map(id => PERSONALITIES.find(p => p.id === id)?.label).filter(Boolean);
      const ai = await callAPI("script", {
        formatLabel: formatObj?.label,
        formatDesc: formatObj?.desc,
        situation,
        vibe: VIBES.find(v => v.id === vibe)?.label || null,
        location: locationObj?.label || location,
        personalityContrast: personalityLabels.join(" vs "),
        dynamic: dynamicObj?.label || dynamic,
        intensity,
        flavor,
        blueprint: blueprintObj?.label || blueprint,
        creativeDna,
        dna: dnaProfile,
        avoidNotes,
        openrouterModel,
      });
      const parsed = parseJSON(ai.text);
      setLastUsage(ai.usage);
      if (!parsed) throw new Error("Couldn't parse the response. Please try again.");
      setResult(parsed);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const refine = async (action, customInstruction = null) => {
    if (!result || refining) return;
    setRefining(true);
    const guides = {
      funnier: "Make it funnier. Keep the core premise. Find a more unexpected comic angle, sharper timing, or a more specific absurd detail that makes it funnier.",
      realistic: "Make it more realistic. Remove anything that wouldn't happen in an actual relationship. Make the conflict feel more ordinary. More believable behavior.",
      chaotic: "Make it more chaotic. Bigger escalation. More committed to the stupid position. Each beat must feel inevitable from the last. Go further.",
      relatable: "Make it more relatable. Remove sitcom behavior. Find the version every couple has actually experienced. More specific, less performed.",
      shorter: "Make it significantly shorter. Cut every beat that doesn't earn its place. Under 20 seconds. Every word must justify itself.",
      visual: "Make it more visual. Reduce dialogue. Find the physical comedy beats. The joke should land through action and reaction, not words.",
      hook: "Rewrite the hook only. The first 2 seconds must stop the scroll. Be more specific and immediately arresting. Keep everything else.",
      ending: "Strengthen the ending only. Keep the setup. The final beat needs a stronger reversal, callback, or visual punchline. Don't let it just stop.",
      dialogue: "Make the dialogue more natural. Remove any line that sounds written. Incomplete sentences. Talking over each other. No explaining of feelings. Short clipped responses.",
    };
    const instruction = customInstruction || guides[action];
    try {
      const ai = await callAPI("refine", {
        originalResult: JSON.stringify(result, null, 2),
        feedback: instruction,
        dna: dnaProfile,
        openrouterModel,
      });
      const parsed = parseJSON(ai.text);
      setLastUsage(ai.usage);
      if (parsed) { setResult(parsed); setSavedThisResult(false); }
    } catch {}
    setRefining(false);
  };

  const suggestVibe = async () => {
    if (!situation.trim() || vibeLoading) return;
    setVibeLoading(true);
    setVibeReason(null);
    try {
      const vibeOptions = VIBES.filter(v => v.id !== "surprise-me")
        .map(v => `- ${v.id}: ${v.label} — ${v.desc}`).join("\n");
      const ai = await callAPI("vibe", {
        situation: situation.trim(),
        vibes: vibeOptions,
      });
      const parsed = ai.data;
      const match = parsed?.vibeId && VIBES.find(v => v.id === parsed.vibeId);
      if (match) {
        setVibe(match.id);
        setVibeReason(parsed.reason || null);
      }
    } catch {
      // fail silently — same as Solo's tone suggestion
    } finally {
      setVibeLoading(false);
    }
  };

  // AI suggestion for the Audience & Tone note (creativeDna) — separate from
  // suggestVibe above. Vibe picks the humor mechanism for THIS generation;
  // this suggests a persistent tone-of-voice note for the audience, mirroring
  // Solo's Suggest Tone but scoped to the sticky Audience & Tone field instead
  // of a per-generation value. Purely additive — the free-text field still
  // works exactly as before if this is never used.
  const suggestTone = async () => {
    if (!situation.trim() || toneNoteLoading) return;
    setToneNoteLoading(true);
    setToneNoteSuggestion(null);
    try {
      const formatObj = FORMATS.find(f => f.id === format);
      const ai = await callAPI("tone", {
        situation: situation.trim(),
        formatLabel: formatObj?.label,
        formatDesc: formatObj?.desc,
        creativeDna,
      });
      const parsed = ai.data;
      if (parsed?.tone) setToneNoteSuggestion({ tone: parsed.tone, reason: parsed.reason || null });
    } catch {
      // fail silently — same pattern as suggestVibe
    } finally {
      setToneNoteLoading(false);
    }
  };

  const useToneSuggestion = () => {
    if (!toneNoteSuggestion) return;
    const merged = creativeDna.trim() ? `${creativeDna.trim()} ${toneNoteSuggestion.tone}` : toneNoteSuggestion.tone;
    setCreativeDna(merged);
    saveCreativeDna(merged);
    setToneNoteSuggestion(null);
  };

  // "Get Ideas" — browsable list of premise suggestions, mirrors Solo's
  // generateIdeas()/selectIdea(). Sends the structured "ideas" action to
  // /api/couple, which owns prompt construction via buildCoupleIdeaPrompt.
  const generateIdeas = async () => {
    setIdeasLoading(true);
    setShowIdeas(true);
    setIdeas(null);
    try {
      const formatObj = FORMATS.find(f => f.id === format);
      const ai = await callAPI("ideas", {
        formatLabel: formatObj?.label,
        formatDesc: formatObj?.desc,
        dna: dnaProfile,
        avoidNotes,
      });
      setIdeas(Array.isArray(ai.data?.ideas) ? ai.data.ideas : []);
    } catch {
      setIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  };

  const selectIdea = (idea) => {
    setSituation(idea.premise || "");
    setShowIdeas(false);
    setIdeas(null);
    const matchedVibe = VIBES.find(v => v.id !== "surprise-me" && idea.vibe && idea.vibe.toLowerCase().includes(v.label.toLowerCase()));
    if (matchedVibe) setVibe(matchedVibe.id);
    setVibeReason(idea.why || idea.vibe || null);
  };

  const surprise = () => {
    setSituation("");
    setVibe(pick(VIBES.filter(v => v.id !== "surprise-me")).id);
    setVibeReason(null);
    setFormat(pick(FORMATS).id);
    setLocation(pick(LOCATIONS.filter(l => l.id !== "ai")).id);
    setDynamic(pick(DYNAMICS.filter(d => d.id !== "ai")).id);
    setIntensity(pick(INTENSITIES).id);
    setFlavor(pick(FLAVORS).id);
    setBlueprint(pick(BLUEPRINTS.filter(b => b.id !== "ai")).id);
    setPersonalities([]);
  };

  const submitAvoidNote = async (script, reason = "") => {
    if (!script || avoidSubmitting) return;
    setAvoidSubmitting(true);
    try {
      const distill = (await callAPI("distillAvoidNote", { script, reason })).data;
      const saveRes = await fetch("/api/couple/avoid-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: distill.note, sourceScript: script }),
      });
      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) throw new Error(saved?.error || "Failed to save Avoid note.");
      setAvoidNotes((prev) => [saved.note, ...prev.filter((n) => n.id !== saved.note.id)].slice(0, 10));
    } catch (e) { setErr(e.message || "Failed to learn from this result."); }
    finally { setAvoidSubmitting(false); }
  };

  const deleteAvoidNote = async (id) => {
    try {
      const res = await fetch(`/api/couple/avoid-notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete Avoid note.");
      setAvoidNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) { setErr(e.message || "Failed to delete Avoid note."); }
  };

  const saveIdea = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/couple/saved", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, situation, vibe, format }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save idea.");
      setSavedIdeas(prev => [data.idea, ...prev.filter(x => x.id !== data.idea.id)].slice(0, 50));
      setSavedThisResult(true);
    } catch (e) { setErr(e.message || "Failed to save idea."); }
  };

  const deleteIdea = async (id) => {
    try {
      const res = await fetch(`/api/couple/saved/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete idea.");
      setSavedIdeas(prev => prev.filter(x => x.id !== id));
    } catch (e) { setErr(e.message || "Failed to delete idea."); }
  };

  const openIdea = (idea) => {
    setResult(idea.result);
    setSituation(idea.situation || "");
    setVibe(idea.vibe || null);
    setFormat(idea.format || "acted-skit");
    setSavedOpen(false);
    setSavedThisResult(true);
  };

  const togglePersonality = (id) => {
    setPersonalities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const resetAll = () => {
    // Note: creativeDna (Audience & Tone) is intentionally NOT cleared here —
    // it's a standing tone anchor for this audience, not a per-generation input.
    setSituation(""); setVibe(null); setVibeReason(null); setFormat("acted-skit");
    setLocation("ai"); setPersonalities([]); setDynamic("ai");
    setIntensity(null); setFlavor(null); setBlueprint("ai");
    setResult(null); setErr(null); setSavedThisResult(false);
  };

  return (
    <>
      <style>{`
        /* body/background/base font already come from the shared root layout
           (app/layout.js) — no local override here, so this page renders in
           SKIT GEN's dark theme instead of forcing its own light mode. */
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pulse { animation: pulse 1.8s ease-in-out infinite; }
        @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .fadein { animation: fadein 0.28s ease; }
        @media(min-width:760px){
          .main-grid { display: grid; grid-template-columns: 370px 1fr; gap: 18px; align-items: start; }
          .left-sticky { position: sticky; top: 62px; max-height: calc(100vh - 80px); overflow-y: auto; }
        }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>


      {savedOpen && <SavedPanel ideas={savedIdeas} onOpen={openIdea} onDelete={deleteIdea} onClose={() => setSavedOpen(false)} />}

      {/* Header */}
      <div className="header-shell" style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "24px 28px 0", position: "sticky", top: 0, zIndex: 100 }}>
        {/* Global Solo/Couple mode switcher — the page-specific tabs
            (Generator / Comedy DNA / Saved) stay in their own row below,
            unaffected. */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          <ModeSwitcher active="couple" />
        </div>
        <div style={{ paddingBottom: "20px" }}>
          <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", color: "#fff" }}>💑 Couple Content Generator</div>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1.5px", marginTop: "4px", textTransform: "uppercase" }}>TikTok · Make them tag each other</div>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            ["generator", "GENERATOR"],
            ["dna", `COMEDY DNA${dnaProfile ? " ●" : ""}`],
            ["saved", `SAVED${savedIdeas.length > 0 ? ` (${savedIdeas.length})` : ""}`],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => id === "saved" ? setSavedOpen(true) : setView(id)}
              style={{
                padding: "12px 18px", minHeight: "44px", background: "transparent", border: "none",
                borderBottom: (id === "saved" ? savedOpen : view === id) ? `2px solid ${C.pink}` : "2px solid transparent",
                color: (id === "saved" ? savedOpen : view === id) ? C.dark : C.muted, fontSize: "12px", fontWeight: "700",
                letterSpacing: "1.5px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* DNA Trainer View */}
      {view === "dna" && (
        <DnaTrainer dnaProfile={dnaProfile} onProfileUpdate={(p) => setDnaProfile(p)} avoidNotes={avoidNotes} deleteAvoidNote={deleteAvoidNote} />
      )}

      {/* Generator View */}
      {view === "generator" && <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "16px" }}>
        {avoidNotes.length > 0 && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "9px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.2px", color: C.muted, fontWeight: 700 }}>AVOID LIST</div>
              <span style={{ fontSize: "10px", color: C.muted }}>{avoidNotes.length}/15</span>
            </div>
            {avoidNotes.map((n) => (
              <div key={n.id} style={{ display: "flex", gap: "9px", alignItems: "flex-start", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, fontSize: "12px", color: C.mid, lineHeight: 1.55 }}>— {n.note}</div>
                <button onClick={() => deleteAvoidNote(n.id)} style={{ border: "none", background: "transparent", color: C.muted, fontSize: "16px", lineHeight: 1, cursor: "pointer", padding: "0 2px" }} aria-label="Delete Avoid note">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="main-grid">

          {/* ── LEFT INPUTS ── */}
          <div className="left-sticky">

            {/* Situation */}
            <div style={{ marginBottom: "24px" }}>
              <span style={sLabel}>What's happening?</span>
              <textarea
                value={situation}
                onChange={e => setSituation(e.target.value)}
                placeholder={"Describe the situation, argument, habit, or moment...\n\nExamples:\n• She says she's ready but is still doing her makeup.\n• We're arguing about where to eat.\n• He said he doesn't want anything from the store."}
                rows={5}
                style={{
                  width: "100%", border: `1.5px solid ${C.border}`, borderRadius: "8px",
                  padding: "11px 13px", fontSize: "14px", lineHeight: 1.65, color: C.dark,
                  resize: "vertical", outline: "none", background: C.bg,
                }}
                onFocus={e => e.target.style.borderColor = C.pink}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <button
                  onClick={generateIdeas}
                  disabled={ideasLoading}
                  style={{ border: "none", background: "transparent", color: C.muted, fontSize: "12px", fontWeight: 600, cursor: ideasLoading ? "not-allowed" : "pointer", fontFamily: "inherit", padding: "2px 0", opacity: ideasLoading ? 0.6 : 1 }}
                >
                  {ideasLoading ? "thinking..." : "✦ Need inspiration? Suggest an idea"}
                </button>
              </div>
            </div>

            {showIdeas && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 15px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "1.2px", color: C.muted, fontWeight: 700 }}>
                    IDEAS — <span style={{ color: C.muted, fontWeight: 400 }}>{FORMATS.find(f => f.id === format)?.label}</span>
                    {dnaProfile && <span style={{ color: C.pink, marginLeft: "8px" }}>· DNA-informed</span>}
                  </div>
                  <button onClick={() => setShowIdeas(false)} style={{ background: "transparent", border: "none", color: C.muted, fontSize: "17px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                {ideasLoading && <div style={{ fontSize: "12px", color: C.muted, textAlign: "center", padding: "14px 0" }}>generating ideas...</div>}
                {ideas?.map((idea, i) => (
                  <div
                    key={i}
                    onClick={() => selectIdea(idea)}
                    style={{ padding: "12px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, marginBottom: "7px", cursor: "pointer", background: C.bg }}
                  >
                    <div style={{ fontSize: "13px", color: C.dark, lineHeight: 1.5, marginBottom: "4px" }}>{idea.premise}</div>
                    <div style={{ fontSize: "11px", color: C.muted, lineHeight: 1.4 }}>{idea.vibe}{idea.vibe && idea.why ? " — " : ""}{idea.why}</div>
                  </div>
                ))}
                {ideas?.length === 0 && !ideasLoading && (
                  <div style={{ fontSize: "12px", color: C.muted, textAlign: "center", padding: "10px 0" }}>couldn't generate ideas. try again.</div>
                )}
                {ideas?.length > 0 && (
                  <button onClick={generateIdeas} style={{ border: "none", background: "transparent", color: C.muted, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: "4px" }}>
                    refresh ideas
                  </button>
                )}
              </div>
            )}

            {/* Vibe */}
            <div style={{ marginBottom: "24px" }}>
              <span style={sLabel}>Humor / Vibe <span style={{ fontWeight: 400, fontSize: "9px" }}>— optional</span></span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {VIBES.map(v => (
                  <Chip key={v.id} label={v.label} emoji={v.emoji} selected={vibe === v.id} onClick={() => { setVibe(vibe === v.id ? null : v.id); setVibeReason(null); }} color={v.id === "surprise-me" ? C.purple : C.pink} />
                ))}
              </div>
              {situation.trim() && !vibeReason && !vibeLoading && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "12px", color: C.muted }}>Left to the AI's judgment — or pick a vibe yourself.</div>
                  <button
                    onClick={suggestVibe}
                    style={{ border: "none", background: "transparent", color: C.muted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", padding: "4px 0" }}
                  >
                    ✦ suggest vibe
                  </button>
                </div>
              )}
              {vibeLoading && <div style={{ fontSize: "12px", color: C.muted }}>reading the situation...</div>}
              {vibeReason && !vibeLoading && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", background: `${C.pink}08`, borderRadius: "8px", padding: "9px 11px" }}>
                  <div style={{ fontSize: "12px", color: C.mid, lineHeight: 1.5 }}>{vibeReason}</div>
                  <button onClick={() => setVibeReason(null)} style={{ border: "none", background: "transparent", color: C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    clear
                  </button>
                </div>
              )}
            </div>

            {/* Format */}
            <div style={{ marginBottom: "24px" }}>
              <span style={sLabel}>Format</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {FORMATS.map(f => {
                  const selected = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`format-card ${selected ? "is-selected" : ""}`}
                      style={{
                        padding: "14px 8px", borderRadius: "8px",
                        border: selected ? `1px solid ${C.pink}` : `1px solid ${C.border}`,
                        background: selected ? `${C.pink}10` : C.bg,
                        color: selected ? C.dark : C.muted,
                        cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                        lineHeight: "1.4", minHeight: "76px",
                      }}
                    >
                      <div style={{ fontSize: "18px", marginBottom: "5px" }}>{f.emoji}</div>
                      <div style={{ fontWeight: "700", fontSize: "11px", color: selected ? C.pink : C.dark }}>{f.label}</div>
                      <div style={{ fontSize: "10px", opacity: 0.65, marginTop: "3px", color: C.muted }}>{f.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced */}
            <div style={{ marginBottom: "24px" }}>
              <button onClick={() => setAdvOpen(!advOpen)} style={{
                width: "100%", padding: 0, border: "none", background: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
              }}>
                <span style={sLabel}>⚙️ Advanced Creative Controls</span>
                <span style={{ color: C.muted, fontSize: "18px", transform: advOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>⌄</span>
              </button>

              {advOpen && (
                <div style={{ marginTop: "5px" }}>

                  <div style={{ marginTop: "13px" }}>
                    <span style={sLabel}>Location</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {LOCATIONS.map(l => <Chip key={l.id} label={l.label} emoji={l.emoji} selected={location === l.id} onClick={() => setLocation(l.id)} color={C.purple} />)}
                    </div>
                  </div>

                  <div style={{ marginTop: "13px" }}>
                    <span style={sLabel}>Personality Contrast <span style={{ fontWeight: 400 }}>(pick up to 2)</span></span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {PERSONALITIES.map(p => <Chip key={p.id} label={p.label} selected={personalities.includes(p.id)} onClick={() => togglePersonality(p.id)} color={C.purple} />)}
                    </div>
                  </div>

                  <div style={{ marginTop: "13px" }}>
                    <span style={sLabel}>Relationship Dynamic</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {DYNAMICS.map(d => <Chip key={d.id} label={d.label} selected={dynamic === d.id} onClick={() => setDynamic(d.id)} color={C.purple} />)}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "13px" }}>
                    <div>
                      <span style={sLabel}>Intensity</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {INTENSITIES.map(i => <Chip key={i.id} label={i.label} selected={intensity === i.id} onClick={() => setIntensity(intensity === i.id ? null : i.id)} color={C.purple} />)}
                      </div>
                    </div>
                    <div>
                      <span style={sLabel}>Flavor / Tone</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {FLAVORS.map(f => <Chip key={f.id} label={f.label} selected={flavor === f.id} onClick={() => setFlavor(flavor === f.id ? null : f.id)} color={C.purple} />)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "13px" }}>
                    <span style={sLabel}>Narrative Blueprint</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {BLUEPRINTS.map(b => <Chip key={b.id} label={b.label} selected={blueprint === b.id} onClick={() => setBlueprint(b.id)} color={C.purple} />)}
                    </div>
                  </div>

                  <div style={{ marginTop: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={sLabel}>Audience &amp; Tone <span style={{ fontWeight: 400 }}>(sticks across sessions — separate from Solo)</span></span>
                      {situation.trim() && !toneNoteSuggestion && !toneNoteLoading && (
                        <button
                          onClick={suggestTone}
                          style={{ border: "none", background: "transparent", color: C.muted, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", padding: "2px 0 8px" }}
                        >
                          ✦ suggest tone
                        </button>
                      )}
                    </div>
                    {toneNoteLoading && <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>reading the situation...</div>}
                    {toneNoteSuggestion && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", background: `${C.pink}08`, borderRadius: "8px", padding: "9px 11px", marginBottom: "8px" }}>
                        <div>
                          <div style={{ fontSize: "12px", color: C.dark, fontWeight: 600, marginBottom: toneNoteSuggestion.reason ? "3px" : 0 }}>{toneNoteSuggestion.tone}</div>
                          {toneNoteSuggestion.reason && <div style={{ fontSize: "11px", color: C.muted, lineHeight: 1.5 }}>{toneNoteSuggestion.reason}</div>}
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                          <button onClick={useToneSuggestion} style={{ border: "none", background: "transparent", color: C.pink, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>use this</button>
                          <button onClick={() => setToneNoteSuggestion(null)} style={{ border: "none", background: "transparent", color: C.muted, fontSize: "11px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>clear</button>
                        </div>
                      </div>
                    )}
                    <textarea
                      value={creativeDna}
                      onChange={e => setCreativeDna(e.target.value)}
                      onBlur={e => saveCreativeDna(e.target.value)}
                      placeholder={"How should THIS audience be talked to? e.g. \"Very dry. Minimal dialogue. Feels like real couples, not actors.\""}
                      rows={2}
                      style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: C.dark, resize: "none", outline: "none", background: C.bg }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <ModelSelect app="couple" onChange={setOpenrouterModel} />
            </div>

            {/* Action buttons */}
            <button
              onClick={canGenerate && !loading ? generate : undefined}
              disabled={!canGenerate || loading}
              style={{
                width: "100%", padding: "15px", borderRadius: "8px", border: "none",
                fontSize: "15px", fontWeight: 800, letterSpacing: "-0.01em",
                cursor: canGenerate && !loading ? "pointer" : "not-allowed",
                background: canGenerate && !loading ? C.pink : C.border,
                color: canGenerate && !loading ? C.ink : C.muted,
                boxShadow: "none",
                transition: "all 0.2s", marginBottom: "8px",
              }}
            >
              {loading ? "✨ Generating..." : "✨ Generate"}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button onClick={surprise} style={{ padding: "11px", borderRadius: "8px", border: `1.5px solid ${C.purple}`, background: `${C.purple}10`, color: C.purple, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                🎲 Surprise Me
              </button>
              <button onClick={resetAll} style={{ padding: "11px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: C.white, color: C.muted, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Reset
              </button>
            </div>

            {!canGenerate && (
              <div style={{ textAlign: "center", fontSize: "12px", color: C.muted, marginTop: "8px" }}>
                Type a situation or pick a vibe to generate
              </div>
            )}
          </div>

          {/* ── RIGHT OUTPUT ── */}
          <div>
            {loading && (
              <div className="fadein" style={{ background: C.white, borderRadius: "10px", padding: "56px 24px", textAlign: "center", border: "1px solid var(--border-soft)" }}>
                <div className="pulse" style={{ fontSize: "36px", marginBottom: "16px" }}>✨</div>
                <div style={{ fontSize: "14px", color: C.muted, fontStyle: "italic" }}>{loadingMsg}</div>
              </div>
            )}

            {err && !loading && (
              <div className="fadein" style={{ background: "var(--danger-dim)", borderRadius: "10px", padding: "20px", border: "1px solid var(--danger)", marginBottom: "10px" }}>
                <div style={{ fontWeight: 700, color: "var(--danger)", marginBottom: "6px" }}>Something went wrong</div>
                <div style={{ fontSize: "13px", color: C.mid, marginBottom: "14px" }}>{err}</div>
                <button onClick={generate} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "var(--danger)", color: "#1a0808", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Try Again</button>
              </div>
            )}

            {result && !loading && (
              <div className="fadein">
                <ResultCard result={result} onRefine={refine} refining={refining} onSave={saveIdea} saved={savedThisResult} onAvoid={submitAvoidNote} avoidSubmitting={avoidSubmitting} usage={lastUsage} />
                <button onClick={generate} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: C.white, color: C.dark, fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "4px" }}>
                  🔄 Generate Again with Same Settings
                </button>
              </div>
            )}

            {!result && !loading && !err && (
              <div style={{ background: C.white, borderRadius: "10px", padding: "60px 24px", textAlign: "center", border: "1px solid var(--border-soft)" }}>
                <div style={{ fontSize: "40px", marginBottom: "14px" }}>💑</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: C.dark, marginBottom: "8px" }}>Your concept will appear here</div>
                <div style={{ fontSize: "13px", color: C.muted, lineHeight: 1.7 }}>
                  Type a situation — or just hit Surprise Me.<br />
                  The rest is optional.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}
    </>
  );
}
