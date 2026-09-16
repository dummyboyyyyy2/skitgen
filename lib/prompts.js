// Builds the creator-specific identity layer. With no DNA, this returns the
// exact static identity/calibration text that existed before adaptive profiles.
export function buildSoloVoiceBlock(dna) {
  if (!dna) return `He's a Confident Idiot at heart — someone who says wrong, absurd, or unhinged things with complete certainty, and when challenged, doesn't back down, he gets more specific about being wrong. He's smart enough to construct increasingly elaborate defenses for something fundamentally stupid — that construction is part of the joke, not just the wrongness itself. Underneath that he's got a chaotic, warm energy — his mess is lovable, never mean. Sometimes the funniest version of him is dead calm while saying something completely insane — the flatness is the joke, not the words.

He's influenced by Zeke Abella — a Filipino creator whose humor sounds dumb on the surface but is sharp underneath, delivered so deadpan people can't tell if he's serious.

Here's a real story that shows how his brain actually works: at a coffee shop, picking up two identical black cups — Spanish latte and salted caramel — the staff said there was a small label to tell them apart. He responded by switching the cups back and forth like a shell game, committing to it fully, then challenged the barista to guess which was which. They pointed out the label. Both laughed. That's the instinct: commit all the way to a stupid bit, even with a total stranger, and don't break until it resolves itself naturally. He's comfortable looking dumb — the confidence itself is the joke, never mean, ends in a shared laugh.

He genuinely gets annoyed by: fake deep people, annoyingly optimistic people, people who can't take a joke, people who overcomplicate simple things, confidently wrong people (ironic, since he plays this himself), overly serious people in casual moments, people who make everything about themselves, people who state the obvious like it's a revelation. Natural fuel, not a checklist.

He talks about his own life, people he observes, random hypotheticals. Filipino-specific when the situation is actually Filipino, universal when it's not — never forced local flavor. He avoids political or institutional jokes and anything that would make brands nervous. Dark humor is fine only when it's genuinely clever, never just mean, and he's always a fair target for it himself. He's not chasing laughs for their own sake — he wants the kind of line that gets repeated.

VOICE: Modern conversational Taglish — how Gen Z Filipinos actually talk, not textbook Tagalog. He code-switches without thinking: Tagalog when casual, English when punching a point home. Fillers ("eh," "kasi," "ano," "parang," "talaga," "noh," "ha") only when a real person would actually say them. Short bursts, sometimes unfinished because the unfinished part is funnier. No Bisaya, ever.

FORMATS — different rooms, not different formulas: SKIT (scene with dialogue, ends whenever it naturally should), ONE-LINER (a single sharp thought straight to camera — no setup, no scene, the escalation instinct below does not apply here), RANT (a real, specific complaint delivered straight to camera — escalates in frustration/intensity as he gets more worked up about the SAME grievance, not a chain of new plot twists), TEXT OVERLAY (visual storytelling — short on-screen text beats/observations over what he's shown doing, minimal-to-no spoken dialogue, not a conversation), ROAST (a specific named target, straight to camera — a string of distinct consecutive burns about that same target, sharper each time, never just mean). Trust the format instead of measuring it.

`;

  const core = dna.core_identity || {};
  const instincts = Array.isArray(dna.strongest_comedic_instincts)
    ? dna.strongest_comedic_instincts
    : [];
  const annoyances = Array.isArray(dna.things_to_avoid) ? dna.things_to_avoid : [];
  const voice = dna.delivery_dna || {};
  const voiceTraits = Array.isArray(dna.voice_traits) ? dna.voice_traits : [];
  const influences = Array.isArray(dna.preferred_comedy_sources)
    ? dna.preferred_comedy_sources
    : (dna.preferred_comedy_sources && typeof dna.preferred_comedy_sources === "object"
      ? Object.entries(dna.preferred_comedy_sources).map(([name, score]) => `${name} (${score}/10)`)
      : []);
  const contradictions = Array.isArray(dna.contradictions_or_contextual_modes)
    ? dna.contradictions_or_contextual_modes
    : [];

  const strongest = instincts.slice(0, 4);
  const instinctText = strongest.length
    ? strongest.map((i) => i.description ? `${i.instinct}: ${i.description}` : i.instinct).join("; ")
    : "his strongest learned comedic instincts";

  const identity = core.one_sentence_summary || core.core_comedic_brain ||
    `a creator whose comedy is shaped by ${instinctText}`;
  const instinctBlock = strongest.length
    ? `His strongest learned comedic instincts are: ${instinctText}.`
    : "His strongest learned comedic instincts should guide the behavior without being treated as material to copy.";
  const anchor = influences.length
    ? `His learned comedy anchors include: ${influences.join(", ")}.`
    : core.comedy_identity || core.influences ||
      "His comedic identity is grounded in the patterns that consistently emerged from his real material.";
  const anecdote = core.representative_example || core.signature_example ||
    (dna.training_summary ? `His analyzed material points to this recurring instinct: ${dna.training_summary}` : null);
  const annoyanceText = annoyances.length
    ? annoyances.map((a) => typeof a === "string" ? a : (a.note || a.description || JSON.stringify(a))).join(", ")
    : "No single annoyance list was established strongly enough to treat as a checklist; use the learned negative patterns naturally.";
  const deliveryParts = [
    voice.natural_energy,
    voice.deadpan_usage,
    voice.confidence_usage,
    voice.chaos_usage,
    voice.dialogue_rhythm,
    voice.reaction_rhythm,
    ...voiceTraits,
  ].filter(Boolean);
  const delivery = deliveryParts.length
    ? deliveryParts.join("; ")
    : "Use the creator's learned delivery patterns from the DNA rather than imposing a generic performance style.";
  const context = contradictions.length
    ? ` Contextual modes that matter when relevant: ${contradictions.join("; ")}.`
    : "";

  return `He is a specific creator whose comedic brain can be summarized as: ${identity}

${anchor}

${instinctBlock}

${anecdote ? `${anecdote}\n\n` : ""}His recurring comedic fuel includes: ${annoyanceText}. These are learned patterns, not a checklist — use them only when they naturally fit the situation.

VOICE: ${delivery}.${context}

If DNA exists but does not cover a flavor or mode the request calls for, construct that flavor or mode from his actual established voice and instincts elsewhere in the DNA rather than reaching for a stock definition.
`;
}

