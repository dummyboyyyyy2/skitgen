# SKIT GEN — AI CODING & ARCHITECTURE GUIDELINES

> **IMPORTANT: Read this file before modifying the project.**
>
> This project contains two generators that are intentionally related but intentionally **not identical**:
> - **Solo / SKIT GEN** (`/`, `/api/generate`)
> - **Couple Content Generator** (`/couples`, `/api/couple`)
>
> They are two different creative systems inside one website.

## Core rule

**Keep the architecture consistent. Keep the creative semantics separate.**

When improving one generator, first determine whether the change is:

1. **Architectural / pipeline behavior** → normally port the improvement to the other generator.
2. **Creative / semantic behavior** → keep it specific to that generator.

Never copy Solo's creative rules wholesale into Couple, and never make Couple a renamed copy of Solo.

---

## What SHOULD stay consistent

The two generators should follow the same general backend lifecycle wherever the task exists in both systems:

```text
request
  ↓
action routing
  ↓
mode-specific prompt builder
  ↓
shared AI provider abstraction
  ↓
model response
  ↓
server-side parsing / validation
  ↓
consistent API response
```

For DNA/training:

```text
samples
  ↓
individual sample analysis
  ↓
DNA synthesis
  ↓
DNA validation / persistence
  ↓
incremental DNA update when new samples arrive
```

For generation:

```text
inputs + mode-specific DNA
  ↓
mode-specific generation prompt
  ↓
creative model
  ↓
verification / repair when applicable
  ↓
final structured output
```

Shared architectural improvements should generally be implemented in both pipelines. Examples:

- Better error handling
- Better retry behavior
- Provider abstraction improvements
- Model routing improvements
- Response parsing/validation
- Token/usage accounting
- JSON repair/validation
- Consistent API status handling
- Better persistence/update mechanics
- Better separation of prompt construction from route orchestration
- Better fallback behavior
- Better observability/debug logging (without exposing secrets)

---

## What MUST remain separate

### Solo-specific

Solo has its own:

- Comedy DNA meaning
- DNA fields/schema
- sample-analysis semantics
- character/comedic voice rules
- solo comedy instincts
- solo generation prompts
- solo verification rules
- solo examples
- solo output semantics
- Solo database tables/data

### Couple-specific

Couple has its own:

- Couple DNA meaning
- DNA fields/schema
- sample-analysis semantics
- relationship dynamics
- character contrast / interaction patterns
- couple escalation rules
- couple generation prompts
- couple verification rules
- couple examples
- couple output semantics
- Couple database tables/data

**Do not solve a Couple problem by copying a Solo prompt or Solo DNA field unless the concept is genuinely shared at the architectural level.**

---

## Provider architecture

AI providers are implementation details of the pipeline, not creative identity.

Current intended routing:

| Task | Solo | Couple |
|---|---|---|
| Ideas | Gemini | Gemini |
| Vibe/tone | Gemini | Gemini |
| Sample analysis | Gemini | Gemini |
| DNA synthesis/update | Gemini | Gemini |
| Avoid-note distillation | Gemini | Gemini |
| Script generation | OpenRouter | OpenRouter |
| Script refinement | OpenRouter | OpenRouter |

The exact model can change without changing the generator's creative architecture.

Do not hard-code assumptions that OpenRouter itself is a particular model. OpenRouter is the provider/gateway; the selected model is configurable.

---

## How to port a Solo improvement to Couple

Before editing Couple, classify the Solo change.

### Example: architectural change

Solo changes from:

```text
Analyze → Synthesize → Save
```

to:

```text
Analyze → Validate → Synthesize → Validate → Save
```

This is a pipeline improvement.

**Port the mechanism to Couple**, but use Couple's own analysis/DNA schema and validation rules.

### Example: creative change

Solo adds a DNA concept such as:

```text
solo_comedic_voice
```

That is not automatically a Couple field.

Couple may instead need concepts such as:

```text
relationship_dynamic
character_contrast
interaction_patterns
conflict_patterns
```

**Do not copy the Solo field merely to make the code look symmetrical.**

---

## Shared interface vs shared schema

It is desirable for both systems to have equivalent conceptual operations such as:

```text
analyzeSample()
synthesizeDNA()
updateDNA()
generateIdeas()
generateScript()
verifyScript()
refineScript()
```

But equivalent operations do **not** mean identical prompts or identical JSON schemas.

Think:

```text
                 SHARED ENGINE PATTERN
                         │
              ┌──────────┴──────────┐
              │                     │
            SOLO                  COUPLE
              │                     │
        Solo semantics        Couple semantics
        Solo schema           Couple schema
        Solo prompts          Couple prompts
```

---

## Important maintenance rule for AI coding agents

If you are an AI coding agent working on this repository:

1. Read this file first.
2. Inspect the existing Solo implementation before changing Couple when the request concerns consistency.
3. Identify the exact architectural behavior that is being improved.
4. Port the **behavior/mechanism**, not the entire Solo implementation.
5. Adapt the implementation to Couple's existing data model, prompts, schema, and UX.
6. Preserve separate Solo and Couple database tables and persisted data.
7. Do not rename Couple concepts to Solo concepts just to reuse code.
8. Do not merge the two DNA stores.
9. Do not silently change provider routing for one generator while leaving the other inconsistent unless the change is explicitly intended.
10. After changes, compare both pipelines for structural consistency and verify that their creative prompts/schema remain distinct.

### Before finalizing any change, ask:

- Is this a shared engineering improvement?
- If yes, did I apply the same mechanism to both generators?
- Did I preserve each generator's own prompt/schema/creative rules?
- Did I preserve separate data and routes?
- Could a future AI agent mistake one generator's creative rules for the other's?

If the answer to the last question is yes, improve the separation/documentation before finishing.

---

## Code-comment convention

When introducing a shared architectural pattern, add a short comment making the boundary explicit. Prefer comments like:

```js
// Shared pipeline architecture: keep Solo and Couple behavior aligned here.
// Creative semantics remain mode-specific and belong in the mode's prompt/schema.
```

Avoid comments that imply the two generators are interchangeable.

---

## Golden principle

> **Same engine discipline. Different creative brains.**
>
> Architectural improvements should travel between Solo and Couple.
> Creative rules should not.
