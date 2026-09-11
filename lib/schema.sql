-- Run this once against your Neon database (Neon SQL editor, or psql).

CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  content TEXT NOT NULL,
  -- Optional (NULL = "Unspecified"); stores one of Solo's own FORMATS ids
  -- (lib/prompts.js) — separate from Couple's `couple_samples.format`.
  format TEXT,
  analysis JSONB,
  analysis_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If you already ran an older version of this schema, run this once to add the new column:
-- ALTER TABLE samples ADD COLUMN IF NOT EXISTS format TEXT;

CREATE TABLE IF NOT EXISTS comedy_dna (
  id INT PRIMARY KEY DEFAULT 1,
  dna JSONB NOT NULL,
  included_sample_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- If you already ran the old version of this schema, run this once to add the new column:
-- ALTER TABLE comedy_dna ADD COLUMN IF NOT EXISTS included_sample_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  format TEXT,
  topic TEXT,
  context TEXT,
  result TEXT,
  mode_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Couple Content Generator (/couples) ────────────────────────────────────
-- Previously stored entirely in browser localStorage. These tables give it
-- the same Neon-backed persistence as SKIT GEN, with its own table names so
-- the two generators' data never collide.

-- Raw training samples the user has pasted in (dialogue/idea/etc. examples),
-- fed to the DNA trainer. Mirrors the old "ccg_dna_samples_v1" localStorage list.
-- `format` is optional (NULL = "Unspecified") and stores one of the Couple
-- generator's own FORMATS ids (app/couples/page.js) — separate from Solo's
-- `samples.format`, which stores one of Solo's own FORMATS ids (lib/prompts.js).
CREATE TABLE IF NOT EXISTS couple_samples (
  id TEXT PRIMARY KEY,
  title TEXT,
  notes TEXT DEFAULT '',
  content TEXT NOT NULL,
  sample_type TEXT DEFAULT '',
  format TEXT,
  analysis JSONB,
  analysis_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade older Couple sample tables without destroying existing samples.
ALTER TABLE couple_samples ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE couple_samples ADD COLUMN IF NOT EXISTS analysis_error TEXT;
ALTER TABLE couple_samples ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE couple_samples ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- If you already ran an older version of this schema, run this once to add the new column:
-- ALTER TABLE couple_samples ADD COLUMN IF NOT EXISTS format TEXT;

-- The trained Comedy DNA profile for the couple generator.
-- Structured JSON is canonical, matching Solo's Comedy DNA architecture.
CREATE TABLE IF NOT EXISTS couple_dna (
  id INT PRIMARY KEY DEFAULT 1,
  dna JSONB NOT NULL,
  included_sample_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT couple_dna_single_row CHECK (id = 1)
);

-- Ideas/scripts the user has explicitly saved from the generator. Mirrors the
-- old "ccg_ideas_v3" localStorage list (capped at 50 client-side).
CREATE TABLE IF NOT EXISTS couple_saved_ideas (
  id TEXT PRIMARY KEY,
  result TEXT,
  situation TEXT,
  vibe TEXT,
  format TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standing note on how the audience wants to be talked to — separate from
-- Comedy DNA, survives "Reset". Single row. Mirrors the old tone-notes
-- localStorage key.
CREATE TABLE IF NOT EXISTS couple_tone_notes (
  id INT PRIMARY KEY DEFAULT 1,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT couple_tone_notes_single_row CHECK (id = 1)
);

-- ─── Shared: per-app AI provider selection ──────────────────────────────────
-- Which provider ("gemini" | "anthropic") each generator currently calls.
-- One row per app. Falls back to each app's original default provider if no
-- row exists yet (Solo → gemini, Couple → anthropic) — see lib/ai.js.
CREATE TABLE IF NOT EXISTS settings (
  app TEXT PRIMARY KEY CHECK (app IN ('solo', 'couple')),
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'anthropic')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Persistent negative feedback / "Avoid" notes. Kept separate from Comedy DNA so
-- these rules survive every DNA retrain unchanged.
CREATE TABLE IF NOT EXISTS avoid_notes (
  id TEXT PRIMARY KEY,
  note TEXT NOT NULL,
  source_script TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS couple_avoid_notes (
  id TEXT PRIMARY KEY,
  note TEXT NOT NULL,
  source_script TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