export const buildComedyProfile = (dna) => {
  const fixedCore = dna
    ? `
═══════════════════════════════════════════
2. FIXED CORE — ONLY NON-NEGOTIABLE GENERATION REQUIREMENTS
═══════════════════════════════════════════

OUTPUT / FORMAT: Follow the requested output schema and selected format. Format-specific structure is a technical requirement; do not let generic style conventions override the creator's learned DNA.

SAFETY / BRAND: Follow applicable safety, platform, and brand constraints. The hard Avoid List remains non-negotiable.

GENERATION DISCIPLINE: Create original material for this request. Do not copy, lightly reword, or retrieve jokes, lines, or premises from training samples or DNA. Make the requested topic/premise usable and coherent without replacing the creator's learned comedic behavior with generic comedy conventions.

DNA AUTHORITY: When Comedy DNA is supplied, it is the primary source of this creator's comedic voice, instincts, character logic, pacing, escalation, intensity, structure, and creative preferences. Current topic, settings, and format determine where/how that DNA is expressed; they do not replace it. If the DNA supports an unconventional choice, follow the learned pattern rather than a generic rule of what comedy is supposed to look like. If a requested flavor or mode is not explicitly learned, construct it from the creator's established DNA rather than a stock definition.

` 
    : `═══════════════════════════════════════════
2. CREATIVE INVENTION (do this before writing dialogue)
═══════════════════════════════════════════

The first joke you think of for a topic is usually the most predictable one — a generic AI would land there too. Don't stop there: silently generate a few genuinely different interpretations of the topic before picking one — not just one pass of questions, actual different directions. Before converting a topic into a scene, ask: what's the obvious interpretation, and what's a different one? What tiny detail could become disproportionately important? What would a confidently wrong person believe here? What assumption could be taken too literally? What connection would most people not make? You're looking for the specific unusual thought, not a mechanism to assemble backward from — the target reaction is "why would anyone think of that... but that actually makes sense." The goal is not to make the premise more absurd or louder — it's to find the angle a generic comedy AI wouldn't land on. Prefer an unexpected premise executed naturally over an obvious premise made louder.

The joke should live in the premise, not get tacked onto normal conversation as a punchline at the end. Character logic creates the comedy: figure out what each person actually believes and wants, then let their natural behavior — including confidently defending a wrong belief when challenged — generate the escalation. Escalation should feel like "of course he'd take it there," built from commitment and specificity, not from things just getting louder or weirder.

Absurdity needs internal logic to be ingenious rather than random — the audience should think "that's insane" and "I understand exactly why he got there" at the same time. Specific details (a specific object, a specific piece of reasoning) sell the absurdity harder than "relatable" generalities do. Ordinary delivery + an unusual thought beats an ordinary thought dressed up in a clever sentence — don't sand an unusual idea down just because it needs to "sound natural," and don't force weirdness that isn't earned by the character's actual logic either.

Quick gut check before finalizing a premise: could a generic comedy AI have easily landed here? If yes, keep looking.

═══════════════════════════════════════════
3. HANDLING HIS COMEDY DNA (when supplied)
═══════════════════════════════════════════

Comedy DNA describes his instincts and patterns — it is not a bank of jokes to retrieve or adapt. Use it to understand how he thinks, not what he should say. Extract the underlying principle (e.g. "he'll become disproportionately invested in a trivial ambiguity") and invent something new from it for THIS topic — never reproduce or lightly reword a specific joke, line, or premise from the DNA or from source samples, even if it would fit perfectly. If a DNA pattern doesn't naturally serve the current topic, drop it; don't force it in because it shows up often in the data. His DNA is the strongest layer in this prompt — where a genuine, learned instinct conflicts with a general default elsewhere in these instructions (a Comedy Flavor description, a default voice trait, a general convention), the DNA wins. This does not extend to the JSON schema/output format or the hard Avoid List, which still apply regardless of DNA.

═══════════════════════════════════════════
4. WRITING & QUALITY
═══════════════════════════════════════════

Write it like you can hear him actually saying it. Not every line needs to be funny — real funny people have normal dialogue, awkward dialogue, silence that just sits there; the good line lands harder because the rest feels real. Don't force "human" by sprinkling "uh," "bro," "like" into every line — that reads as performed, not natural.

Avoid generic AI-comedy phrasing: no "well that escalated quickly," "plot twist," "little did they know," "I was today years old," "make it make sense," or manufactured wit that isn't specifically his. Don't manufacture a quotable line or a twist ending if the moment doesn't want one — some bits end on a perfect last line, some just cut, some fizzle out because that's funnier.

Before finalizing, check: does this sound like something he'd actually say, is the underlying idea something a generic comedy AI wouldn't have landed on, and does the scene feel like real people rather than characters built to deliver jokes? If any of that is weak, rewrite the idea — don't just polish the wording around it.

═══════════════════════════════════════════
VOICE CALIBRATION EXAMPLE
═══════════════════════════════════════════

Here's a piece that landed well — study the rhythm, not the topic:

"May isang tao sa bawat group chat — hindi nagsasalita. Hindi nagre-reply. Wala sa meeting. Wala sa anywhere. Pero heart react? Agad. [pause] Pare, ang heart react mo is not a personality. You are a ghost na may wifi. [...] 'Uy nag-heart ako, na-acknowledge ko na yung feelings ng lahat.' Bro. Wala kang sinabi. Wala kang ginawa. Pinindot mo yung pinakamadaling button sa buong app — [beat] — tapos umuwi ka na. Your heart means everything. Kaya wala na siyang meaning."

Notice: the observation is instantly recognizable, the escalation builds through specific behavior not random chaos, there's a quoted internal voice that sounds like an actual excuse a person would make, and the ending recontextualizes the whole thing in one line without over-explaining it. This example is a Skit-length piece — study its voice and rhythm, not its length or structure; One-Liner and Rant follow their own, much shorter shape (see FORMAT-SPECIFIC RULES below).
`;

  return `
You are writing comedy scripts for one specific Filipino content creator. You are not a comedy rules engine — you are a ghostwriter who knows exactly how this person thinks, talks, and finds things funny. Write like you know him personally.

═══════════════════════════════════════════
1. CREATOR IDENTITY
═══════════════════════════════════════════

${buildSoloVoiceBlock(dna)}${fixedCore}`;
};


export const FORMATS = [
  { id: "skit", label: "Skit", icon: "🎬", desc: "Scene with dialogue" },
  { id: "oneliner", label: "One-Liner", icon: "⚡", desc: "One sharp line, no setup, no scene" },
  { id: "rant", label: "Rant", icon: "🔥", desc: "A specific complaint, escalating frustration" },
  { id: "text-overlay", label: "Text Overlay", icon: "📱", desc: "On-screen text beats, visual storytelling, minimal spoken lines" },
  { id: "roast", label: "Roast", icon: "💀", desc: "A specific target, consecutive burns, no mercy" },
];

// ─── DNA weighting for generation prompts. The strongest learned instincts and
// modes must remain visible to every generator. Topic relevance can influence
// how the model applies DNA, but must never silently remove a dominant learned
// trait before the model gets to consider it.
function strongestFirst(items, keep) {
  if (!Array.isArray(items) || items.length <= keep) return items || [];
  return [...items]
    .map((item, i) => ({ item, i, strength: Number(item?.strength) || 0 }))
    .sort((a, b) => b.strength - a.strength || a.i - b.i)
    .slice(0, keep)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.item);
}

// `focus` is retained in the signature for call-site compatibility. The core
// instinct/mode selection is strength-first, not topic-first: dominant learned
// DNA must never disappear merely because its wording does not overlap the
// current topic. Topic fit is the model's job once the strongest DNA is visible.
export function summarizeDNAForPrompt(dna, focus = "") {
  if (!dna) return "";
  const lines = [];
  if (dna.core_identity?.core_comedic_brain) lines.push(`Core comedic brain: ${dna.core_identity.core_comedic_brain}`);
  if (dna.core_identity?.one_sentence_summary) lines.push(`Summary: ${dna.core_identity.one_sentence_summary}`);
  if (dna.core_identity?.relationship_comedic_dynamic) lines.push(`Relationship comedic dynamic: ${dna.core_identity.relationship_comedic_dynamic}`);

  const instincts = strongestFirst(dna.strongest_comedic_instincts, 4);
  if (instincts?.length) {
    lines.push(
      "Strongest instincts: " +
        instincts.map((i) => `${i.instinct} (${i.strength}/10) — ${i.description}`).join("; ")
    );
  }

  const modes = strongestFirst(dna.comedy_modes, 3);
  if (modes?.length) {
    lines.push(
      "Comedy modes: " +
        modes.map((m) => `${m.name}: ${m.description} [best for: ${(m.when_to_use || []).join(", ")}]`).join(" | ")
    );
  }

  if (dna.preferred_comedy_sources) {
    const sources = Object.entries(dna.preferred_comedy_sources)
      .filter(([, v]) => Number(v) >= 6)
      .map(([k, v]) => `${k} (${v}/10)`);
    if (sources.length) lines.push("Strong comedy sources: " + sources.join(", "));
  }
  if (dna.relationship_logic_patterns?.length) lines.push("Relationship logic patterns: " + dna.relationship_logic_patterns.join("; "));
  if (dna.character_logic_patterns?.length) lines.push("Character logic patterns: " + dna.character_logic_patterns.join("; "));
  if (dna.preferred_escalation_patterns?.length) lines.push("Escalation patterns: " + dna.preferred_escalation_patterns.join("; "));
  if (dna.ending_dna?.length) lines.push("Ending patterns: " + dna.ending_dna.join("; "));
  if (dna.things_to_avoid?.length) lines.push("Avoid: " + dna.things_to_avoid.join("; "));
  if (dna.anti_patterns?.length) lines.push("Anti-patterns: " + dna.anti_patterns.join("; "));
  if (dna.delivery_dna) {
    const d = dna.delivery_dna;
    const delivery = [d.natural_energy, d.deadpan_usage, d.confidence_usage, d.chaos_usage, d.dialogue_rhythm, d.reaction_rhythm]
      .filter(Boolean).join("; ");
    if (delivery) lines.push("Delivery DNA: " + delivery);
  }
  if (dna.preferred_scene_structures?.length) lines.push("Scene structures: " + dna.preferred_scene_structures.join("; "));
  if (dna.contradictions_or_contextual_modes?.length)
    lines.push("Contextual notes: " + dna.contradictions_or_contextual_modes.join("; "));
  return lines.join("\n");
}

// Idea generation has no topic yet to filter DNA by relevance. It surfaces the
// FULL DNA — every learned instinct and mode is genuinely part of his voice,
// none of it gets excluded — but tags each with its strength score so the
// model can tell dominant/frequent instincts apart from rarer ones, instead
// of treating every mode as equally central just because it's listed.
function summarizeDNAForIdeas(dna) {
  if (!dna) return "";
  const lines = [];
  if (dna.core_identity?.core_comedic_brain) lines.push(`Core comedic brain: ${dna.core_identity.core_comedic_brain}`);
  if (dna.core_identity?.one_sentence_summary) lines.push(`Summary: ${dna.core_identity.one_sentence_summary}`);

  const byStrengthDesc = (arr) => [...(arr || [])].sort((a, b) => (b.strength || 0) - (a.strength || 0));

  const instincts = byStrengthDesc(dna.strongest_comedic_instincts);
  if (instincts.length) {
    lines.push(
      "His comedic instincts, strongest/most frequent first — higher score means it's more central to his actual voice and should come up more often, not that lower-scored ones are wrong to use: " +
        instincts.map((i) => `${i.instinct} (${i.strength}/10) — ${i.description}`).join("; ")
    );
  }

  const modes = byStrengthDesc(dna.comedy_modes);
  if (modes.length) {
    lines.push(
      "His comedy modes, strongest/most frequent first — same weighting logic: lean toward the top of this list most of the time, but every mode here is genuinely him: " +
        modes.map((m) => `${m.name} (${m.strength}/10): ${m.description} [best for: ${(m.when_to_use || []).join(", ")}]`).join(" | ")
    );
  }

  if (dna.things_to_avoid?.length) lines.push("Avoid: " + dna.things_to_avoid.join("; "));
  if (dna.anti_patterns?.length) lines.push("Anti-patterns: " + dna.anti_patterns.join("; "));
  if (dna.ending_dna?.length) lines.push("Ending patterns: " + dna.ending_dna.join("; "));
  return lines.join("\n");
}

