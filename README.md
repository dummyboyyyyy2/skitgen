# SKIT GEN

Personal comedy-script generator with two independent generators:

- **Solo (SKIT GEN)** — `/`, using Neon for persistence and Gemini or Anthropic for AI generation.
- **Couple Content Generator** — `/couples`, using Neon for persistence and Gemini or Anthropic for AI generation.

Each generator has its **own AI provider setting**. The selected provider is stored in Neon, so it persists across devices and deployments.

## 1. Set up Neon

1. Create a free project at https://neon.tech
2. Open the SQL editor for your project and run everything in `lib/schema.sql`.
3. Copy the connection string (starts with `postgres://...`) and set it as `DATABASE_URL`.

The schema contains the existing Solo tables plus the Couple tables (`couple_samples`, `couple_dna`, `couple_saved_ideas`, `couple_tone_notes`) and the per-generator `settings` table.

## 2. Configure AI providers

You can configure either or both providers. The provider toggle in each generator determines which one that generator uses.

### Gemini

1. Go to https://aistudio.google.com/app/apikey
2. Create an API key.
3. Set `GEMINI_API_KEY`.
4. Optionally set:
   - `GEMINI_MODEL` — quality-sensitive calls; defaults to `gemini-2.5-flash`.
   - `GEMINI_MODEL_LITE` — smaller/faster calls such as idea and tone suggestions; defaults to `gemini-2.5-flash-lite`.

The Gemini lite/full split applies to **both generators** when Gemini is selected.

### Anthropic

1. Go to https://console.anthropic.com/settings/keys
2. Create an API key.
3. Set `ANTHROPIC_API_KEY`.
4. Optionally set `ANTHROPIC_MODEL` — the model used for all Anthropic calls; defaults to `claude-sonnet-5`.

Anthropic does not use a separate lite/full model split.

You do not need both API keys if you only plan to use one provider. A generator only needs the API key for the provider currently selected for its requests.

## 3. Run locally

```bash
cp .env.example .env.local
# edit .env.local and paste in DATABASE_URL and the API key(s) you plan to use

npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import the repo at https://vercel.com/new
3. In the project's Vercel settings → Environment Variables, add:
   - `DATABASE_URL` — your Neon connection string
   - `GEMINI_API_KEY` — required if either generator will use Gemini
   - `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash`
   - `GEMINI_MODEL_LITE` — optional; defaults to `gemini-2.5-flash-lite`
   - `ANTHROPIC_API_KEY` — required if either generator will use Anthropic
   - `ANTHROPIC_MODEL` — optional; defaults to `claude-sonnet-5`
4. Deploy.

All provider API calls happen server-side. API keys and the Neon connection string are not exposed to the browser.

## 5. Install it on your phone (PWA)

Once deployed to Vercel (PWA install requires HTTPS — `localhost` won't prompt), the site is installable like a native app:

- **iOS Safari:** open the site → Share → "Add to Home Screen"
- **Android Chrome:** open the site → you'll get an "Install app" / "Add to Home screen" prompt automatically, or use the ⋮ menu → "Install app"

Installed, it opens full-screen with no browser chrome, uses the SKIT GEN icon, and works offline for the app shell. API calls to `/api/*` still need a connection because generation and persistent data use the server-side AI providers and Neon.

## Notes

- This is built for single-user personal use — there's no login. If you don't want the URL to be publicly usable by anyone who finds it, consider adding Vercel's password protection (Pro plans) or a simple shared-secret gate.
- Solo's existing table names are unchanged, so existing Neon data remains usable. Couple data uses separate `couple_*` tables.
- Comedy DNA and samples are stored in Neon. Couple's saved ideas and tone notes are also stored in Neon.
- Gemini's free-tier request and daily limits vary by model. The Gemini lite/full split is used for both generators; training/DNA analysis can be heavier than ordinary idea or script generation.
- The `scripts` table in `lib/schema.sql` backs Solo's saved-scripts feature (see `app/api/saved/route.js`).


## Solo AI routing

SkitGen Solo now routes AI by task instead of exposing a provider choice:
- Gemini: ideas, tone, sample analysis, Comedy DNA, Avoid-note distillation, and other structured tasks.
- OpenRouter: script generation and script refinement.

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the server environment. The default model is `google/gemma-4-31b-it:free`; change the model slug to test another OpenRouter model without changing application code.

## Couple AI routing

The Couple Content Generator (`/couples`, `/api/couple`) follows the same task-based routing as Solo, using its own prompts, schemas, and DNA:
- Gemini: ideas, vibe, tone, sample analysis, Couple Comedy DNA synthesis/update, and Avoid-note distillation.
- OpenRouter: script generation and script refinement.

This uses the same `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` and `GEMINI_API_KEY` / `GEMINI_MODEL_LITE` environment variables as Solo — no separate keys are needed. Couple's prompts, DNA schema, verification rules, and output format remain entirely separate from Solo's; only the underlying provider plumbing is shared. See `AI-CODING-GUIDELINES.md` for the full architecture rules.

## AI coding / maintenance guidance

**Read `AI-CODING-GUIDELINES.md` before modifying the code with an AI coding agent.**

Solo and Couple intentionally use the same backend architecture but remain separate creative systems. The rule is: **same engine discipline, different creative brains**. Architectural/pipeline improvements should generally be ported to both generators; prompts, DNA schemas, creative rules, examples, and output semantics must remain mode-specific.
