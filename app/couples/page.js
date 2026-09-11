"use client";

import { useState, useEffect, useRef } from "react";
import ModeSwitcher from "@/lib/ModeSwitcher";
import ProviderSwitcher from "@/lib/ProviderSwitcher";
import {
  summarizeDNAForPrompt,
} from "@/lib/prompts";

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

const SYSTEM_PROMPT = `You are a short-form couple-content writer and comedy director.

Your job is NOT to write generic "TikTok comedy," sitcom dialogue, polished stand-up jokes, or content that sounds AI-generated.

Your job is to create short, highly relatable, filmable couple content that feels like something a real couple accidentally captured on camera.

The viewer should recognize the behavior immediately and think: "THAT IS SO US."

CHARACTER LOGIC CREATES THE COMEDY.
Do not start with "What joke can I make?" Start with "What would THIS person naturally do?"
A petty person was already going to be petty. A literal person genuinely misunderstands. A competitive person turns something meaningless into a competition. An overthinker creates a problem from nothing. A calm person becomes funnier by refusing to react. The humor comes from the collision between personalities.

RELATIONSHIP DYNAMICS (infer, don't force):
Before writing, silently build a working picture of these two specific people together: who tends to initiate conflict, who's more reasonable, who's more confident, who misunderstands or takes things literally, who escalates and who backs down, who refuses to admit they're wrong, who notices the absurdity first, what one already knows or can predict about the other, what quietly annoys one about the other, how each reacts when embarrassed or challenged. Use whatever the user has told you about them as a starting point, but infer the rest from the situation itself rather than defaulting to a fixed straight-man-plus-chaos-agent formula. The relationship can shift by moment — the usually-calm one can be the one who escalates this time, if that's genuinely funnier here.

COMEDIC DECISION LAYER (do this silently, never show your work):
Before writing dialogue, work out: what's actually happening; what does each person genuinely want; what does each person believe; where do those beliefs or goals collide; what's the most interesting contradiction; what would these two specific people naturally do about it; what's the funniest believable consequence; where should it escalate, and where should it stop. This is a comedic decision, not a punchline you're assembling backward from — the scene should feel like it grew out of the collision, not like a joke that got a setup built for it.

NATURAL DIALOGUE:
Use contractions, interruptions, unfinished thoughts, short answers, "what?", "nothing.", "okay.", "I didn't say that.", silence. Annoyed people rarely explain themselves.
Bad: "I feel like you don't respect my boundaries."
Better: "Did you move my charger?" / "Which one?" / "The one I was using." / "You weren't using it." / "I was about to."
If a line feels written, shorten it. If everyone sounds equally witty, fix the voices. Not every line needs to be funny. Sometimes the funniest line is completely ordinary.

SUBTEXT: Characters do not explain the joke. If someone is angry: "I'm fine." Not: "I am angry because..." If someone is losing an argument, they change the subject.

VISUAL COMEDY — look for: staring without speaking, slowly putting something down, walking away mid-sentence, opening the fridge again, silently handing someone an object, refusing eye contact, continuing an activity while arguing, immediately changing behavior after being caught, one person already knowing what's happening. Use physical behavior whenever it's funnier than another line of dialogue. Do not overload the script with stage directions. The camera observes; it does not editorialize.

ESCALATION: Comes from what already happened. Every step should feel like "of course they would do that." Not random. The ending should feel inevitable in hindsight.

BAIT & SWITCH — the setup must genuinely make the viewer think the video is going somewhere else. The BAIT looks romantic, emotional, serious, or important. The SWITCH reveals the real issue is mundane, petty, or extremely couple-specific. Build the entire video around the misleading setup and the deflating reveal — not just a funny last line.
Examples: Slow romantic music + serious approach → "Did you move my charger?" / "We need to talk." → who reorganized the snack drawer / looks like a proposal → he found a parking spot in front of the restaurant / she gets emotional → he asked if she wanted the last bite.

COMEDY FLAVORS:
DRY/DEADPAN: The lack of reaction is the joke. Awkward silence can be the punchline. No exaggerated sitcom reactions. One person can say something absurd while the other responds completely seriously.
PETTY: Tiny inconsistencies. Selective memory. Scorekeeping. Technically correct arguments. Quiet revenge. Exposing hypocrisy. The more specific, the funnier. Never genuinely cruel.
CHAOTIC: Start ordinary. One bad decision causes another. Characters become increasingly committed to a stupid position. Chaos must have internal logic — do not insert random weirdness.
WHOLESOME: Warmth through behavior, not speeches. Never cheesy. Never sentimental.
AWKWARD: Silence, hesitation, failed recovery, things left unsaid, secondhand embarrassment.
COMPETITIVE: A meaningless situation becomes a serious contest because neither person wants to lose.
SARCASTIC: Dry observations, literal responses to rhetorical questions, controlled irritation. No constant one-liners.

FORMAT:
ACTED SKIT: Dialogue, reactions, physical behavior, character contrast, timing, escalation, visual beats.
TEXT OVERLAY: Visual storytelling, short on-screen text beats, recognizable observations, minimal spoken dialogue. Do NOT generate a normal conversation when Text Overlay is selected.

FILMABILITY: Everything should be filmable with a phone in a normal location. No special effects, no expensive props, no complicated setups. If a joke can be made funnier through a simple physical action, prefer that over complicated writing.

HOOK: Start as close to the interesting behavior as possible. Do not introduce the couple. Do not open with "Hey guys", "So today", or "POV" unless the format genuinely needs it. Start in the middle of something already happening.

ENDING: Never simply stop after the conflict. The final beat should be a realization, reversal, silent look, unexpected action, callback, petty victory, or character doubling down. Do not explain why it's funny. Let it land.

AVOID GENERIC COUPLE HUMOR: no "men are like this / women are like this," no generic boyfriend-girlfriend or husband-wife stereotypes, no arguing just to argue, no wall-to-wall sarcasm, no absurdity without a specific character reason for it, no one-liner tacked onto the end of every scene, no character explaining the joke or saying how funny something is, no forced misunderstanding a normal person would clear up in one sentence. These read as generic AI couple content, not as this specific pair of people.

ANTI-AI FILTER — silently check before finalizing:
Does this sound like something a real couple might actually do?
Does each character have a distinct personality?
Could every line be spoken naturally out loud?
Is the situation specific enough?
Is the comedy coming from behavior rather than explanation?
Is there unnecessary dialogue that a visual moment could replace?
Does the ending actually land?
Does anything sound like a sitcom writer trying too hard?
Does anything sound like an AI being funny?
If yes to any — rewrite it. Do not make everything loud, chaotic, or witty. Some of the funniest videos are quiet. Sometimes one look is enough.

SETTINGS = CREATIVE DIRECTION, NOT A CHECKLIST: Do not mechanically demonstrate each selected setting. Let the traits naturally shape how characters behave. The final idea should feel like one coherent piece of comedy, not a combination of UI selections.

CREATOR STYLE NOTES: If provided, treat them as the highest priority. They describe this creator's actual taste, rhythm, cultural context, and preferred style. Prioritize those notes over generic comedy conventions. The goal is comedy THIS creator would actually post.

WHEN NO SITUATION IS PROVIDED: Invent a highly recognizable everyday couple situation — food, sleep, chores, getting ready, driving, temperature, blankets, TV choices, forgetting things, miscommunication, "nothing", "I'm fine", the last bite, who said what, selective memory. Then find the specific behavior inside it. Do not choose a random gimmick.

OUTPUT: Return ONLY valid JSON. No markdown fences. No commentary outside the JSON.

{
  "title": "Short intriguing title that does not give away the joke",
  "hook": "Exact first 2-3 seconds — the specific opening moment or line that stops the scroll",
  "characters": [{"role": "Partner A", "trait": "One precise personality trait"}, {"role": "Partner B", "trait": "One precise personality trait"}],
  "premise": "One sentence describing the comedy engine, not a generic plot summary",
  "setup": "Start in the middle of the situation. Do not introduce the couple.",
  "beats": ["Beat 1 — what happens", "Beat 2", "Beat 3", "Beat 4 — turn or escalation"],
  "script": "Full filmable script. Dialogue should sound natural, clipped, interrupted, human. [brackets] only for minimal essential physical actions. For Text Overlay, each text beat on its own line.",
  "visual_actions": ["Physical comedy moment 1", "moment 2", "moment 3"],
  "shot_list": ["Shot 1 — what is framed and why", "Shot 2", "Shot 3"],
  "estimated_runtime": "e.g. 15-25 seconds",
  "filming_difficulty": "Easy",
  "props": [],
  "ending": "The final comedic beat described plainly — what lands last",
  "caption": "Punchy TikTok caption under 150 characters, no generic hooks",
  "hashtags": ["couplecomedy", "relatable", "6-8 more relevant hashtags without the # symbol"]
}`;

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
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    return null;
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatAIError(data, status) {
  if (data?.code === "RATE_LIMIT_EXHAUSTED") {
    const providerName = data.provider === "anthropic" ? "Anthropic" : "Gemini";
    const wait = Number.isFinite(Number(data.retryAfter)) && Number(data.retryAfter) > 0
      ? ` The provider asked us to wait about ${Math.ceil(Number(data.retryAfter))} seconds.`
      : "";
    return `${providerName} rate limit reached — this API is temporarily maxed out for this request.${wait} Please wait a little and try again, or switch to the other AI provider.`;
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
async function callAPI(messages, provider = null, options = {}) {
  const res = await fetch("/api/couple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: SYSTEM_PROMPT, messages, maxTokens: options.maxTokens || 3000, ...(options.temperature !== undefined ? { temperature: options.temperature } : {}), ...(options.verify ? { verify: true } : {}), ...(provider ? { provider } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(formatAIError(data, res.status));
    err.code = data?.code;
    err.provider = data?.provider;
    throw err;
  }
  return { text: data.text || "", usage: data.usage || null };
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

const SAMPLE_TYPES = [
  { id: "positive", label: "✓ Works / I like this", color: C.green },
  { id: "negative", label: "✗ Doesn't work / I dislike this", color: "#f0575f" }, // = var(--danger)
  { id: "neutral", label: "~ Just an example", color: C.purple },
];

function DnaTrainer({ dnaProfile, onProfileUpdate, provider }) {
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [input, setInput] = useState("");
  const [sampleType, setSampleType] = useState("positive");
  const [sampleFormat, setSampleFormat] = useState(null); // null = "Unspecified"
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [err, setErr] = useState(null);
  const [showProfile, setShowProfile] = useState(!!dnaProfile);
  const [includedSampleIds, setIncludedSampleIds] = useState([]);
  const [dnaNeedsRebuild, setDnaNeedsRebuild] = useState(false);
  const msgRef = useRef(null);

  const ANALYZE_MSGS = [
    "Studying the comedy instincts...",
    "Looking for the pattern behind the pattern...",
    "Finding what makes this creator tick...",
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
        body: JSON.stringify({ text, type: sampleType, format: sampleFormat }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to save sample (${res.status})`);
      setSamples(prev => [...prev, data.sample]);
      setInput("");
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
      body: JSON.stringify({
        system: "__COUPLE_DNA_ACTION__",
        provider: provider,
        maxTokens,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
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

  const analyze = async () => {
    if (samples.length === 0) return;

    // Cap check — block before spending any analysis calls, with an
    // actionable message, rather than silently dropping/rotating samples.
    // Mirrors Solo's split: a full build/rebuild cares about the whole
    // corpus, an incremental update only cares about what it'd add on top
    // of what's already trained. forceFull here is a pre-check using the
    // same condition the real forceFull below is computed from — dnaProfile
    // and dnaNeedsRebuild don't change during this function.
    const wouldForceFull = !dnaProfile || dnaNeedsRebuild;
    if (wouldForceFull) {
      if (samples.length > MAX_TRAINING_SAMPLES) {
        setErr(
          `You have ${samples.length} samples, over the ${MAX_TRAINING_SAMPLES}-sample training cap. ` +
          `Delete ${samples.length - MAX_TRAINING_SAMPLES} sample${samples.length - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} (keep your strongest/most representative ones) before training.`
        );
        return;
      }
    } else {
      const newSampleCount = samples.filter((s) => !includedSampleIds.includes(s.id)).length;
      const totalAfter = includedSampleIds.length + newSampleCount;
      if (totalAfter > MAX_TRAINING_SAMPLES) {
        setErr(
          `Training on these ${newSampleCount} new sample${newSampleCount === 1 ? "" : "s"} would put you at ${totalAfter}, over the ${MAX_TRAINING_SAMPLES}-sample cap. ` +
          `Delete ${totalAfter - MAX_TRAINING_SAMPLES} older/weaker sample${totalAfter - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} first before training on these new ones.`
        );
        return;
      }
    }

    setAnalyzing(true);
    setErr(null);
    setAnalyzeMsg(pick(ANALYZE_MSGS));
    msgRef.current = setInterval(() => setAnalyzeMsg(pick(ANALYZE_MSGS)), 2200);

    try {
      // First make sure every sample has an individual analysis. This mirrors
      // Solo and means the eventual DNA merge only needs compact analyses.
      let working = [...samples];
      for (let i = 0; i < working.length; i++) {
        if (working[i].analysis && !working[i].analysis_error) continue;
        setAnalyzeMsg(`Analyzing sample ${i + 1} of ${working.length}...`);
        const s = working[i];
        const formatObj = s.format ? FORMATS.find(f => f.id === s.format) : null;
        try {
          const data = await dnaAction({
            action: "analyzeSample",
            content: s.text,
            title: `Couple sample ${i + 1}`,
            sampleType: s.type,
            formatLabel: formatObj?.label || null,
            formatDesc: formatObj?.desc || null,
          }, 1800);
          const patchRes = await fetch(`/api/couple/samples/${encodeURIComponent(s.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: data.analysis, analysisError: "" }),
          });
          const patchData = await patchRes.json().catch(() => ({}));
          if (!patchRes.ok) throw new Error(patchData?.error || "Failed to save sample analysis.");
          working[i] = patchData.sample;
          setSamples(prev => prev.map(x => x.id === s.id ? patchData.sample : x));
        } catch (sampleErr) {
          const msg = sampleErr?.message || "Analysis failed.";
          await fetch(`/api/couple/samples/${encodeURIComponent(s.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisError: msg }),
          }).catch(() => {});
          throw new Error(`Sample ${i + 1} analysis failed: ${msg}`);
        }
      }

      const ready = working.filter(s => s.analysis);
      if (!ready.length) throw new Error("No samples could be analyzed.");

      const forceFull = !dnaProfile || dnaNeedsRebuild;
      const newSamples = ready.filter(s => !includedSampleIds.includes(s.id));
      if (!forceFull && newSamples.length === 0) {
        setAnalyzeMsg("Comedy DNA is already up to date.");
        setShowProfile(true);
        return;
      }

      const chosen = forceFull ? ready : newSamples;
      const analyses = chosen.map((s) => {
        const formatObj = s.format ? FORMATS.find(f => f.id === s.format) : null;
        return {
          id: s.id,
          title: `Couple sample ${s.id}`,
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
      setShowProfile(true);
      setAnalyzeMsg(forceFull
        ? `Comedy DNA built from ${ready.length} samples.`
        : `Comedy DNA updated with ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setErr(e.message || "Analysis failed. Please try again.");
    } finally {
      clearInterval(msgRef.current);
      setAnalyzing(false);
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/couple/samples", { method: "DELETE" });
      // The route intentionally supports bulk clear for the DNA reset flow.
      if (!res.ok) throw new Error("Failed to clear samples.");
      await fetch("/api/couple/dna", { method: "DELETE" });
      setSamples([]);
      setIncludedSampleIds([]);
      setDnaNeedsRebuild(false);
      onProfileUpdate(null);
      setShowProfile(false);
    } catch (e) { setErr(e.message || "Failed to clear Comedy DNA."); }
  };

  const typeColor = (type) => SAMPLE_TYPES.find(t => t.id === type)?.color || C.muted;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "16px" }}>

      {/* Intro */}
      <div style={{ background: C.white, borderRadius: "10px", padding: "18px", marginBottom: "12px", border: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, marginBottom: "6px" }}>🧬 Comedy DNA Trainer</div>
        <div style={{ fontSize: "13px", color: C.muted, lineHeight: 1.7 }}>
          Feed the AI your comedy samples — scripts, ideas, dialogue, captions, descriptions. It will analyze each sample, learn your recurring comedic instincts, and build structured Comedy DNA that makes every generated script feel more like <em>you</em>.
          <br /><strong style={{ color: C.dark }}>Negative examples are just as valuable as positive ones.</strong> They define your edges.
        </div>
        {dnaProfile && (
          <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "10px", background: `${C.green}15`, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: C.green, fontWeight: 700 }}>✓ Comedy DNA active</span>
            <span style={{ fontSize: "12px", color: C.muted }}>— injected into every generation</span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: "12px" }}>

        {/* Add sample */}
        <div style={{ background: C.white, borderRadius: "10px", padding: "16px", border: "1px solid var(--border-soft)" }}>
          <span style={sLabel}>Add a Comedy Sample</span>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={"Paste a script, describe a video, share dialogue, explain an idea...\n\nExamples:\n• A full script you wrote or filmed\n• 'She asked where to eat. He said anywhere. They went to three places.'\n• A caption that got a lot of tags\n• An idea you thought was funny but wasn't sure why\n• Something you saw that felt 'too scripted' for your style"}
            rows={6}
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: "8px", padding: "11px 13px", fontSize: "14px", lineHeight: 1.65, color: C.dark, resize: "vertical", outline: "none", background: C.bg, marginBottom: "12px" }}
            onFocus={e => e.target.style.borderColor = C.purple}
            onBlur={e => e.target.style.borderColor = C.border}
          />

          <span style={{ ...sLabel, marginBottom: "8px", display: "block" }}>Label this sample</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {SAMPLE_TYPES.map(t => (
              <button key={t.id} onClick={() => setSampleType(t.id)} style={{
                padding: "7px 13px", borderRadius: "100px",
                border: `1.5px solid ${sampleType === t.id ? t.color : C.border}`,
                background: sampleType === t.id ? `${t.color}18` : C.white,
                color: sampleType === t.id ? t.color : C.muted,
                fontSize: "12px", fontWeight: sampleType === t.id ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>{t.label}</button>
            ))}
          </div>

          <span style={{ ...sLabel, marginBottom: "8px", display: "block" }}>Format (optional)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            <button onClick={() => setSampleFormat(null)} style={{
              padding: "7px 13px", borderRadius: "100px",
              border: `1.5px solid ${sampleFormat === null ? C.purple : C.border}`,
              background: sampleFormat === null ? `${C.purple}18` : C.white,
              color: sampleFormat === null ? C.purple : C.muted,
              fontSize: "12px", fontWeight: sampleFormat === null ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>Unspecified</button>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => setSampleFormat(f.id)} style={{
                padding: "7px 13px", borderRadius: "100px",
                border: `1.5px solid ${sampleFormat === f.id ? C.purple : C.border}`,
                background: sampleFormat === f.id ? `${C.purple}18` : C.white,
                color: sampleFormat === f.id ? C.purple : C.muted,
                fontSize: "12px", fontWeight: sampleFormat === f.id ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>{f.emoji} {f.label}</button>
            ))}
          </div>

          <button onClick={addSample} disabled={!input.trim()} style={{
            padding: "11px 20px", borderRadius: "8px", border: "none",
            background: input.trim() ? C.purple : C.border,
            color: input.trim() ? C.ink : C.muted,
            fontSize: "13px", fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}>
            + Add Sample
          </button>
        </div>

        {/* Samples list */}
        {samples.length > 0 && (
          <div style={{ background: C.white, borderRadius: "10px", padding: "16px", border: "1px solid var(--border-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ ...sLabel, color: samples.length >= MAX_TRAINING_SAMPLES ? "#f2a93b" : sLabel.color }}>
                {samples.length} / {MAX_TRAINING_SAMPLES} Sample{samples.length !== 1 ? "s" : ""} Added
                {samples.length >= MAX_TRAINING_SAMPLES ? " — cap reached" : ""}
              </span>
              <span style={{ fontSize: "11px", color: C.muted }}>
                {samples.filter(s => s.type === "positive").length} positive · {samples.filter(s => s.type === "negative").length} negative · {samples.filter(s => s.type === "neutral").length} neutral
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {samples.map((s, i) => (
                <div key={s.id} style={{ padding: "11px 13px", borderRadius: "8px", border: `1.5px solid ${typeColor(s.type)}25`, background: `${typeColor(s.type)}08`, display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: typeColor(s.type), minWidth: "20px", paddingTop: "2px" }}>#{i + 1}</span>
                  <div style={{ flex: 1, fontSize: "13px", color: C.dark, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {s.format && (
                      <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 700, color: C.purple, background: `${C.purple}15`, borderRadius: "100px", padding: "2px 8px", marginBottom: "4px" }}>
                        {FORMATS.find(f => f.id === s.format)?.label || s.format}
                      </span>
                    )}
                    <div>{s.text.length > 200 ? s.text.slice(0, 200) + "..." : s.text}</div>
                  </div>
                  <button onClick={() => deleteSample(s.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>

            {/* Analyze button */}
            <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
              <button onClick={analyze} disabled={analyzing} style={{
                flex: 1, padding: "13px", borderRadius: "8px", border: "none",
                background: analyzing ? C.border : C.purple,
                color: analyzing ? C.muted : C.ink,
                fontSize: "14px", fontWeight: 700, cursor: analyzing ? "not-allowed" : "pointer", fontFamily: "inherit",
                boxShadow: "none",
              }}>
                {analyzing ? analyzeMsg : dnaProfile ? "🧬 Re-analyze & Update DNA" : "🧬 Analyze & Build DNA"}
              </button>
              <button onClick={clearAll} style={{ padding: "13px 16px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: C.white, color: C.muted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                Clear All
              </button>
            </div>

            {err && <div style={{ marginTop: "10px", padding: "10px 13px", borderRadius: "8px", background: "var(--danger-dim)", color: "var(--danger)", fontSize: "13px" }}>{err}</div>}
          </div>
        )}

        {/* DNA Profile display */}
        {dnaProfile && (
          <div style={{ background: C.white, borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border-soft)" }}>
            <button onClick={() => setShowProfile(!showProfile)} style={{
              width: "100%", padding: "14px 16px", border: "none", background: "none",
              display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.dark }}>🧬 Your Comedy DNA Profile</span>
              <span style={{ color: C.muted, fontSize: "18px", transform: showProfile ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>⌄</span>
            </button>
            {showProfile && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ marginTop: "14px", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.75, color: C.dark, fontFamily: "monospace" }}>
                  {JSON.stringify(dnaProfile, null, 2)}
                </div>
                <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(dnaProfile, null, 2)); }} style={{ padding: "7px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Copy Profile</button>
                </div>
              </div>
            )}
          </div>
        )}

        {samples.length === 0 && !dnaProfile && (
          <div style={{ background: C.white, borderRadius: "10px", padding: "40px 24px", textAlign: "center", border: "1px solid var(--border-soft)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧬</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: C.dark, marginBottom: "8px" }}>No samples yet</div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: 1.65 }}>Add 3+ samples above to start building your Comedy DNA.<br />Mix positive and negative examples for the best results.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────

export default function CoupleContentGeneratorPage() {
  const [provider, setProvider] = useState("anthropic");
  const [situation, setSituation] = useState("");
  const [vibe, setVibe] = useState(null);
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
    fetch("/api/settings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || "Failed to load AI provider setting.");
        if (!cancelled && (data?.couple === "gemini" || data?.couple === "anthropic")) setProvider(data.couple);
      })
      .catch((err) => console.warn("Provider setting load failed:", err));
    return () => { cancelled = true; };
  }, []);

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

  const buildPrompt = () => {
    const vibeObj = VIBES.find(x => x.id === vibe);
    const locObj = LOCATIONS.find(x => x.id === location);
    const dynObj = DYNAMICS.find(x => x.id === dynamic);
    const bpObj = BLUEPRINTS.find(x => x.id === blueprint);
    const formatObj = FORMATS.find(x => x.id === format);
    const lines = [];
    if (situation.trim()) lines.push(`SITUATION: ${situation.trim()}`);
    else lines.push(`No situation provided. Invent a highly relatable couple situation that fits the selected settings. Make it feel like something real couples actually experience.`);
    if (vibe && vibe !== "surprise-me") lines.push(`HUMOR MECHANISM: ${vibeObj?.label} — ${vibeObj?.desc}`);
    else lines.push(`AI INSTRUCTION: Choose the humor mechanism that will make this situation funniest. Choose deliberately, not randomly.`);
    lines.push(`FORMAT: ${formatObj?.label}${formatObj?.desc ? ` — ${formatObj.desc}` : ""}`);
    if (location && location !== "ai") lines.push(`LOCATION: ${locObj?.label}`);
    if (personalities.length > 0) lines.push(`PERSONALITY CONTRAST: ${personalities.join(" vs ")}`);
    if (dynamic && dynamic !== "ai") lines.push(`RELATIONSHIP DYNAMIC: ${dynObj?.label}`);
    if (intensity) lines.push(`INTENSITY: ${intensity}`);
    if (flavor) lines.push(`FLAVOR/TONE: ${flavor}`);
    if (blueprint && blueprint !== "ai") lines.push(`NARRATIVE BLUEPRINT: ${bpObj?.label}`);
    if (creativeDna.trim()) lines.push(`CREATOR STYLE NOTES: ${creativeDna.trim()}`);
    if (dnaProfile) lines.push(`\n═══ COMEDY DNA (HIGHEST PRIORITY — this couple's learned comedic instincts override generic advice) ═══\n${summarizeDNAForPrompt(dnaProfile, `${situation || ""} ${formatObj?.label || ""} ${flavor || ""}`)}\n═══ END COMEDY DNA ═══`);
    if (avoidNotes.length > 0) lines.push(`\n═══ AVOID LIST (HIGHEST PRIORITY) ═══\n${avoidNotes.map((n) => `- ${n.note}`).join("\n")}\n═══ END AVOID LIST ═══`);
    return lines.join("\n");
  };

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setErr(null);
    setSavedThisResult(false);
    try {
      const ai = await callAPI([{ role: "user", content: buildPrompt() }], provider, { maxTokens: format === "text-overlay" ? 1800 : 3200, temperature: 0.9, verify: true });
      const parsed = parseJSON(ai.text);
      setLastUsage(ai.usage);
      if (!parsed) throw new Error("Couldn't parse the response. Please try again.");
      setResult(parsed);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const refine = async (action) => {
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
    try {
      const ai = await callAPI([{
        role: "user",
        content: `Current concept:\n${JSON.stringify(result, null, 2)}\n\nREFINEMENT: ${guides[action]}\n\nReturn improved concept as valid JSON only, same structure, no other text.`,
      }], provider, { maxTokens: 3000, temperature: 0.78 });
      const parsed = parseJSON(ai.text);
      setLastUsage(ai.usage);
      if (parsed) { setResult(parsed); setSavedThisResult(false); }
    } catch {}
    setRefining(false);
  };

  const surprise = () => {
    setSituation("");
    setVibe(pick(VIBES.filter(v => v.id !== "surprise-me")).id);
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
      const distillRes = await fetch("/api/couple/avoid-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, reason, provider }),
      });
      const distill = await distillRes.json().catch(() => ({}));
      if (!distillRes.ok) throw new Error(distill?.error || "Failed to learn from this result.");
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
    setSituation(""); setVibe(null); setFormat("acted-skit");
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
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: "10px" }}>
        <div>
          {/* Global Solo/Couple mode switcher — the page-specific tabs
              (Generator / Comedy DNA / Saved) stay in their own row below,
              unaffected. */}
          <div style={{ marginBottom: "6px" }}>
            <ModeSwitcher active="couple" /><ProviderSwitcher app="couple" provider={provider} onChange={setProvider} />
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }}>💑 Couple Content Generator</div>
          <div style={{ fontSize: "11px", color: C.muted }}>TikTok · Make them tag each other</div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={() => setView("generator")} style={{
            padding: "7px 13px", borderRadius: "10px",
            border: `1.5px solid ${view === "generator" ? C.pink : C.border}`,
            background: view === "generator" ? `${C.pink}10` : C.white,
            color: view === "generator" ? C.pink : C.dark,
            fontSize: "12px", fontWeight: view === "generator" ? 700 : 500, cursor: "pointer",
          }}>Generator</button>
          <button onClick={() => setView("dna")} style={{
            padding: "7px 13px", borderRadius: "10px",
            border: `1.5px solid ${view === "dna" ? C.purple : C.border}`,
            background: view === "dna" ? `${C.purple}10` : C.white,
            color: view === "dna" ? C.purple : C.dark,
            fontSize: "12px", fontWeight: view === "dna" ? 700 : 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            🧬 Comedy DNA {dnaProfile && <span style={{ background: C.green, color: C.ink, borderRadius: "4px", padding: "1px 5px", fontSize: "10px", fontWeight: 800 }}>ON</span>}
          </button>
          {view === "generator" && (
            <button onClick={() => setSavedOpen(true)} style={{ padding: "7px 13px", borderRadius: "10px", border: `1.5px solid ${C.border}`, background: C.white, color: C.dark, fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
              📁 {savedIdeas.length > 0 ? `(${savedIdeas.length})` : "Saved"}
            </button>
          )}
        </div>
      </div>

      {/* DNA Trainer View */}
      {view === "dna" && (
        <DnaTrainer dnaProfile={dnaProfile} onProfileUpdate={(p) => setDnaProfile(p)} provider={provider} />
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
            <div style={{ background: C.white, borderRadius: "10px", padding: "15px", marginBottom: "10px", border: "1px solid var(--border-soft)" }}>
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
            </div>

            {/* Vibe */}
            <div style={{ background: C.white, borderRadius: "10px", padding: "15px", marginBottom: "10px", border: "1px solid var(--border-soft)" }}>
              <span style={sLabel}>Humor / Vibe <span style={{ fontWeight: 400, fontSize: "9px" }}>— optional</span></span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {VIBES.map(v => (
                  <Chip key={v.id} label={v.label} emoji={v.emoji} selected={vibe === v.id} onClick={() => setVibe(vibe === v.id ? null : v.id)} color={v.id === "surprise-me" ? C.purple : C.pink} />
                ))}
              </div>
            </div>

            {/* Format */}
            <div style={{ background: C.white, borderRadius: "10px", padding: "15px", marginBottom: "10px", border: "1px solid var(--border-soft)" }}>
              <span style={sLabel}>Format</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setFormat(f.id)} style={{
                    padding: "11px 12px", borderRadius: "8px",
                    border: `1.5px solid ${format === f.id ? C.pink : C.border}`,
                    background: format === f.id ? `${C.pink}10` : C.white,
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <div style={{ fontSize: "17px", marginBottom: "3px" }}>{f.emoji}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: format === f.id ? C.pink : C.dark }}>{f.label}</div>
                    <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced */}
            <div style={{ background: C.white, borderRadius: "10px", overflow: "hidden", marginBottom: "12px", border: "1px solid var(--border-soft)" }}>
              <button onClick={() => setAdvOpen(!advOpen)} style={{
                width: "100%", padding: "14px 15px", border: "none", background: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
              }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: C.dark }}>⚙️ Advanced Creative Controls</span>
                <span style={{ color: C.muted, fontSize: "18px", transform: advOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>⌄</span>
              </button>

              {advOpen && (
                <div style={{ padding: "0 15px 15px", borderTop: `1px solid ${C.border}` }}>

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
                    <span style={sLabel}>Audience &amp; Tone <span style={{ fontWeight: 400 }}>(sticks across sessions — separate from Solo)</span></span>
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