export const buildIdeaPrompt = (formatLabel, formatDesc, dna, avoidNotes = []) => {
  const dnaContext = dna
    ? `\n\nCOMEDY DNA — PRIMARY CREATIVE SOURCE:\n${summarizeDNAForIdeas(dna)}\n\nBuild the ideas from this creator's learned comedic brain first. The topic and format are the opportunity and container; they do not redefine his personality, voice, or comedic instincts. Let stronger patterns influence the set more often, but do not force a pattern when the situation does not naturally support it. These descriptions are behavioral guidance, not material to reuse: invent new situations rather than echoing their wording.`
    : "";

  const avoidBlock = Array.isArray(avoidNotes) && avoidNotes.length
    ? `\n\nAVOID LIST (HIGHEST PRIORITY):\n${avoidNotes.map((n) => `- ${typeof n === "string" ? n : n.note}`).join("\n")}\nEND AVOID LIST`
    : "";

  const creativeGuidance = dna
    ? `Use the learned DNA as the source of the creator's angle, behavior, voice, and comedic choices. Do not import a generic creator personality or generic comedy formula. Keep ideas specific and textured, at a believable everyday scale where appropriate to the learned voice.`
    : `He's a Confident Idiot at heart — says wrong, absurd, or unhinged things with complete certainty, and when challenged, gets more specific about being wrong instead of backing down. He's smart enough to construct increasingly elaborate defenses for something fundamentally stupid — that construction is part of the joke. Underneath that he's warm and a little chaotic, never mean. Sometimes the funniest version of him is dead calm while saying something completely insane. Taglish voice, Zeke Abella-coded — dumb on the surface, sharp underneath, deadpan enough that people can't always tell if he's serious. He riffs on personal life stuff, people-watching, and random hypotheticals. Things that genuinely get to him: fake deep people, annoyingly optimistic people, people who can't take a joke, people who overcomplicate simple stuff, confidently wrong people, overly serious people in casual moments, main-character-syndrome people, people who state the obvious like it's deep.`;

  return `You're helping a Filipino content creator come up with ideas for his next video in the "${formatLabel}"${formatDesc ? ` (${formatDesc})` : ""} format.

${creativeGuidance}${dnaContext}${avoidBlock}

Give him 5 ideas he could actually make into a ${formatLabel}. Make them specific and textured — not generic topics. Let the creator's learned behavior and comedic instincts determine what makes each idea distinctive.

Silently check each idea against the actual creator identity supplied above before including it. Replace ideas that feel generic or inconsistent with that identity. Do not force artificial variety at the expense of the creator's dominant patterns.

Return ONLY a JSON array of 5 objects — no markdown, no preamble, no explanation, no reasoning, nothing before or after the array itself.
Each: { "premise": "specific idea", "tone": "a short natural description of the vibe", "why": "one sentence why this fits him${dna ? " and his learned Comedy DNA" : ""}" }`;
};

export const buildTonePrompt = (topic, formatLabel, formatDesc, dna) => {
  const dnaContext = dna
    ? `\n\nCOMEDY DNA — PRIMARY CREATIVE SOURCE:\n${summarizeDNAForPrompt(dna, topic)}\n\nDescribe the tone that naturally emerges when this creator's learned voice meets this topic and format. Do not replace the learned voice with a generic vibe, personality, or comedy convention.`
    : "";
  const identity = dna
    ? "Use the creator's learned Comedy DNA as the source of his voice and comedic behavior."
    : "A Filipino content creator (confident-idiot energy, warm chaotic underneath, sometimes dead calm delivering insane statements, Taglish voice)";

  return `${identity} wants to make a "${formatLabel}"${formatDesc ? ` (${formatDesc})` : ""} about: "${topic}"${dnaContext}

What's the natural vibe for this specific piece? Describe how THIS creator should express his learned voice here, rather than selecting from a generic comedy style. Something like "play it totally confident" or "stay flat and unbothered" is fine when it genuinely follows from his learned DNA.

Return ONLY a JSON object, no markdown, no preamble.
{ "tone": "short 2-4 word natural tone description", "reason": "one honest sentence on why this fits" }`;
};

// NOTE: originalResult is passed through as whatever string the client is
// currently holding — the new JSON-schema output from buildScriptPrompt, OR
// (for scripts saved before this schema existed) the old plaintext format.
// The model is robust to reading either; asking it to always RETURN the new
// JSON schema means a refine on a legacy-format saved script transparently
// upgrades it, rather than needing a separate one-time migration.
export const buildRefinePrompt = (originalResult, feedback, dna, selectedMode) => {
  const dnaContext = dna
    ? `\n\nHis learned Comedy DNA is in play here — mode used: ${selectedMode || "unspecified"}. Preserve the comedic mode and instincts already at work unless his note specifically asks to change the delivery or energy.`
    : "";
  return `Here is a generated comedy bit for a Filipino content creator:

${originalResult}

He wants this change: "${feedback}"${dnaContext}

Make that change. Keep everything else about the bit that's already working — don't rewrite parts he didn't ask about. If he says "make the ending more abrupt," just fix the ending. If he says "make it more self-deprecating," find where that actually fits naturally without breaking the rest of it.

If the input above wasn't already in the JSON structure below (an older plain-text script), reconstruct it into that structure as part of this edit.

Return the improved bit as valid JSON with exactly this structure, no markdown, no explanation:
{
  "mode": "unchanged unless the note asks for a different comedic mode/energy",
  "style": "one line",
  "lang": "one line",
  "premise": "one sentence describing the comedy engine",
  "characters": [{"role":"who they're performing","trait":"one precise trait"}],
  "beats": ["beat 1","beat 2"],
  "script": "the full script",
  "shot_list": ["shot 1","shot 2"],
  "filming_difficulty": "Easy",
  "ending": "the final beat or line — leave empty if it ends on a cut, fizzle, or silence instead",
  "caption": "punchy caption under 150 characters",
  "hashtags": ["6-8 relevant hashtags, no # symbol"]
}
Leave "characters" and "shot_list" as empty arrays when they don't apply — never change the schema itself, only the content of fields that genuinely need to change.`;
};

export const buildSampleAnalysisPrompt = (scriptText, title, formatLabel, formatDesc) => `You are analyzing a comedy screenplay/script sample to understand a specific Filipino content creator's comedic instincts. This sample is titled: "${title || "Untitled"}"${formatLabel ? `\nFormat: ${formatLabel}${formatDesc ? ` (${formatDesc})` : ""} — factor in how this format's own conventions (pacing, structure, delivery) shape the piece, so you don't mistake a format convention for a personal comedic instinct.` : ""}

SCRIPT:
${scriptText}

Your job is to explain WHY this is funny — the underlying comedic decision-making — not just describe WHAT happens.

BAD: "The character switches cups around."
GOOD: "He turns a simple piece of information into an unnecessary competitive challenge, then commits to the challenge even after its premise has been destroyed."

Distinguish DEEP PATTERNS (confidently defending wrong logic, escalating commitment after a misunderstanding, calm reaction to absurdity, obsessing over the wrong detail, turning something simple into an unnecessary system, refusing to emotionally acknowledge chaos) from SURFACE PATTERNS (specific words, filler words, character names, locations, props, one-time phrases). Never mistake surface repetition for real personality.

Also pull one short "voice_clip" — 1-2 sentences of ORDINARY dialogue from this script, not the joke or punchline. Think: a normal line on the way to the bit, a dead stop, a code-switch, a flat reaction line. This is for calibrating cadence only, never for reuse — if you can't find a genuinely non-joke line, leave it as an empty string rather than reaching for something close to the punchline.

Return ONLY valid JSON, no markdown, no preamble, matching this exact structure:

{
  "summary": "one or two sentences on what this piece does",
  "representative_strength": 1-10,
  "primary_comedy_instinct": "the main thing driving the humor",
  "secondary_comedy_instincts": ["", ""],
  "comedy_sources": {
    "dialogue": 1-10,
    "behavior": 1-10,
    "reaction": 1-10,
    "misunderstanding": 1-10,
    "absurd_logic": 1-10,
    "observation": 1-10,
    "wordplay": 1-10,
    "physical_comedy": 1-10,
    "silence_or_awkwardness": 1-10
  },
  "character_logic": "how the main character justifies or processes what's happening",
  "core_misunderstanding": "what's misunderstood or misread, if applicable, else empty string",
  "delivery_style": "how this would be performed",
  "confidence_level": "description of how confident/unshaken the character is",
  "chaos_level": 1-10,
  "deadpan_level": 1-10,
  "setup_pattern": "how the piece opens/establishes",
  "escalation_pattern": "how it builds",
  "ending_pattern": "how it resolves or cuts",
  "what_makes_it_funny": "the real underlying comedic mechanism, in plain language",
  "best_comedic_decision": "the single sharpest choice in this script",
  "recurring_behavior_patterns": ["deep behavioral patterns, not surface words"],
  "comedy_mode_candidate": "a short name for the mode this represents, e.g. 'Deadpan Confident Idiot' or 'Observational Annoyance'",
  "surface_patterns_to_ignore": ["specific words/names/props that are one-off, not personality"],
  "notable_voice_traits": ["genuine voice traits worth preserving"],
  "voice_clip": "1-2 sentences of ordinary, non-joke dialogue from this script — empty string if none found",
  "things_this_sample_does_not_represent": ["comedy styles or instincts this sample does NOT demonstrate"],
  "training_notes": "anything useful for future generation"
}`;

export const buildDNASynthesisPrompt = (analyses, baseProfileSummary) => {
  const analysesText = analyses
    .map((a, i) => `SAMPLE ${i + 1} (${a.title || "Untitled"}):\n${JSON.stringify(a.analysis, null, 0)}`)
    .join("\n\n");

  return `You are synthesizing a structured "Comedy DNA" for a specific Filipino content creator, based on individual analyses of his real scripts.

BASE IDENTITY ALREADY ESTABLISHED (do not contradict this without strong evidence — refine it, don't replace it):
${baseProfileSummary}

INDIVIDUAL SCRIPT ANALYSES:
${analysesText}

Your job:
- Treat FORMAT as contextual metadata, NOT a scope boundary: every sample contributes evidence about the creator's overall comedic DNA, regardless of which format it came from.
- Separate transferable creator instincts from format-specific conventions. A behavior that only exists because a format requires it should not automatically become a creator trait. Conversely, a deep comedic instinct discovered in one format should remain available when generating other formats.
- Identify repeated DEEP patterns across samples (ignore surface patterns like repeated words/names/props unless they represent something deeper)
- Identify his strongest comedic instincts
- Identify whether there are multiple legitimate comedy modes — different ways he expresses the same comedic brain in different contexts
- If samples conflict (e.g. some are deadpan, some are chaotic), determine whether these are genuine contradictions or two contextual modes that both belong to him. Prefer specific contextual explanations over bland averaging.
- Classify unusual samples as core, secondary mode, or outlier/experimental — do not force everything into one identity
- Do NOT let this cause literal copying of dialogue, names, or phrases from the samples — this is about instincts and decision-making, not surface material

Return ONLY valid JSON, no markdown, no preamble, matching this exact structure:

{
  "core_identity": {
    "one_sentence_summary": "",
    "core_comedic_brain": "the real underlying mechanism of how he finds things funny",
    "confidence_vs_self_awareness": "",
    "emotional_energy": ""
  },
  "strongest_comedic_instincts": [
    { "instinct": "", "strength": 1-10, "description": "", "evidence_pattern": "" }
  ],
  "comedy_modes": [
    {
      "name": "",
      "description": "",
      "when_to_use": ["situations/topics where this mode fits"],
      "primary_instincts": [""],
      "delivery_style": "",
      "escalation_style": "",
      "best_formats": [""],
      "strength": 1-10
    }
  ],
  "preferred_comedy_sources": {
    "dialogue": 1-10, "behavior": 1-10, "reaction": 1-10, "misunderstanding": 1-10,
    "absurd_logic": 1-10, "observation": 1-10, "wordplay": 1-10,
    "physical_comedy": 1-10, "silence_or_awkwardness": 1-10
  },
  "character_logic_patterns": [""],
  "preferred_escalation_patterns": [""],
  "preferred_scene_structures": [""],
  "delivery_dna": {
    "natural_energy": "", "deadpan_usage": "", "confidence_usage": "",
    "chaos_usage": "", "dialogue_rhythm": ""
  },
  "ending_dna": [""],
  "voice_traits": [""],
  "things_to_avoid": [""],
  "anti_patterns": [""],
  "contradictions_or_contextual_modes": ["explain apparent contradictions as contextual modes where possible"],
  "training_confidence": 1-10,
  "training_summary": "a few sentences a human would actually want to read, summarizing what was learned"
}`;
};

// Incremental update: merge only the NEW samples' analyses into the EXISTING DNA,
// instead of re-sending every analyzed sample ever added. Keeps token cost proportional
// to what changed, not to the total corpus size.
export const buildDNAUpdatePrompt = (existingDNA, newAnalyses) => {
  const newAnalysesText = newAnalyses
    .map((a, i) => `NEW SAMPLE ${i + 1} (${a.title || "Untitled"}):\n${JSON.stringify(a.analysis, null, 0)}`)
    .join("\n\n");

  return `You previously synthesized a structured "Comedy DNA" for a Filipino content creator. Here it is:

EXISTING COMEDY DNA:
${JSON.stringify(existingDNA, null, 0)}

He has now added ${newAnalyses.length} new script sample${newAnalyses.length === 1 ? "" : "s"} that were NOT part of the existing DNA above:

${newAnalysesText}

Your job: update the existing DNA to account for these new samples — do NOT start over or discard what's already there.
- Treat each sample's FORMAT as contextual metadata, not a scope boundary. New evidence from any format can strengthen, refine, or add to the creator-wide DNA. Only keep a pattern format-specific when the evidence indicates it is genuinely caused by that format's conventions.
- If a new sample confirms an existing instinct/mode, you may nudge its strength score slightly (don't inflate scores just because a sample repeats it).
- If a new sample reveals a genuinely new instinct or comedy mode not already captured, add it.
- If a new sample seems to conflict with the existing DNA, treat it as a possible contextual mode (like the original synthesis would) rather than overwriting settled patterns based on one data point.
- Leave fields untouched if the new samples don't say anything new about them.
- Keep the same JSON structure as the existing DNA exactly — same keys, same shape.

Return ONLY the full updated JSON object, no markdown, no preamble, matching the exact same structure as the existing DNA shown above.`;
};

export const buildModeSelectionPrompt = (format, topic, context, suggestedVibe, dna) => `You are selecting the best comedic approach for a specific script request, based on a Filipino content creator's learned Comedy DNA.

FORMAT: ${format}
TOPIC: ${topic}
${context ? `EXTRA CONTEXT: ${context}` : ""}
${suggestedVibe ? `SUGGESTED VIBE: ${suggestedVibe}` : ""}

HIS COMEDY DNA:
${summarizeDNAForPrompt(dna, `${topic || ""} ${context || ""}`)}

Pick the mode and instincts that give THIS topic the best natural comedic opportunity. Do not default to his strongest overall instinct if it doesn't fit this specific topic — pick what's appropriate, not just what's strongest. Different topics deserve different expressions of his comedic brain.

Return ONLY valid JSON, no markdown, no preamble:
{
  "selected_mode": "",
  "secondary_mode": "",
  "reason": "",
  "primary_instincts": [""],
  "avoid": [""],
  "escalation_direction": "",
  "delivery_direction": ""
}`;

// Narrows the creator's full set of analyzed voice clips down to the `keep`
// most relevant to this specific topic/context, so the prompt isn't padded
// with clips that have nothing to do with what's being written. Relevance is
// plain word-overlap against `query` — cheap and good enough since these are
// short, plain-language clips, not the DNA's structured strength scores that
// strongestFirst() above trims by. Falls back to the first `keep` clips (in
// their existing order) when the topic/context give no usable words to match
// against, rather than pretending some are more relevant than others.
function trimVoiceClipsByRelevance(items, keep, query, getText = (item) => item) {
  if (!Array.isArray(items) || items.length <= keep) return items || [];

  const queryWords = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  if (queryWords.length === 0) return items.slice(0, keep);

  return items
    .map((item, i) => {
      const text = String(getText(item) || "").toLowerCase();
      const score = queryWords.reduce((sum, w) => sum + (text.includes(w) ? 1 : 0), 0);
      return { item, i, score };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, keep)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.item);
}

// Combined script generation: when DNA exists, mode selection happens inline in this
// same prompt/call instead of a separate request beforehand. The model is asked to
// name the mode it picked on a MODE: line so the client can still show/reuse it,
// without paying for a second round trip.
export const buildScriptPrompt = (formatLabel, formatDesc, topic, context, suggestedTone, dna, avoidNotes = [], voiceClips = []) => {
  const dnaBlock = dna
    ? `\n\nHis learned Comedy DNA (HIGHEST CREATIVE PRIORITY — the primary determinant of what this creator would naturally find funny; overrides general defaults, generic flavor definitions, and topic-first assumptions where they conflict; from real script analysis, abstract patterns, not joke material; invent independently from the underlying instinct, never retrieve or reword a specific past joke/premise):\n${summarizeDNAForPrompt(dna, `${topic || ""} ${context || ""} ${formatLabel || ""}`)}\n\nBefore writing, silently pick whichever comedy mode/instinct from his DNA gives THIS specific topic the best natural comedic opportunity — don't default to his strongest overall instinct if it doesn't fit. Report the mode name you picked in the "mode" field of your JSON output.`
    : "";

  const clips = Array.isArray(voiceClips) ? voiceClips.filter(Boolean) : [];
  const trimmedClips = trimVoiceClipsByRelevance(clips, 2, `${topic || ""} ${context || ""}`, (c) => c);
  const voiceClipBlock = trimmedClips.length
    ? `\n\nReal ordinary lines of his, for cadence only — NOT jokes, NOT material, do not reuse the wording, the premise, or the bit these came from. Just calibrate how he breathes and pauses:\n${trimmedClips.map((c) => `- "${c}"`).join("\n")}`
    : "";

  const avoidBlock = Array.isArray(avoidNotes) && avoidNotes.length
    ? `\n\n═══ AVOID LIST (HIGHEST PRIORITY) ═══\nThese are explicit negative lessons from previous disliked outputs. Do not use these joke mechanisms, premises, tones, or patterns unless the user explicitly asks for one:\n${avoidNotes.map((n) => `- ${typeof n === "string" ? n : n.note}`).join("\n")}\n═══ END AVOID LIST ═══`
    : "";

  const angleDiscoveryBlock = dna
    ? `

Before writing, silently explore several genuinely different interpretations of the request. Generate candidate angles from the creator's learned DNA — including different learned instincts, behaviors, contradictions, delivery patterns, or structures where relevant — then choose the one that most naturally expresses THIS creator in THIS request. Do not manufacture variety by importing generic comedy conventions. The topic is the opportunity; DNA determines the comedic lens. Only after choosing the strongest DNA-faithful angle should you write the piece.`
    : `

Before writing, silently run this — don't show your work, just use the result:
1. Name the obvious joke a generic comedy AI would make about this topic. Set it aside.
2. Come up with at least 4 genuinely different premises — different ideas, not different phrasings of the same one. Pull from different sources so they're actually distinct: one from an odd detail most people would skim past, one from character logic, one from taking something ordinary far more seriously than it deserves, one from an unexpected connection to something unrelated.
3. For each candidate, ask: does this create funny BEHAVIOR, or just a funny line sitting on top of a flat situation? Behavior wins.
4. Pick the one that's most surprising while still being something the creator would genuinely think — not the loudest one. If every candidate still feels generic, keep going before settling.
Only after that, write the scene from the winning premise.`;

  const identityGuidance = dna
    ? `Write from the supplied Comedy DNA. Stay recognizably this creator, while allowing the DNA to determine the joke mechanism, behavior, delivery, pacing, escalation, structure, and ending when those are part of the learned voice. Do not import a generic comedic personality or aesthetic. Treat the Avoid List as a hard constraint.`
    : `Write the script. Stay recognizably him, but don't force the same joke mechanism every time — same person, not the same script. Treat the Avoid List as a hard constraint.`;

  return `Format: ${formatLabel}${formatDesc ? ` — ${formatDesc}` : ""}
Topic: ${topic}
${suggestedTone ? `Vibe: ${suggestedTone}` : ""}
${context ? `Extra context: ${context}` : ""}${dnaBlock}${voiceClipBlock}${avoidBlock}${angleDiscoveryBlock}

${identityGuidance}

He performs solo — sometimes as himself, sometimes switching between multiple characters/personas within the same bit (a landlord, a friend, a version of himself from another angle). Leave "characters" as an empty array when he's just talking as himself; populate it when the bit genuinely involves him performing distinct personas.

FORMAT-SPECIFIC RULES (these define the selected format's required shape):
- One-Liner: a single sharp thought or observation, straight to camera — no setup, no scene, no supporting characters. This is the one format where the escalation instinct does NOT apply; resist turning it into a mini-scene. "beats" should be empty or at most one item — there's no buildup to break into beats.
- Rant: a genuine complaint about something specific he's actually annoyed by, straight to camera, no scene, no other characters. The escalation here is emotional — rising irritation/intensity about the SAME grievance — not a chain of increasingly absurd plot logic or new twists. It should read like venting, not storytelling.
- Text Overlay: this is Couple's Text Overlay format adapted for one performer — visual storytelling, short on-screen text beats/observations carrying the narrative while he's shown doing the actual behavior, minimal-to-no spoken dialogue. Do NOT write it as a conversation or have him talk through what the text is already saying.
- Roast: a specific, named target — a type of person, a habit, a friend, a situation, or himself — never a vague "people who..." with no real subject. Straight to camera, no scene. The escalation here is a string of distinct, specific burns about the SAME target, each sharper or more precise than the last, rather than one narrative arc with a single payoff at the end — think consecutive jabs, not a story. Still bound by the profile's own rule: genuinely clever, never just mean, and he's always a fair target for it too.

Leave "shot_list" and "filming_difficulty" empty unless blocking/filming actually matters for this format (mainly Skit — not One-Liner/Rant/Roast/Text Overlay). Leave "ending" empty if the bit ends on a cut, fizzle, or silence instead of a distinct line — do not invent a closing line just to fill the field.

Return ONLY valid JSON, no markdown, no commentary:
{
  "mode": "${dna ? "the comedy mode/instinct you picked" : ""}",
  "style": "one line describing the delivery style used (e.g. 'dead calm, confidently wrong')",
  "lang": "one line describing the language mix used (e.g. 'Taglish, mostly English')",
  "premise": "one sentence describing the comedy engine",
  "characters": [{"role":"who he's performing","trait":"one precise trait"}],
  "beats": ["beat 1","beat 2","beat 3"],
  "script": "Full filmable script. Natural dialogue/narration and minimal essential stage directions in brackets. For Text Overlay, each text beat on its own line instead of dialogue.",
  "shot_list": ["shot 1","shot 2"],
  "filming_difficulty": "Easy",
  "ending": "the final beat or line",
  "caption": "punchy caption under 150 characters for posting this",
  "hashtags": ["6-8 relevant hashtags, no # symbol"]
}`;
};

export const buildAvoidNotePrompt = (script, reason = "") => `You are converting a user's negative reaction to a generated comedy script into one durable, concrete instruction for future generations.

GENERATED SCRIPT:
${script}

${reason.trim() ? `WHAT THE USER SAID DIDN'T WORK:\n${reason.trim()}` : "The user only gave a thumbs-down and no written explanation. Infer the most useful specific reason from the script itself, but do not invent a complaint that is not supported by the script."}

Write ONE concise sentence (roughly 8–25 words) describing what future scripts should avoid. Make it behavioral and reusable, not a summary of this particular script. Do not mention the user, this script, or the fact that it received a thumbs-down.

Return ONLY the sentence, with no quotes, bullets, markdown, or preamble.`;


export const buildCoupleIdeaPrompt = (formatLabel, formatDesc, dna, avoidNotes = []) => {
  const dnaContext = dna
    ? `\n\nCOMEDY DNA — PRIMARY CREATIVE SOURCE:\n${summarizeDNAForPrompt(dna, formatLabel || "")}\n\nBuild these situations from this couple's learned relationship, character behavior, humor, and delivery first. The format and situation scale provide the container; they do not redefine the couple's identity. Stronger patterns can recur naturally; do not force artificial variety.`
    : "";
  const avoidBlock = Array.isArray(avoidNotes) && avoidNotes.length
    ? `\n\nAVOID LIST:\n${avoidNotes.map((n) => `- ${typeof n === "string" ? n : n.note}`).join("\n")}`
    : "";
  const guidance = dna
    ? "Make each idea specific, filmable, and rooted in whatever relationship behavior the learned DNA supports. Do not substitute generic couple-comedy conventions for learned behavior."
    : "Each idea must be specific, filmable, and rooted in recognizable relationship behavior rather than generic sitcom conflict. Keep every idea at a believable, everyday scale.";
  return `Suggest 5 distinct couple comedy situations for a ${formatLabel || "couple comedy"}${formatDesc ? ` (${formatDesc})` : ""}.${dnaContext}${avoidBlock}

${guidance} If two ideas share a learned dynamic, that is acceptable when the actual situation is different.

Silently check each idea against the specific couple identity supplied above. Replace anything generic or inconsistent with that identity. Do not write out this checking process.

Return ONLY a JSON array, no markdown, no preamble, no explanation, no reasoning, nothing before or after the array itself.
Each item: { "premise": "specific relatable situation, 1-2 sentences", "vibe": "short natural vibe/tone", "why": "one sentence explaining why this fits this couple" }`;
};

export const buildCoupleVibePrompt = (situation, vibes, dna = null) => {
  const dnaBlock = dna
    ? `\n\nCOMEDY DNA — PRIMARY CREATIVE SOURCE:\n${summarizeDNAForPrompt(dna, situation)}\n\nChoose the available vibe that best expresses this couple's learned comedic identity in this situation. Interpret the available choices through the DNA; do not let a generic vibe meaning override learned behavior.`
    : "";
  return `A couple wants to make short comedy content about this situation: "${situation}"${dnaBlock}

Pick the single best-fitting vibe from this list for this specific situation:
${vibes}

Return ONLY a JSON object, no markdown, no preamble.
{ "vibeId": "one of the ids above", "reason": "one honest sentence on why this fits" }`;
};

export const buildCoupleTonePrompt = (situation, formatLabel, formatDesc, creativeDna = "", dna = null) => {
  const dnaBlock = dna
    ? `\n\nCOMEDY DNA — PRIMARY CREATIVE SOURCE:\n${summarizeDNAForPrompt(dna, situation)}\n\nBase the suggested tone on this couple's learned voice first. The situation and format determine expression, not identity.`
    : "";
  return `A couple comedy creator is about to make a ${formatLabel || "couple comedy"}${formatDesc ? ` (${formatDesc})` : ""} about this situation: "${situation}"

${creativeDna ? `Their current Audience & Tone note: "${creativeDna}"` : "They haven't set an Audience & Tone note yet."}${dnaBlock}

Suggest a short, concrete Audience & Tone note that is faithful to the supplied couple identity. Keep it under 20 words.

Return ONLY a JSON object, no markdown, no preamble.
{ "tone": "short concrete audience & tone note", "reason": "one honest sentence on why this fits" }`;
};

export const buildCoupleScriptPrompt = ({ formatLabel, formatDesc, situation, vibe, location, personalityContrast, dynamic, intensity, flavor, blueprint, creativeDna, dna, avoidNotes = [] }) => {
  const vibeObj = vibe;
  const lines = [];
  if (situation?.trim()) lines.push(`SITUATION: ${situation.trim()}`);
  else lines.push("No situation provided. Invent a highly relatable everyday couple situation that fits the selected settings.");
  if (vibe && vibe !== "surprise-me") lines.push(`HUMOR MECHANISM: ${vibeObj}`);
  else lines.push("AI INSTRUCTION: Choose the humor mechanism that best fits this situation.");
  lines.push(`FORMAT: ${formatLabel}${formatDesc ? ` — ${formatDesc}` : ""}`);
  if (location && location !== "ai") lines.push(`LOCATION: ${location}`);
  if (personalityContrast) lines.push(`PERSONALITY CONTRAST: ${personalityContrast}`);
  if (dynamic && dynamic !== "ai") lines.push(`RELATIONSHIP DYNAMIC: ${dynamic}`);
  if (intensity) lines.push(`INTENSITY: ${intensity}`);
  if (flavor) lines.push(`FLAVOR/TONE: ${flavor}`);
  if (blueprint && blueprint !== "ai") lines.push(`NARRATIVE BLUEPRINT: ${blueprint}`);
  if (creativeDna?.trim()) lines.push(dna
    ? `CREATOR STYLE NOTES (subordinate to Comedy DNA): ${creativeDna.trim()}\nThese notes may influence the result only where they are consistent with the learned Comedy DNA; they do not override or redefine the learned comedic identity.`
    : `CREATOR STYLE NOTES: ${creativeDna.trim()}`);
  if (dna) lines.push(`\nCOMEDY DNA (highest priority — overrides the general comedy profile's defaults and any lower-priority creative notes where they genuinely conflict; this couple's own learned instincts, not a bank of lines to reuse):\n${summarizeDNAForPrompt(dna, `${situation || ""} ${formatLabel || ""} ${flavor || ""}`)}\nEND COMEDY DNA\nThis does not extend to the JSON schema/output format or the Avoid List, which still apply regardless of DNA.`);
  if (avoidNotes.length) lines.push(`\nAVOID LIST (hard constraint):\n${avoidNotes.map((n) => `- ${typeof n === "string" ? n : n.note}`).join("\n")}\nEND AVOID LIST`);
  const dnaGenerationGuidance = dna
    ? `Before writing, silently explore several possible premises through the couple's learned DNA. Choose the angle, behavior, relationship dynamic, dialogue rhythm, escalation, structure, and ending that most naturally express THIS couple in THIS situation. Do not import generic couple-comedy conventions to fill gaps. Interpret any selected mechanism, flavor, setting, or blueprint through the learned DNA rather than treating its generic meaning as a creative rule.

Write one coherent, filmable piece. Do not mechanically demonstrate every setting. The learned DNA determines how the comedy behaves; the requested format and technical requirements determine the container. Avoid List and output schema remain hard constraints.`
    : `Before writing, silently:
1. Identify the obvious generic couple joke and reject it.
2. Generate several distinct behavior-driven premises.
3. Choose the one most specific to this relationship and settings.
4. Make escalation arise from character logic, not random events.

Write one coherent, filmable piece. Do not mechanically demonstrate every setting. Do not explain the joke. Keep dialogue natural, clipped, and specific. Prefer behavior/reactions over exposition. The ending must land through a final action, realization, reversal, silence, or doubling-down.`;

  return lines.join("\n") + `\n\n${dnaGenerationGuidance}

Return ONLY valid JSON, no markdown, no commentary:
{
  "title": "Short intriguing title that does not give away the joke",
  "hook": "Exact first 2-3 seconds — the specific opening moment or line",
  "characters": [{"role":"Partner A","trait":"One precise trait"},{"role":"Partner B","trait":"One precise trait"}],
  "premise": "One sentence describing the comedy engine",
  "setup": "Start in the middle of the situation",
  "beats": ["Beat 1","Beat 2","Beat 3","Beat 4"],
  "script": "Full filmable script. Natural dialogue and minimal essential physical actions in brackets. For Text Overlay, each text beat on its own line instead of dialogue — never a back-and-forth transcript.",
  "visual_actions": ["Physical comedy moment 1","moment 2"],
  "shot_list": ["Shot 1","Shot 2","Shot 3"],
  "estimated_runtime": "e.g. 15-25 seconds",
  "filming_difficulty": "Easy",
  "props": [],
  "ending": "The final comedic beat",
  "caption": "Punchy caption under 150 characters",
  "hashtags": ["couplecomedy","relatable"]
}`;
};

export const buildCoupleRefinePrompt = (originalResult, feedback, dna) => `Here is a generated couple-comedy concept:

${originalResult}

The creator wants this change: "${feedback}"
${dna ? `\nThe couple's learned Comedy DNA is the HIGHEST CREATIVE PRIORITY. Preserve its strongest learned instincts and relationship logic; use the creator's feedback to modify the piece without replacing that learned identity with generic couple comedy.` : ""}

Make ONLY the requested change. Preserve everything else that already works. Return the improved concept as valid JSON with exactly the same structure. No markdown or explanation.`;


// Couple-specific avoid-note distillation. Deliberately NOT an alias of Solo's
// buildAvoidNotePrompt: the input here is a Couple JSON concept (title/hook/
// beats/script/etc, not a plain script string), and the instruction should
// steer toward relationship/character-logic and format language rather than
// Solo's screenplay framing.
export const buildCoupleAvoidNotePrompt = (script, reason = "") => `You are converting a couple-content creator's negative reaction to a generated couple-comedy concept into one durable, concrete instruction for future generations.

GENERATED COUPLE COMEDY CONCEPT:
${script}

${reason.trim() ? `WHAT THE CREATOR SAID DIDN'T WORK:\n${reason.trim()}` : "The creator only gave a thumbs-down and no written explanation. Infer the most useful specific reason from the concept itself — relationship dynamic, character contrast, escalation, format fit, or ending — but do not invent a complaint that is not supported by the concept."}

Write ONE concise sentence (roughly 8–25 words) describing what future couple-comedy concepts should avoid. Make it behavioral and reusable across situations — about relationship dynamics, character logic, escalation, or format fit — not a summary of this particular concept. Do not mention the creator, this concept, or the fact that it received a thumbs-down.

Return ONLY the sentence, with no quotes, bullets, markdown, or preamble.`;

// Couple generator profile intentionally mirrors Solo's backend prompt architecture while remaining Couple-specific.
// Builds the couple-specific relationship/voice layer. With no DNA, this
// returns the exact static relationship dynamics + flavor + mechanism text that
// existed before adaptive profiles. With DNA, those generic definitions are
// fully replaced by this couple's learned patterns.
// Builds the couple-specific relationship/voice layer. With no DNA, this
// returns the exact static relationship dynamics + flavor + mechanism text that
// existed before adaptive profiles. With DNA, those generic definitions are
// fully replaced by this couple's learned patterns.
// Builds the couple-specific relationship/voice layer. With no DNA, this
// returns the exact static relationship dynamics + flavor + mechanism text that
// existed before adaptive profiles. With DNA, those generic definitions are
// fully replaced by this couple's learned patterns.
export function buildCoupleVoiceBlock(dna) {
  const fixedDecisionLayer = dna
    ? `GENERATION DISCIPLINE:
Create original material from this couple's learned DNA and the current request. Do not copy or lightly reword training samples. Let the couple's learned relationship, character logic, pacing, escalation, delivery, and structural preferences determine the comedy. Do not substitute generic couple-comedy conventions for learned behavior.

DIALOGUE / ACTION:
Make dialogue and physical action serve the learned couple DNA. Use whatever rhythm, amount of dialogue, explicitness, subtext, visual behavior, escalation, and ending style the DNA supports. Do not impose a generic dialogue or escalation aesthetic.`
    : `COMEDIC DECISION LAYER (do this silently, never show your work):
Before writing dialogue, work out: what's actually happening; what does each person genuinely want; what does each person believe; where do those beliefs or goals collide; what's the most interesting contradiction; what would these two specific people naturally do about it; what's the funniest believable consequence; where should it escalate, and where should it stop. This is a comedic decision, not a punchline you're assembling backward from — the scene should feel like it grew out of the collision, not like a joke that got a setup built for it.

NATURAL DIALOGUE:
Use contractions, interruptions, unfinished thoughts, short answers, "what?", "nothing.", "okay.", "I didn't say that.", silence. Annoyed people rarely explain themselves.
Bad: "I feel like you don't respect my boundaries."
Better: "Did you move my charger?" / "Which one?" / "The one I was using." / "You weren't using it." / "I was about to."
If a line feels written, shorten it. If everyone sounds equally witty, fix the voices. Not every line needs to be funny. Sometimes the funniest line is completely ordinary.

SUBTEXT: Characters do not explain the joke. If someone is angry: "I'm fine." Not: "I am angry because..." If someone is losing an argument, they change the subject.

VISUAL COMEDY — look for: staring without speaking, slowly putting something down, walking away mid-sentence, opening the fridge again, silently handing someone an object, refusing eye contact, continuing an activity while arguing, immediately changing behavior after being caught, one person already knowing what's happening. Use physical behavior whenever it's funnier than another line of dialogue. Do not overload the script with stage directions. The camera observes; it does not editorialize.

ESCALATION: Comes from what already happened. Every step should feel like "of course they would do that." Not random. The ending should feel inevitable in hindsight.`;
  if (!dna) return `RELATIONSHIP DYNAMICS (infer, don't force):
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

COMEDY FLAVORS:
DRY/DEADPAN: The lack of reaction is the joke. Awkward silence can be the punchline. No exaggerated sitcom reactions. One person can say something absurd while the other responds completely seriously.
PETTY: Tiny inconsistencies. Selective memory. Scorekeeping. Technically correct arguments. Quiet revenge. Exposing hypocrisy. The more specific, the funnier. Never genuinely cruel.
CHAOTIC: Start ordinary. One bad decision causes another. Characters become increasingly committed to a stupid position. Chaos must have internal logic — do not insert random weirdness.
WHOLESOME: Warmth through behavior, not speeches. Never cheesy. Never sentimental.
AWKWARD: Silence, hesitation, failed recovery, things left unsaid, secondhand embarrassment.
COMPETITIVE: A meaningless situation becomes a serious contest because neither person wants to lose.
SARCASTIC: Dry observations, literal responses to rhetorical questions, controlled irritation. No constant one-liners.

HUMOR MECHANISM (when the request includes one — this defines the structural engine of the piece, not just its tone; a name-only label is not enough on its own):
- Bait & Switch: the setup must genuinely make the viewer think the video is going somewhere else. The BAIT looks romantic, emotional, serious, or important. The SWITCH reveals the real issue is mundane, petty, or extremely couple-specific. Build the entire video around the misleading setup and the deflating reveal, not just a funny last line. Examples: slow romantic music + serious approach → "We need to talk." → who reorganized the snack drawer; looks like a proposal → he found a parking spot in front of the restaurant; she gets emotional → he asked if she wanted the last bite. Only structure a video this way when Bait & Switch is the selected mechanism — most situations should NOT be forced into a misleading setup.
- Expectation vs Reality: state the specific expectation explicitly (a plan, an image, a belief one of them walked in with), then let reality contradict it beat-by-beat, point-for-point. Not a vague "it didn't go well" — each expected beat needs its matching real-world letdown.
- Petty: the PETTY comedy flavor above (scorekeeping, technically-correct arguments, quiet revenge, selective memory) is the actual mechanism driving the scene, not a mood layered on top of some other plot.
- Deadpan: the DRY/DEADPAN flavor above is the mechanism — one person's flat non-reaction against the other's escalating behavior or stimulus is what generates the comedy, not just flat line delivery throughout.
- Personality Clash: pick two distinct, specific traits and let both play out fully and consistently within the same situation. The joke is the incompatibility itself — neither person is "right," and it's not one person being chaotic while the other simply reacts normally.
- Chaos: the CHAOTIC flavor above is the mechanism — one bad decision causes the next, with real internal logic connecting each step, not random unrelated events.
- Surprise Me: choose whichever mechanism above genuinely fits the situation best; don't default to the same one every time.`;

  const core = dna.core_identity || {};
  const relationship = core.relationship_comedic_dynamic ||
    "This couple's relationship dynamic should be inferred from their learned patterns rather than imposed from a stock couple archetype.";
  const relationshipPatterns = Array.isArray(dna.relationship_logic_patterns) ? dna.relationship_logic_patterns : [];
  const characterPatterns = Array.isArray(dna.character_logic_patterns) ? dna.character_logic_patterns : [];
  const modes = Array.isArray(dna.comedy_modes) ? dna.comedy_modes : [];
  const logic = [...relationshipPatterns, ...characterPatterns].filter(Boolean);
  const logicText = logic.length ? `
Learned relationship/character logic: ${logic.join("; ")}.` : "";

  const flavorText = modes.length
    ? modes.map((m) => {
        const name = m.name || "Unnamed mode";
        const description = m.description || "A learned comedic mode from this couple's actual material.";
        const when = Array.isArray(m.when_to_use) && m.when_to_use.length ? ` Best when: ${m.when_to_use.join(", ")}.` : "";
        const delivery = m.delivery_style ? ` Delivery: ${m.delivery_style}.` : "";
        const escalation = m.escalation_style ? ` Escalation: ${m.escalation_style}.` : "";
        return `${name}: ${description}${when}${delivery}${escalation}`;
      }).join("\n")
    : "No specific comedy modes were learned strongly enough to define separate flavor labels; derive the tone from the couple's established relationship and character logic.";

  const mechanismText = modes.length
    ? modes.map((m) => {
        const name = m.name || "Unnamed mode";
        const description = m.description || "Use this learned mode according to the couple's actual behavior.";
        const instincts = Array.isArray(m.primary_instincts) && m.primary_instincts.length ? ` It draws especially on: ${m.primary_instincts.join(", ")}.` : "";
        const formats = Array.isArray(m.best_formats) && m.best_formats.length ? ` Best formats: ${m.best_formats.join(", ")}.` : "";
        return `- ${name}: ${description}${instincts}${formats}`;
      }).join("\n")
    : "- Use the couple's established relationship and character logic to choose and construct the structural mechanism; do not substitute a stock definition.";

  return `RELATIONSHIP DYNAMICS (learned from this couple):
${relationship}${logicText}

${fixedDecisionLayer}

COMEDY FLAVORS:
${flavorText}

HUMOR MECHANISM (learned structural engines for this couple):
${mechanismText}

When couple DNA exists but does not cover a flavor or mode the request calls for, construct that flavor or mode from this couple's actual established voice and instincts elsewhere in the DNA rather than reaching for a stock definition.`;
}

export const buildCoupleComedyProfile = (dna) => {
  if (dna) {
    return `You are a short-form couple-content writer and comedy director.

${buildCoupleVoiceBlock(dna)}

═══════════════════════════════════════════
FIXED CORE — ONLY NON-NEGOTIABLE GENERATION REQUIREMENTS
═══════════════════════════════════════════

OUTPUT / FORMAT: Return the requested JSON schema and follow the selected format's technical requirements. Format is a constraint on the shape of the output, not a source of comedic voice.

SAFETY / BRAND: Follow applicable safety, platform, and brand constraints. The hard Avoid List remains non-negotiable.

GENERATION DISCIPLINE: Create original, filmable material for the current request. Do not copy, lightly reword, or retrieve jokes, lines, premises, or situations from training samples. Keep the requested situation usable and coherent without replacing learned couple behavior with generic comedy conventions.

DNA AUTHORITY: The supplied Couple Comedy DNA is the primary source of this couple's comedic voice, relationship logic, character behavior, humor mechanisms, pacing, escalation, delivery, structure, and creative preferences. The current situation, settings, and format determine where/how that DNA is expressed; they do not replace it. If learned DNA supports an unconventional choice, follow the learned pattern rather than a generic rule about couple comedy. If a requested flavor or mode is not explicitly learned, construct it from this couple's established DNA rather than a stock definition.

FORMAT-SPECIFIC TECHNICAL REQUIREMENTS:
ACTED SKIT: Use the requested JSON fields and make the result filmable.
TEXT OVERLAY: On-screen text and visual action carry the piece; do not turn it into a normal dialogue transcript. This is a format requirement, while the couple's learned DNA determines the actual style, rhythm, and behavior within it.

SETTINGS: Treat selected settings as inputs to the current request. Do not mechanically force them in if doing so conflicts with the couple's learned behavior.

OUTPUT: Return ONLY valid JSON. No markdown fences. No commentary outside the JSON.
`;
  }

  return `You are a short-form couple-content writer and comedy director.

Your job is NOT to write generic "TikTok comedy," sitcom dialogue, polished stand-up jokes, or content that sounds AI-generated.

Your job is to create short, highly relatable, filmable couple content that feels like something a real couple accidentally captured on camera.

The viewer should recognize the behavior immediately and think: "THAT IS SO US."

CHARACTER LOGIC CREATES THE COMEDY.
Do not start with "What joke can I make?" Start with "What would THIS person naturally do?"
A petty person was already going to be petty. A literal person genuinely misunderstands. A competitive person turns something meaningless into a competition. An overthinker creates a problem from nothing. A calm person becomes funnier by refusing to react. The humor comes from the collision between personalities.

${buildCoupleVoiceBlock(dna)}

FLAVOR/TONE VS HUMOR MECHANISM: these are different axes if both are provided. A selected Humor Mechanism is a creative input, not a higher authority than learned Comedy DNA. When Couple Comedy DNA exists, interpret the selected mechanism through the couple's learned instincts and structural preferences; if its generic definition conflicts with the learned DNA, the DNA wins. Flavor/Tone likewise colors the delivery without redefining the learned identity. If settings pull against the DNA, preserve the DNA-consistent behavior and use the setting only where it can coexist naturally.

FORMAT:
ACTED SKIT: Dialogue, reactions, physical behavior, character contrast, timing, escalation, visual beats.
TEXT OVERLAY: Visual storytelling, short on-screen text beats, recognizable observations, minimal spoken dialogue. Do NOT generate a normal conversation when Text Overlay is selected.

TEXT OVERLAY — OVERRIDES THE ABOVE WHERE THEY CONFLICT:
This is not a normal conversation with captions added. On-screen text beats/observations carry the narration; the two people are shown reacting — through behavior, glances, synced or contrasting physical action — not through spoken exchange.
- Do NOT use the natural-dialogue examples above (no "Did you move my charger?" back-and-forth). If a line must be spoken, it's rare, short, and secondary to the text.
- If Bait & Switch is the selected mechanism, the switch is delivered by a text beat or a visual reveal, not a spoken line — bait text/visual → switch text/visual.
- COMEDY FLAVORS translate to visible behavior or the text itself, not dialogue: PETTY's "quiet revenge" is something one of them visibly does; SARCASTIC's "dry observation" is the on-screen text, not a line either partner says aloud.
- shot_list/filming_difficulty stay active — two people's physical reactions still need to be blocked and filmed, unlike Solo's version.
- script field: each text beat on its own line, paired with what the two of them are shown doing underneath it. Never format it as a back-and-forth transcript.

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
};

// ─── Couple structured Comedy DNA pipeline ──────────────────────────────────
// Couple DNA intentionally uses the same structured shape as Solo so both
// generators learn, update, and retrieve comedy instincts the same way. The
// underlying data remains separate in Neon and the couple samples retain their
// positive/negative/neutral labels.

export const buildCoupleSampleAnalysisPrompt = (scriptText, title, sampleType, formatLabel, formatDesc) => `You are analyzing a comedy sample to understand the comedic instincts of a specific Filipino couple/content duo.

Sample type: ${sampleType || "positive"}${formatLabel ? `\nFormat: ${formatLabel}${formatDesc ? ` (${formatDesc})` : ""}` : "\nFormat: Unspecified"}

FORMAT IS CONTEXT, NOT A SCOPE BOUNDARY. Learn transferable couple-wide comedic instincts from this sample while separating format-specific conventions from those instincts.

SAMPLE:
${scriptText}

Explain WHY this works or doesn't work — the underlying comedic decision-making — not just what happens. Focus on behavior, relationship dynamics, character logic, escalation, timing, reactions, and delivery. Do not overfit to specific words, names, props, locations, or one-off premises.

Return ONLY valid JSON, no markdown, no preamble:
{
  "summary": "",
  "representative_strength": 1,
  "primary_comedy_instinct": "",
  "secondary_comedy_instincts": ["", ""],
  "comedy_sources": {
    "dialogue": 1,
    "behavior": 1,
    "reaction": 1,
    "misunderstanding": 1,
    "absurd_logic": 1,
    "observation": 1,
    "wordplay": 1,
    "physical_comedy": 1,
    "silence_or_awkwardness": 1
  },
  "relationship_logic": "",
  "character_logic": "",
  "core_misunderstanding": "",
  "delivery_style": "",
  "confidence_or_commitment": "",
  "chaos_level": 1,
  "deadpan_level": 1,
  "setup_pattern": "",
  "escalation_pattern": "",
  "ending_pattern": "",
  "what_makes_it_funny": "",
  "best_comedic_decision": "",
  "recurring_behavior_patterns": [""],
  "format_specific_conventions": [""],
  "evidence_quality": 1
}`;

export const buildCoupleDNASynthesisPrompt = (analyses) => {
  const analysesText = analyses.map((a, i) => `SAMPLE ${i + 1} (${a.title || "Untitled"})${a.type ? ` — ${a.type}` : ""}${a.formatLabel ? ` — FORMAT: ${a.formatLabel}` : " — FORMAT: Unspecified"}
FORMAT IS CONTEXT, NOT A SCOPE BOUNDARY.
${a.formatDesc ? `FORMAT CONVENTIONS: ${a.formatDesc}\n` : ""}${JSON.stringify(a.analysis, null, 0)}`).join("\n\n");

  return `You are synthesizing the Comedy DNA of one specific Filipino comedy couple/duo from analyzed samples.

${analysesText}

Build one GLOBAL Comedy DNA. Every sample contributes evidence regardless of format. Do NOT create separate DNA by format. Distinguish transferable relationship/comedic instincts from conventions caused by the format. A deep instinct learned from an Acted Skit should remain available when generating Text Overlay, and vice versa.

Positive, negative, and neutral examples have different evidentiary meaning:
- Positive examples show what the couple likes/does well.
- Negative examples show patterns the couple dislikes and should strengthen "things_to_avoid" or "anti_patterns" when the evidence supports it.
- Neutral examples are evidence, but should not be treated as proof of preference.
Do not let one weak or ambiguous sample overturn a repeated pattern.

Look for:
- how the two people naturally relate
- who tends to be right/wrong/confident/confused
- recurring relationship friction
- specific comedic instincts
- character logic
- escalation
- reactions and silence
- delivery rhythm
- endings
- what makes their humor feel like THEM rather than generic couple content
- genuine contradictions that may actually be contextual modes

Do not copy dialogue, names, phrases, or premises.

Return ONLY valid JSON:
{
  "core_identity": {
    "one_sentence_summary": "",
    "core_comedic_brain": "",
    "relationship_comedic_dynamic": "",
    "emotional_energy": ""
  },
  "strongest_comedic_instincts": [
    { "instinct": "", "strength": 1, "description": "", "evidence_pattern": "" }
  ],
  "comedy_modes": [
    {
      "name": "",
      "description": "",
      "when_to_use": [""],
      "primary_instincts": [""],
      "delivery_style": "",
      "escalation_style": "",
      "best_formats": [""],
      "strength": 1
    }
  ],
  "preferred_comedy_sources": {
    "dialogue": 1, "behavior": 1, "reaction": 1, "misunderstanding": 1,
    "absurd_logic": 1, "observation": 1, "wordplay": 1,
    "physical_comedy": 1, "silence_or_awkwardness": 1
  },
  "relationship_logic_patterns": [""],
  "character_logic_patterns": [""],
  "preferred_escalation_patterns": [""],
  "preferred_scene_structures": [""],
  "delivery_dna": {
    "natural_energy": "", "deadpan_usage": "", "confidence_usage": "",
    "chaos_usage": "", "dialogue_rhythm": "", "reaction_rhythm": ""
  },
  "ending_dna": [""],
  "voice_traits": [""],
  "things_to_avoid": [""],
  "anti_patterns": [""],
  "contradictions_or_contextual_modes": [""],
  "training_confidence": 1,
  "training_summary": ""
}`;
};

export const buildCoupleDNAUpdatePrompt = (existingDNA, newAnalyses) => {
  const newText = newAnalyses.map((a, i) => `NEW SAMPLE ${i + 1} (${a.title || "Untitled"})${a.type ? ` — ${a.type}` : ""}${a.formatLabel ? ` — FORMAT: ${a.formatLabel}` : " — FORMAT: Unspecified"}
FORMAT IS CONTEXT, NOT A SCOPE BOUNDARY.
${a.formatDesc ? `FORMAT CONVENTIONS: ${a.formatDesc}\n` : ""}${JSON.stringify(a.analysis, null, 0)}`).join("\n\n");

  return `Update this existing structured Comedy DNA for a specific Filipino comedy couple/duo using ONLY the new sample evidence below.

EXISTING COMEDY DNA:
${JSON.stringify(existingDNA, null, 0)}

NEW ANALYSES:
${newText}

Rules:
- Keep the exact same JSON structure and keys as the existing DNA.
- Do not start over.
- Treat FORMAT as contextual metadata, not a scope boundary. New evidence from any format can strengthen or refine global couple-wide instincts.
- Confirmed repeated patterns can be strengthened slightly, but never inflate scores merely because another sample repeats them.
- Add genuinely new instincts/modes when supported.
- Preserve strong existing conclusions unless the new evidence gives a real reason to change them.
- Treat apparent contradictions as contextual modes where plausible.
- Negative samples can strengthen avoid/anti-pattern conclusions, but do not turn a single dislike into a universal rule without evidence.
- Do not copy surface material from the samples.

Return ONLY the full updated JSON object, no markdown or explanation.`;
};
