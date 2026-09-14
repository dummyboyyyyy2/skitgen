"use client";

import { useState, useEffect } from "react";
import { FORMATS } from "@/lib/prompts";
import ModeSwitcher from "@/lib/ModeSwitcher";
import ModelSelect from "@/lib/ModelSelect";

// Cap on how many samples can feed the Comedy DNA at once. Past this, more
// samples tend to average out distinctive quirks instead of sharpening them —
// diminishing/negative returns, not just cost. Tune this single constant if
// you want a different ceiling; Couple's own cap lives separately in its file.
const MAX_TRAINING_SAMPLES = 20;

/* ============================================================
   API HELPERS (talk to our own Next.js routes, not Gemini directly)
============================================================ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatAIError(data, status) {
  if (data?.code === "RATE_LIMIT_EXHAUSTED") {
    const provider = data.provider === "anthropic" ? "Anthropic" : data.provider === "openrouter" ? "OpenRouter" : "Gemini";
    const wait = Number.isFinite(Number(data.retryAfter)) && Number(data.retryAfter) > 0
      ? ` The provider asked us to wait about ${Math.ceil(Number(data.retryAfter))} seconds.`
      : "";
    return `${provider} rate limit reached — this API is temporarily maxed out for this request.${wait} Please wait a little and try again.`;
  }
  return data?.error || `Request failed (${status})`;
}

function formatTokenUsage(usage) {
  const total = Number(usage?.totalTokens || 0);
  return total > 0 ? `${total.toLocaleString()} tokens used` : null;
}

async function apiGenerate(action, payload = {}, onRetry = null, provider = null) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload, ...(provider ? { provider } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(formatAIError(data, res.status));
    err.code = data?.code;
    err.provider = data?.provider;
    throw err;
  }
  return data;
}

async function apiListSamples() {
  const res = await fetch("/api/samples");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load samples.");
  return data.samples || [];
}

async function apiAddSample(sample) {
  const res = await fetch("/api/samples", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sample),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to add sample.");
  return data.sample;
}

async function apiUpdateSample(id, patch) {
  const res = await fetch(`/api/samples/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to update sample.");
  return data.sample;
}

async function apiDeleteSample(id) {
  const res = await fetch(`/api/samples/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to delete sample.");
  }
}

async function apiGetDNA() {
  const res = await fetch("/api/dna");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load Comedy DNA.");
  return data; // { dna, includedSampleIds, trainedAt }
}

async function apiListAvoidNotes() {
  const res = await fetch("/api/avoid-notes");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load Avoid notes.");
  return data.notes || [];
}

async function apiDeleteAvoidNote(id) {
  const res = await fetch(`/api/avoid-notes/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to delete Avoid note.");
  }
}

async function apiSaveDNA(dna, includedSampleIds) {
  const res = await fetch("/api/dna", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dna, includedSampleIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to save Comedy DNA.");
  return data; // { dna, includedSampleIds, trainedAt }
}

async function apiClearSamples() {
  const res = await fetch("/api/samples", { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to clear samples.");
  }
}

async function apiClearDNA() {
  const res = await fetch("/api/dna", { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to clear Comedy DNA.");
  }
}

async function apiListSaved() {
  const res = await fetch("/api/saved");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load saved skits.");
  return data.scripts || [];
}

async function apiSaveScript(script) {
  const res = await fetch("/api/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(script),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to save skit.");
  return data.script;
}

async function apiDeleteSaved(id) {
  const res = await fetch(`/api/saved/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to delete saved skit.");
  }
}

const copyToClipboard = (text, onDone) => {
  const attempt = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
    if (onDone) onDone();
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => { if (onDone) onDone(); }).catch(attempt);
  } else {
    attempt();
  }
};

// Pulls the structured pieces (mode/style/language/script/closing line) out
// of the raw AI response text. Lives at module scope (not just inside the
// main component) so SavedPanel and the save/open/copy handlers can reuse it
// on saved skits without re-deriving their own copy of the same regexes.
function parseResult(text) {
  try {
    const modeMatch = text.match(/MODE:\s*(.+)/);
    const styleMatch = text.match(/STYLE:\s*(.+)/);
    const langMatch = text.match(/LANGUAGE:\s*(.+)/);
    const scriptMatch = text.match(/---\s*SCRIPT\s*---([\s\S]+?)(?:---\s*LINE TO REMEMBER|$)/);
    const lineMatch = text.match(/---\s*LINE TO REMEMBER\s*---([\s\S]+)/);
    return {
      mode: modeMatch?.[1]?.trim(),
      style: styleMatch?.[1]?.trim(),
      lang: langMatch?.[1]?.trim(),
      script: scriptMatch?.[1]?.trim() || text,
      legend: lineMatch?.[1]?.trim(),
    };
  } catch {
    return { script: text };
  }
}

/* ============================================================
   DESIGN SYSTEM — shared tokens + small reusable pieces
   (colors/spacing centralized here instead of repeated inline
   objects, per redesign brief's code-quality section)
============================================================ */

const C = {
  textPrimary: "#f5f5f5",
  textSecondary: "#a0a0a0",
  textMuted: "#666666",
  textFaint: "#3d3d3d",
  border: "#222222",
  borderSoft: "#1a1a1a",
  surface1: "#0d0d0d",
  surface2: "#111111",
  surface3: "#151515",
  accent: "#f0b429",
  success: "#34d399",
  successDim: "#163326",
  warning: "#f2a93b",
  warningDim: "#2e260f",
  danger: "#f0575f",
  dangerDim: "#2a1114",
};

const S = {
  page: { minHeight: "100svh", background: "#0a0a0a", color: C.textPrimary, fontFamily: "var(--font-ui)" },
  input: {
    width: "100%", background: C.surface1, border: `1px solid ${C.border}`,
    borderRadius: "8px", color: C.textPrimary, fontSize: "16px",
    padding: "12px 16px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  },
  sectionLabel: { fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, display: "block", marginBottom: "12px", fontWeight: 600 },
  card: { background: C.surface2, border: `1px solid ${C.borderSoft}`, borderRadius: "10px", padding: "20px 22px" },
  chip: {
    padding: "5px 14px", borderRadius: "20px", fontSize: "11px",
    background: C.surface1, color: C.textSecondary, border: `1px solid ${C.border}`,
  },
  section: { marginBottom: "32px" },
};

function btnStyle(kind, disabled) {
  const base = {
    borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.5px",
  };
  if (kind === "primary") {
    return { ...base, padding: "15px", border: "1px solid transparent", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1.5px" };
  }
  if (kind === "secondary") {
    return { ...base, padding: "11px 18px", fontSize: "12px" };
  }
  if (kind === "ghost") {
    return { ...base, padding: "8px 4px", fontSize: "12px", fontWeight: 500, letterSpacing: 0, textTransform: "none" };
  }
  return base;
}

function PrimaryButton({ children, disabled, onClick, style, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-primary ${className}`} style={{ ...btnStyle("primary", disabled), ...style }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, disabled, onClick, style, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn-secondary ${className}`} style={{ ...btnStyle("secondary", disabled), ...style }}>
      {children}
    </button>
  );
}

function GhostButton({ children, disabled, onClick, style, danger = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${danger ? "btn-danger-ghost" : "btn-ghost"} ${className}`}
      style={{ ...btnStyle("ghost", disabled), background: "transparent", border: "none", ...style }}
    >
      {children}
    </button>
  );
}

function StatBar({ label, value }) {
  const pct = Math.max(0, Math.min(10, value || 0)) * 10;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: C.textSecondary, textTransform: "capitalize" }}>{label.replace(/_/g, " ")}</span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>{value || 0}/10</span>
      </div>
      <div style={{ height: "6px", background: C.surface1, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.accent, borderRadius: "3px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// Renders a generated script with light structural formatting: lines that
// look like screenplay character cues ("NAME:" / all-caps up to a colon)
// get visual emphasis. Purely presentational — the underlying text used for
// copy/refine is untouched.
function ScriptBody({ text }) {
  const lines = text.split("\n");
  const cueRe = /^([A-Z][A-Z0-9 .'\-]{1,28}):(.*)$/;
  return (
    <div style={{ fontFamily: "var(--font-script)", fontSize: "14px", lineHeight: "1.9", color: "#d8d8d8" }}>
      {lines.map((line, i) => {
        const m = line.match(cueRe);
        if (m) {
          return (
            <div key={i} style={{ marginTop: i === 0 ? 0 : "14px" }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>{m[1]}:</span>
              <span>{m[2]}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: "10px" }} />;
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

// Slide-out list of skits the user has explicitly saved. Mirrors Couple's
// SavedPanel (app/couples/page.js) — same layout, same Open/Copy/Delete
// actions — but backed by the `scripts` table via /api/saved.
function SavedPanel({ scripts, onOpen, onCopy, onDelete, onClose }) {
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 100vw)",
      background: C.surface2, borderLeft: `1px solid ${C.border}`,
      zIndex: 200, display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>Saved Skits ({scripts.length})</div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: C.textMuted, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
        {scripts.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: C.textMuted, fontSize: "14px" }}>
            No saved skits yet.<br />Generate and save one!
          </div>
        ) : scripts.map((item) => {
          const script = typeof item.result === "string" ? parseResult(item.result).script : (item.result?.script || "");
          return (
            <div key={item.id} style={{ background: C.surface1, border: `1px solid ${C.borderSoft}`, borderRadius: "8px", padding: "14px", marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#eee", marginBottom: "4px" }}>{item.topic || "Untitled"}</div>
              <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {script.slice(0, 140)}{script.length > 140 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => onOpen(item)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: C.accent, color: "#1a1200", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Open</button>
                <button onClick={() => onCopy(item)} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Copy</button>
                <button onClick={() => onDelete(item.id)} style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function SkitGen() {
    const [view, setView] = useState("generate");
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [format, setFormat] = useState("skit");
  const [result, setResult] = useState(null);
  const [lastUsage, setLastUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  // Mirrored up from <ModelSelect> (lib/ModelSelect.js), which owns fetching
  // the live OpenRouter catalog and persisting the choice — this is just the
  // current value so generate() can thread it into script/refine calls.
  const [openrouterModel, setOpenrouterModel] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastModeUsed, setLastModeUsed] = useState(null);

  const [ideas, setIdeas] = useState(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);

  const [suggestedTone, setSuggestedTone] = useState(null);
  const [toneReason, setToneReason] = useState(null);
  const [toneLoading, setToneLoading] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const [savedScripts, setSavedScripts] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedThisResult, setSavedThisResult] = useState(false);
  const [savingScript, setSavingScript] = useState(false);

  const [samples, setSamples] = useState([]);
  const [comedyDNA, setComedyDNA] = useState(null);
  const [avoidNotes, setAvoidNotes] = useState([]);
  const [avoidSubmitting, setAvoidSubmitting] = useState(false);
  const [includedSampleIds, setIncludedSampleIds] = useState([]);
  const [dnaOutOfDate, setDnaOutOfDate] = useState(false);

  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleNotes, setSampleNotes] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [sampleFormat, setSampleFormat] = useState(null); // null = "Unspecified"
  const [addingSample, setAddingSample] = useState(false);

  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [buildingDNA, setBuildingDNA] = useState(false);
  const [dnaError, setDnaError] = useState(null);
  const [expandedSampleId, setExpandedSampleId] = useState(null);

  // Provider preference is shared through Neon and persists across devices.

  // Initial load from Neon
  useEffect(() => {
    (async () => {
      try {
        const [sampleList, dnaData, avoidList, savedList] = await Promise.all([apiListSamples(), apiGetDNA(), apiListAvoidNotes(), apiListSaved()]);
        setSamples(sampleList);
        setComedyDNA(dnaData.dna || null);
        setIncludedSampleIds(dnaData.includedSampleIds || []);
        setAvoidNotes(avoidList);
        setSavedScripts(savedList);
      } catch (err) {
        setBootError(err?.message || "Failed to load your data.");
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  const unanalyzedCount = samples.filter((s) => !s.analysis).length;
  const analyzedCount = samples.filter((s) => s.analysis).length;

  /* ---------- sample management ---------- */

  const addSample = async () => {
    if (!sampleText.trim()) return;
    try {
      const created = await apiAddSample({
        title: sampleTitle.trim() || `Sample ${samples.length + 1}`,
        notes: sampleNotes.trim(),
        content: sampleText.trim(),
        format: sampleFormat,
      });
      setSamples((prev) => [...prev, created]);
      setDnaOutOfDate(true);
      setSampleTitle("");
      setSampleNotes("");
      setSampleText("");
      setSampleFormat(null);
      setAddingSample(false);
    } catch (err) {
      setDnaError(err?.message || "Failed to add sample.");
    }
  };

  const deleteSample = async (id) => {
    try {
      await apiDeleteSample(id);
      setSamples((prev) => prev.filter((s) => s.id !== id));
      setIncludedSampleIds((prev) => prev.filter((sid) => sid !== id));
      setDnaOutOfDate(true);
    } catch (err) {
      setDnaError(err?.message || "Failed to delete sample.");
    }
  };

  // Full reset — mirrors Couple's clearAll(): wipes every sample AND the
  // trained DNA itself, not just individual samples. Samples first, then DNA,
  // so a failure partway through never leaves a "DNA with no samples behind it"
  // state worse than what a partial per-sample cleanup would produce.
  const clearAll = async () => {
    try {
      await apiClearSamples();
      await apiClearDNA();
      setSamples([]);
      setComedyDNA(null);
      setIncludedSampleIds([]);
      setDnaOutOfDate(false);
      setTrainingStatus(null);
      setDnaError(null);
    } catch (err) {
      setDnaError(err?.message || "Failed to reset Comedy DNA.");
    }
  };

  const analyzeSample = async (sample) => {
    try {
      const formatInfo = sample.format ? FORMATS.find((f) => f.id === sample.format) : null;
      const { analysis } = await apiGenerate("analyzeSample", { content: sample.content, title: sample.title, formatLabel: formatInfo?.label || null, formatDesc: formatInfo?.desc || null });
      const updated = await apiUpdateSample(sample.id, { analysis });
      setSamples((prev) => prev.map((s) => (s.id === sample.id ? updated : s)));
      return true;
    } catch (err) {
      const message = err?.message || "Unknown error.";
      try {
        const updated = await apiUpdateSample(sample.id, { analysisError: message });
        setSamples((prev) => prev.map((s) => (s.id === sample.id ? updated : s)));
      } catch {}
      return false;
    }
  };

  const baseProfileSummary =
    "Confident Idiot primary archetype (commits fully to wrong statements, never retreats), Chaotic Lovable secondary (warm never-mean chaos), Calm Unbothered tertiary (deadpan delivery of unhinged content). Taglish voice, Gen Z Filipino, Zeke Abella-influenced. Avoids institutional/political humor, protects marketability.";

  // By default this is INCREMENTAL: if DNA already exists, only the newly-analyzed
  // samples get sent to the model to merge into the existing DNA — not the whole
  // corpus. Pass forceFull=true to resynthesize from every analyzed sample instead
  // (costs more, but useful if you suspect incremental merges have drifted).
  const buildDNA = async (suppliedSamples = null, forceFull = false) => {
    const readySamples = suppliedSamples || samples.filter((s) => s.analysis);
    if (readySamples.length === 0) {
      setDnaError("No analyzed samples yet. Analyze your samples first.");
      return false;
    }

    const newSamples = readySamples.filter((s) => !includedSampleIds.includes(s.id));

    if (!forceFull && comedyDNA && newSamples.length === 0) {
      setTrainingStatus("DNA is already up to date with every analyzed sample.");
      return true;
    }

    // Cap check — block before spending a call, with an actionable message,
    // rather than silently dropping/rotating samples on the user's behalf.
    if (forceFull || !comedyDNA) {
      if (readySamples.length > MAX_TRAINING_SAMPLES) {
        setDnaError(
          `You have ${readySamples.length} analyzed samples, over the ${MAX_TRAINING_SAMPLES}-sample training cap. ` +
          `Delete ${readySamples.length - MAX_TRAINING_SAMPLES} sample${readySamples.length - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} (keep your strongest/most representative ones) before training.`
        );
        return false;
      }
    } else {
      const totalAfter = includedSampleIds.length + newSamples.length;
      if (totalAfter > MAX_TRAINING_SAMPLES) {
        setDnaError(
          `Training on these ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"} would put you at ${totalAfter}, over the ${MAX_TRAINING_SAMPLES}-sample cap. ` +
          `Delete ${totalAfter - MAX_TRAINING_SAMPLES} older/weaker sample${totalAfter - MAX_TRAINING_SAMPLES === 1 ? "" : "s"} first, or use "full rebuild from all samples" after pruning.`
        );
        return false;
      }
    }

    setBuildingDNA(true);
    setDnaError(null);

    try {
      let dna;
      let coveredIds;

      if (forceFull || !comedyDNA) {
        setTrainingStatus(`Synthesizing Comedy DNA from ${readySamples.length} analyzed sample${readySamples.length === 1 ? "" : "s"}...`);
        const res = await apiGenerate("synthesizeDNA", { analyses: readySamples.map((s) => { const fi = s.format ? FORMATS.find((f) => f.id === s.format) : null; return { ...s, formatLabel: fi?.label || null, formatDesc: fi?.desc || null }; }), baseProfileSummary });
        dna = res.dna;
        coveredIds = readySamples.map((s) => s.id);
      } else {
        setTrainingStatus(`Updating Comedy DNA with ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"} (not resending the whole corpus)...`);
        const res = await apiGenerate("updateDNA", { existingDNA: comedyDNA, newAnalyses: newSamples.map((s) => { const fi = s.format ? FORMATS.find((f) => f.id === s.format) : null; return { ...s, formatLabel: fi?.label || null, formatDesc: fi?.desc || null }; }) });
        dna = res.dna;
        coveredIds = Array.from(new Set([...includedSampleIds, ...newSamples.map((s) => s.id)]));
      }

      const saved = await apiSaveDNA(dna, coveredIds);
      setComedyDNA(saved.dna);
      setIncludedSampleIds(saved.includedSampleIds || coveredIds);
      setDnaOutOfDate(false);
      setTrainingStatus(
        forceFull || !comedyDNA
          ? `Comedy DNA built successfully from ${readySamples.length} sample${readySamples.length === 1 ? "" : "s"}.`
          : `Comedy DNA updated with ${newSamples.length} new sample${newSamples.length === 1 ? "" : "s"}.`
      );
      return true;
    } catch (err) {
      const message = err?.message || "Unknown API error.";
      setDnaError(`DNA update failed: ${message}. Your samples and analyses are safe — try again.`);
      setTrainingStatus("DNA update stopped.");
      return false;
    } finally {
      setBuildingDNA(false);
    }
  };

  const analyzeAllPending = async () => {
    if (analyzingAll || buildingDNA) return;
    const pending = samples.filter((s) => !s.analysis);
    if (pending.length === 0) return;

    setAnalyzingAll(true);
    setDnaError(null);
    setTrainingStatus(`Starting analysis of ${pending.length} new sample${pending.length === 1 ? "" : "s"}...`);

    let failCount = 0;
    // Sequential on purpose — parallel bursts are what trigger free-tier rate limits.
    for (let i = 0; i < pending.length; i++) {
      const sample = pending[i];
      setAnalyzeProgress({ current: i + 1, total: pending.length });
      setTrainingStatus(`Analyzing "${sample.title}"...`);
      const ok = await analyzeSample(sample);
      if (!ok) failCount++;
      if (i < pending.length - 1) {
        setTrainingStatus(`Finished ${i + 1} of ${pending.length}. Preparing next sample...`);
        await sleep(1200);
      }
    }

    setAnalyzeProgress(null);
    setAnalyzingAll(false);

    if (failCount > 0) {
      setDnaOutOfDate(true);
      setDnaError(`${failCount} of ${pending.length} sample${pending.length === 1 ? "" : "s"} failed to analyze. Check the sample cards below, then retry the failed ones.`);
      setTrainingStatus(`Analysis finished with ${failCount} failure${failCount === 1 ? "" : "s"}. DNA was not rebuilt.`);
      return;
    }

    setDnaOutOfDate(true);
    setTrainingStatus("All new samples analyzed. Preparing Comedy DNA...");

    // Re-fetch the freshest sample list before synthesizing, since state updates are async.
    const fresh = await apiListSamples();
    setSamples(fresh);
    const readyNow = fresh.filter((s) => s.analysis);
    setTimeout(() => { buildDNA(readyNow); }, 100);
  };

  const reanalyzeSample = async (sample) => {
    if (analyzingAll || buildingDNA) return;
    setDnaError(null);
    setTrainingStatus(`Reanalyzing "${sample.title}"...`);
    try {
      const reset = await apiUpdateSample(sample.id, { resetAnalysis: true });
      setSamples((prev) => prev.map((s) => (s.id === sample.id ? reset : s)));
      const ok = await analyzeSample(reset);
      if (ok) {
        setIncludedSampleIds((prev) => prev.filter((id) => id !== sample.id));
        setDnaOutOfDate(true);
        setTrainingStatus(`"${sample.title}" reanalyzed successfully.`);
      } else {
        setDnaError(`Couldn't reanalyze "${sample.title}". Check the sample card for the error.`);
        setTrainingStatus("Reanalysis failed.");
      }
    } catch (err) {
      setDnaError(err?.message || "Reanalysis failed.");
    }
  };

  /* ---------- generate view logic ---------- */

  const submitAvoidNote = async (script, reason = "") => {
    if (!script || avoidSubmitting) return;
    setAvoidSubmitting(true);
    try {
      const { note } = await apiGenerate("distillAvoidNote", { script, reason });
      if (!note?.trim()) throw new Error("Couldn't create an Avoid note from this result.");
      const res = await fetch("/api/avoid-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), sourceScript: script }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save Avoid note.");
      setAvoidNotes((prev) => [data.note, ...prev.filter((n) => n.id !== data.note.id)].slice(0, 10));
    } catch (err) {
      setDnaError(err?.message || "Failed to learn from this result.");
    } finally {
      setAvoidSubmitting(false);
    }
  };

  const deleteAvoidNote = async (id) => {
    try {
      await apiDeleteAvoidNote(id);
      setAvoidNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setDnaError(err?.message || "Failed to delete Avoid note.");
    }
  };

  const generateIdeas = async () => {
    const formatInfo = FORMATS.find((f) => f.id === format);
    setIdeasLoading(true);
    setShowIdeas(true);
    setIdeas(null);
    try {
      const { ideas: got } = await apiGenerate("ideas", { formatLabel: formatInfo.label, formatDesc: formatInfo.desc, dna: comedyDNA, avoidNotes });
      setIdeas(got);
    } catch {
      setIdeas([]);
    } finally {
      setIdeasLoading(false);
    }
  };

  const recommendToneFor = async (topicText, formatInfo) => {
    if (!topicText.trim()) return;
    setToneLoading(true);
    setSuggestedTone(null);
    setToneReason(null);
    try {
      const { tone, reason } = await apiGenerate("tone", { topic: topicText, formatLabel: formatInfo.label, formatDesc: formatInfo.desc, dna: comedyDNA });
      setSuggestedTone(tone);
      setToneReason(reason);
    } catch {
      // fail silently
    } finally {
      setToneLoading(false);
    }
  };

  const selectIdea = (idea) => {
    setTopic(idea.premise);
    setShowIdeas(false);
    setIdeas(null);
    setSuggestedTone(idea.tone || null);
    setToneReason(idea.why || null);
  };

  const generate = async (withFeedback = false) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setShowFeedback(false);
    if (!withFeedback) setResult(null);

    try {
      let data;

      if (withFeedback && result) {
        const currentScript = parseResult(result).script || result;
        data = await apiGenerate("refine", {
          originalScript: currentScript,
          feedback,
          dna: comedyDNA,
          selectedMode: lastModeUsed,
          openrouterModel,
        });
      } else {
        const formatInfo = FORMATS.find((f) => f.id === format);
        const voiceClips = samples
          .filter((s) => includedSampleIds.includes(s.id) && s.analysis?.voice_clip)
          .map((s) => s.analysis.voice_clip);

        data = await apiGenerate("script", {
          formatLabel: formatInfo.label,
          formatDesc: formatInfo.desc,
          topic,
          context,
          suggestedTone,
          dna: comedyDNA,
          avoidNotes,
          voiceClips,
          openrouterModel,
        });

        const modeFromResult = data.result ? parseResult(data.result).mode : null;
        setLastModeUsed(modeFromResult || null);
      }

      if (!data.result || !data.result.trim()) throw new Error("Empty response");
      setResult(data.result);
      setLastUsage(data.usage || null);
      setFeedback("");
      setSavedThisResult(false);
    } catch (err) {
      setError(err?.message || "Generation failed. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyScript = (text) => {
    copyToClipboard(text, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const applyQuickRefine = (note) => {
    setShowFeedback(true);
    setFeedback(note);
  };

  const saveCurrentScript = async () => {
    if (!result) return;
    setSavingScript(true);
    try {
      const saved = await apiSaveScript({
        result,
        topic,
        context,
        format,
        modeUsed: lastModeUsed,
      });
      setSavedScripts((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)].slice(0, 50));
      setSavedThisResult(true);
    } catch (err) {
      setError(err?.message || "Failed to save skit.");
    } finally {
      setSavingScript(false);
    }
  };

  const openSavedScript = (item) => {
    setResult(typeof item.result === "string" ? item.result : item.result?.script || "");
    setTopic(item.topic || "");
    setContext(item.context || "");
    if (item.format) setFormat(item.format);
    setLastModeUsed(item.modeUsed || null);
    setSavedThisResult(true);
    setSavedOpen(false);
  };

  const copySavedScript = (item) => {
    const text = typeof item.result === "string" ? parseResult(item.result).script : (item.result?.script || "");
    copyToClipboard(text || "");
  };

  const deleteSavedScript = async (id) => {
    try {
      await apiDeleteSaved(id);
      setSavedScripts((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err?.message || "Failed to delete saved skit.");
    }
  };

  const parsed = result ? parseResult(result) : null;

  if (bootLoading) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: C.textMuted }}>
        loading your comedy dna...
      </div>
    );
  }

  if (bootError) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: C.danger, padding: "20px", textAlign: "center" }}>
        Couldn't connect to the database: {bootError}<br />Check that DATABASE_URL is set correctly.
      </div>
    );
  }

  return (
    <div style={S.page}>

      {savedOpen && (
        <SavedPanel
          scripts={savedScripts}
          onOpen={openSavedScript}
          onCopy={copySavedScript}
          onDelete={deleteSavedScript}
          onClose={() => setSavedOpen(false)}
        />
      )}

      <div className="header-shell" style={{ padding: "24px 28px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
        {/* Global Solo/Couple mode switcher — page-specific tabs (GENERATE /
            COMEDY DNA / SAVED) stay below, unaffected. Separate app, separate
            DNA, separate everything under the hood — this is just navigation. */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          <ModeSwitcher active="solo" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", color: "#fff" }}>SKIT GEN</div>
            <div style={{ fontSize: "11px", color: C.textMuted, letterSpacing: "1.5px", marginTop: "4px" }}>YOUR COMEDY · YOUR VOICE</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: comedyDNA ? C.success : C.textFaint, fontWeight: 600 }}>
            <span
              className={comedyDNA ? "" : "status-dot-pulse"}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: comedyDNA ? C.success : C.textFaint, display: "inline-block" }}
            />
            {comedyDNA ? "DNA READY" : "NO DNA YET"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[["generate", "GENERATE"], ["dna", "COMEDY DNA"], ["saved", `SAVED${savedScripts.length > 0 ? ` (${savedScripts.length})` : ""}`]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => id === "saved" ? setSavedOpen(true) : setView(id)}
              style={{
                padding: "12px 18px", minHeight: "44px", background: "transparent", border: "none",
                borderBottom: (id === "saved" ? savedOpen : view === id) ? `2px solid ${C.accent}` : "2px solid transparent",
                color: (id === "saved" ? savedOpen : view === id) ? "#fff" : C.textFaint, fontSize: "12px", fontWeight: "700",
                letterSpacing: "1.5px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              {label}
              {id === "dna" && unanalyzedCount > 0 && (
                <span style={{ marginLeft: "6px", fontSize: "10px", color: C.warning }}>●{unanalyzedCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="page-shell" style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 20px 60px" }}>

        {view === "generate" ? (
          <>
            <div style={S.section}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ ...S.sectionLabel, marginBottom: 0 }}>WHAT'S IT ABOUT</span>
              </div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. yung friend mo na lagi late tapos may excuse palagi..."
                rows={4}
                style={{ ...S.input, resize: "vertical", lineHeight: "1.6", padding: "14px 16px", fontSize: "16px" }}
              />
              <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                <GhostButton onClick={generateIdeas} disabled={ideasLoading} style={{ color: ideasLoading ? C.textFaint : C.textMuted, padding: "2px 0" }}>
                  {ideasLoading ? "thinking..." : "✦ Need inspiration? Suggest an idea"}
                </GhostButton>
              </div>
            </div>

            {showIdeas && (
              <div style={{ ...S.card, marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 600 }}>
                    IDEAS — <span style={{ color: C.textFaint }}>{FORMATS.find((f) => f.id === format)?.label}</span>
                    {comedyDNA && <span style={{ color: C.success, marginLeft: "8px" }}>· DNA-informed</span>}
                  </div>
                  <button onClick={() => setShowIdeas(false)} style={{ background: "transparent", border: "none", color: C.textFaint, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                {ideasLoading && <div style={{ fontSize: "12px", color: C.textFaint, textAlign: "center", padding: "16px 0" }}>generating ideas...</div>}
                {ideas?.map((idea, i) => (
                  <div key={i} onClick={() => selectIdea(idea)} className="idea-row" style={{
                    padding: "13px 15px", borderRadius: "8px", border: `1px solid ${C.borderSoft}`,
                    marginBottom: "7px", cursor: "pointer", background: C.surface1,
                  }}>
                    <div style={{ fontSize: "13px", color: "#ddd", lineHeight: "1.5", marginBottom: "4px" }}>{idea.premise}</div>
                    <div style={{ fontSize: "11px", color: C.textFaint, lineHeight: "1.4" }}>{idea.tone} — {idea.why}</div>
                  </div>
                ))}
                {ideas?.length === 0 && <div style={{ fontSize: "12px", color: C.textFaint, textAlign: "center", padding: "12px 0" }}>couldn't generate ideas. try again.</div>}
                {ideas?.length > 0 && (
                  <GhostButton onClick={generateIdeas} style={{ marginTop: "6px" }}>refresh ideas</GhostButton>
                )}
              </div>
            )}

            <div style={S.section}>
              <span style={S.sectionLabel}>FORMAT</span>
              <div className="format-grid">
                {FORMATS.map((f) => {
                  const selected = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setFormat(f.id); setSuggestedTone(null); setToneReason(null); }}
                      className={`format-card ${selected ? "is-selected" : ""}`}
                      style={{
                        padding: "14px 8px", borderRadius: "8px",
                        border: selected ? `1px solid ${C.accent}` : `1px solid ${C.borderSoft}`,
                        background: selected ? "rgba(240,180,41,0.08)" : C.surface1,
                        color: selected ? "#fff" : C.textSecondary,
                        cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                        lineHeight: "1.4", minHeight: "76px",
                      }}
                    >
                      <div style={{ fontSize: "18px", marginBottom: "5px" }}>{f.icon}</div>
                      <div style={{ fontWeight: "700", fontSize: "11px", color: selected ? C.accent : C.textSecondary }}>{f.label}</div>
                      <div style={{ fontSize: "10px", opacity: 0.65, marginTop: "3px" }}>{f.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={S.section}>
              <span style={S.sectionLabel}>VIBE</span>
              <div style={{ ...S.card, padding: "16px 18px" }}>
                {!topic.trim() && !suggestedTone && (
                  <div style={{ fontSize: "13px", color: C.textFaint }}>Auto-detected from your premise once you write one.</div>
                )}
                {topic.trim() && !suggestedTone && !toneLoading && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", color: C.textSecondary }}>Left to SKIT GEN's judgment — or pick a vibe yourself.</div>
                    <GhostButton
                      onClick={() => { const fi = FORMATS.find((f) => f.id === format); recommendToneFor(topic, fi); }}
                      style={{ color: C.textMuted, whiteSpace: "nowrap" }}
                    >
                      ✦ suggest vibe
                    </GhostButton>
                  </div>
                )}
                {toneLoading && <div style={{ fontSize: "13px", color: C.textFaint }}>reading your topic...</div>}
                {suggestedTone && !toneLoading && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: "#eee", fontWeight: "600", marginBottom: toneReason ? "5px" : 0 }}>{suggestedTone}</div>
                      {toneReason && <div style={{ fontSize: "12px", color: C.textFaint, lineHeight: "1.5" }}>{toneReason}</div>}
                    </div>
                    <GhostButton onClick={() => { setSuggestedTone(null); setToneReason(null); }} style={{ color: C.textFaint, whiteSpace: "nowrap" }}>
                      clear
                    </GhostButton>
                  </div>
                )}
              </div>
            </div>

            <div style={S.section}>
              <span style={S.sectionLabel}>EXTRA CONTEXT <span style={{ color: C.textFaint, letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>— optional</span></span>
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Optional — characters, setting, constraints, references..."
                style={S.input}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <ModelSelect app="solo" onChange={setOpenrouterModel} />
            </div>

            <PrimaryButton
              onClick={() => generate(false)}
              disabled={loading || !topic.trim()}
              style={{ width: "100%", marginBottom: "40px" }}
            >
              {loading ? "Writing Your Skit ···" : "Generate Skit ✦"}
            </PrimaryButton>

            {error && (
              <div style={{ color: C.danger, fontSize: "13px", marginBottom: "18px", padding: "12px 16px", background: C.dangerDim, border: `1px solid #3a1a1e`, borderRadius: "8px" }}>
                {error}
              </div>
            )}

            {parsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "2px" }}>
                  {parsed.style && <span style={S.chip}>{parsed.style}</span>}
                  {parsed.lang && <span style={S.chip}>{parsed.lang}</span>}
                  {lastModeUsed && <span style={{ ...S.chip, color: C.success, borderColor: "#1a3a1a" }}>{lastModeUsed}</span>}
                  {lastUsage && formatTokenUsage(lastUsage) && <span style={{ ...S.chip, color: C.textMuted }}>{formatTokenUsage(lastUsage)}</span>}
                </div>

                {parsed.script && (
                  <div style={{ ...S.card, marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                      <span style={{ fontSize: "12px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700 }}>YOUR SKIT</span>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <GhostButton onClick={() => copyScript(parsed.script)} style={{ color: copied ? C.success : C.textMuted }}>
                          {copied ? "copied ✓" : "copy"}
                        </GhostButton>
                        <button
                          onClick={saveCurrentScript}
                          disabled={savingScript || savedThisResult}
                          style={{
                            padding: "6px 13px", borderRadius: "8px",
                            border: `1px solid ${savedThisResult ? C.success : C.border}`,
                            background: savedThisResult ? `${C.success}15` : "transparent",
                            color: savedThisResult ? C.success : C.textMuted,
                            fontSize: "12px", fontWeight: 600, cursor: savingScript || savedThisResult ? "default" : "pointer",
                            fontFamily: "inherit", transition: "all 0.15s",
                          }}
                        >
                          {savedThisResult ? "✓ saved" : savingScript ? "saving…" : "save"}
                        </button>
                      </div>
                    </div>
                    <ScriptBody text={parsed.script} />
                  </div>
                )}

                {parsed.script && (
                  <div style={{ ...S.card, padding: "12px 14px", marginTop: "-4px" }}>
                    {!showFeedback ? (
                      <GhostButton onClick={() => setShowFeedback(true)} disabled={avoidSubmitting} style={{ color: C.textMuted }}>👎 Not this one</GhostButton>
                    ) : (
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: C.textSecondary, marginBottom: "5px" }}>What didn't work? <span style={{ color: C.textFaint, fontWeight: 400 }}>(optional)</span></div>
                        <div style={{ fontSize: "11px", color: C.textFaint, lineHeight: "1.5", marginBottom: "9px" }}>A note makes the lesson more precise, but you can submit just the thumbs-down.</div>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. too predictable, too mean, felt forced..." rows={2} disabled={avoidSubmitting} style={{ ...S.input, resize: "vertical", lineHeight: "1.5", padding: "9px 10px", fontSize: "12px", marginBottom: "8px" }} />
                        <div style={{ display: "flex", gap: "7px" }}>
                          <SecondaryButton onClick={async () => { await submitAvoidNote(parsed.script, feedback); setShowFeedback(false); setFeedback(""); }} disabled={avoidSubmitting} style={{ flex: 1 }}>
                            {avoidSubmitting ? "Learning from this ···" : "Save to Avoid List"}
                          </SecondaryButton>
                          <GhostButton onClick={() => { setShowFeedback(false); setFeedback(""); }} disabled={avoidSubmitting}>Cancel</GhostButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {parsed.legend && (
                  <div style={{ ...S.card, borderLeft: `3px solid ${C.accent}`, background: "rgba(240,180,41,0.04)" }}>
                    <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.accent, marginBottom: "10px", fontWeight: 700 }}>★ LINE TO REMEMBER</div>
                    <p style={{ fontSize: "15px", fontWeight: "600", color: "#f0f0f0", margin: 0, lineHeight: "1.5", fontStyle: "italic" }}>
                      "{parsed.legend}"
                    </p>
                  </div>
                )}

                <div style={S.card}>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700 }}>WANT TO CHANGE SOMETHING?</span>
                  </div>
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {["More chaotic", "Faster ending", "More Filipino", "More absurd", "More deadpan"].map((q) => (
                      <button
                        key={q}
                        onClick={() => applyQuickRefine(q)}
                        style={{ ...S.chip, cursor: "pointer", fontFamily: "inherit" }}
                        className="idea-row"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedback}
                    onChange={(e) => { setFeedback(e.target.value); setShowFeedback(true); }}
                    placeholder="Make the ending crazier..."
                    rows={2}
                    style={{ ...S.input, resize: "vertical", lineHeight: "1.6", padding: "12px 14px", marginBottom: "10px" }}
                  />
                  <SecondaryButton
                    onClick={() => generate(true)}
                    disabled={loading || !feedback.trim()}
                    style={{ width: "100%" }}
                  >
                    {loading ? "Rewriting ···" : "✦ Rewrite"}
                  </SecondaryButton>
                </div>

                <GhostButton
                  onClick={() => generate(false)}
                  disabled={loading}
                  style={{ alignSelf: "flex-start", color: C.textFaint, marginTop: "2px" }}
                >
                  ↻ Regenerate from scratch
                </GhostButton>
              </div>
            )}
          </>
        ) : (
          <ComedyDNAView
            samples={samples}
            comedyDNA={comedyDNA}
            avoidNotes={avoidNotes}
            deleteAvoidNote={deleteAvoidNote}
            includedSampleIds={includedSampleIds}
            dnaOutOfDate={dnaOutOfDate}
            sampleTitle={sampleTitle} setSampleTitle={setSampleTitle}
            sampleNotes={sampleNotes} setSampleNotes={setSampleNotes}
            sampleText={sampleText} setSampleText={setSampleText}
            sampleFormat={sampleFormat} setSampleFormat={setSampleFormat}
            addingSample={addingSample} setAddingSample={setAddingSample}
            addSample={addSample}
            deleteSample={deleteSample}
            clearAll={clearAll}
            analyzeAllPending={analyzeAllPending}
            analyzingAll={analyzingAll}
            analyzeProgress={analyzeProgress}
            trainingStatus={trainingStatus}
            reanalyzeSample={reanalyzeSample}
            buildDNA={buildDNA}
            buildingDNA={buildingDNA}
            dnaError={dnaError}
            expandedSampleId={expandedSampleId}
            setExpandedSampleId={setExpandedSampleId}
            unanalyzedCount={unanalyzedCount}
            analyzedCount={analyzedCount}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   COMEDY DNA VIEW
============================================================ */

function SampleStatusBadge({ sample, isIncluded }) {
  if (sample.analysis_error) {
    return <span style={{ fontSize: "11px", color: C.danger, fontWeight: 600 }}>! ANALYSIS FAILED</span>;
  }
  if (!sample.analysis) {
    return <span style={{ fontSize: "11px", color: C.warning, fontWeight: 600 }}>○ NEEDS ANALYSIS</span>;
  }
  if (isIncluded) {
    return <span style={{ fontSize: "11px", color: C.success, fontWeight: 600 }}>✓ IN DNA</span>;
  }
  return <span style={{ fontSize: "11px", color: C.textSecondary, fontWeight: 600 }}>✓ ANALYZED</span>;
}

function ComedyDNAView({
  samples, comedyDNA, avoidNotes, deleteAvoidNote, includedSampleIds, dnaOutOfDate,
  sampleTitle, setSampleTitle, sampleNotes, setSampleNotes, sampleText, setSampleText,
  sampleFormat, setSampleFormat,
  addingSample, setAddingSample, addSample, deleteSample, clearAll,
  analyzeAllPending, analyzingAll, analyzeProgress, trainingStatus, reanalyzeSample,
  buildDNA, buildingDNA, dnaError,
  expandedSampleId, setExpandedSampleId,
  unanalyzedCount, analyzedCount,
}) {
  const dna = comedyDNA;
  const sampleCount = samples.length;
  const newSampleCount = samples.filter((s) => s.analysis && !includedSampleIds.includes(s.id)).length;
  const [copiedSampleId, setCopiedSampleId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleCopySample = (sample) => {
    copyToClipboard(sample.content, () => {
      setCopiedSampleId(sample.id);
      setTimeout(() => setCopiedSampleId(null), 2000);
    });
  };

  const handleDeleteClick = (id) => {
    if (confirmDeleteId === id) {
      deleteSample(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const warningLevel = sampleCount > 25 ? "high" : sampleCount > 20 ? "mid" : null;

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <span style={S.sectionLabel}>01 — SAMPLES · 02 — TRAINING · 03 — YOUR DNA</span>
      </div>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Comedy DNA Trainer</div>
        <div style={{ fontSize: "13px", color: C.textSecondary, lineHeight: "1.6" }}>
          Teach SKIT GEN how your comedy actually works using your own screenplays.
        </div>
      </div>

      {/* ---- DNA dashboard ---- */}
      <div style={{ ...S.card, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "18px" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "8px" }}>COMEDY DNA</div>
            <div style={{ fontSize: "13px", color: C.textSecondary, lineHeight: "1.7" }}>
              {sampleCount} sample{sampleCount === 1 ? "" : "s"} analyzed<br />
              <span style={{ color: includedSampleIds.length >= MAX_TRAINING_SAMPLES ? C.warning : C.textSecondary, fontWeight: includedSampleIds.length >= MAX_TRAINING_SAMPLES ? 700 : 400 }}>
                {includedSampleIds.length} / {MAX_TRAINING_SAMPLES} sample{includedSampleIds.length === 1 ? "" : "s"} trained
                {includedSampleIds.length >= MAX_TRAINING_SAMPLES ? " — cap reached" : ""}
              </span>
            </div>
          </div>
          {dna && (
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "8px" }}>CONFIDENCE</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>{dna.training_confidence || "?"}<span style={{ fontSize: "13px", color: C.textFaint, fontWeight: 500 }}> / 10</span></div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: !dna ? C.textFaint : (newSampleCount > 0 || dnaOutOfDate ? C.warning : C.success), display: "inline-block" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: !dna ? C.textFaint : (newSampleCount > 0 || dnaOutOfDate ? C.warning : C.success) }}>
              {!dna ? "NO DNA YET" : (newSampleCount > 0 || dnaOutOfDate) ? `${newSampleCount} NEW, NOT MERGED` : "UP TO DATE"}
            </span>
          </div>
        </div>
      </div>

      {warningLevel && (
        <div style={{
          fontSize: "12px", color: C.warning, background: C.warningDim, border: "1px solid #3a2f10",
          borderRadius: "8px", padding: "12px 16px", marginBottom: "18px", lineHeight: "1.5",
        }}>
          More samples aren't automatically better. You're at {sampleCount} — add scripts that reveal a different side of your comedy, not more of the same.
        </div>
      )}

      {/* ---- 01 Samples: add ---- */}

      {avoidNotes?.length > 0 && (
        <div style={{ ...S.card, marginBottom: "18px", borderLeft: `3px solid ${C.danger}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700 }}>AVOID LIST</div>
            <span style={{ fontSize: "10px", color: C.textFaint }}>{avoidNotes.length}/15</span>
          </div>
          {avoidNotes.map((n) => (
            <div key={n.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, fontSize: "12px", color: C.textSecondary, lineHeight: "1.6" }}>— {n.note}</div>
              <button onClick={() => deleteAvoidNote(n.id)} style={{ border: "none", background: "transparent", color: C.textMuted, fontSize: "17px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }} aria-label="Delete Avoid note">×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.card, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: addingSample ? "16px" : 0 }}>
          <span style={S.sectionLabel}>ADD COMEDY SAMPLE</span>
          <SecondaryButton onClick={() => setAddingSample(!addingSample)} style={{ padding: "7px 14px", fontSize: "11px" }}>
            {addingSample ? "cancel" : "+ add"}
          </SecondaryButton>
        </div>
        {addingSample && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: C.textSecondary, marginBottom: "6px" }}>What should I call it?</div>
              <input
                value={sampleTitle}
                onChange={(e) => setSampleTitle(e.target.value)}
                placeholder="e.g. 'One of my best deadpan bits'"
                style={S.input}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.textSecondary, marginBottom: "6px" }}>What makes this representative?</div>
              <input
                value={sampleNotes}
                onChange={(e) => setSampleNotes(e.target.value)}
                placeholder="Optional — e.g. 'Funny but experimental'"
                style={S.input}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.textSecondary, marginBottom: "6px" }}>Paste script</div>
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="Paste the full script here..."
                rows={8}
                style={{ ...S.input, resize: "vertical", lineHeight: "1.6", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: C.textSecondary, marginBottom: "6px" }}>Format (optional)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSampleFormat(null)}
                  style={{
                    padding: "7px 13px", borderRadius: "100px",
                    border: sampleFormat === null ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    background: sampleFormat === null ? "rgba(240,180,41,0.1)" : C.surface1,
                    color: sampleFormat === null ? C.accent : C.textSecondary,
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
                        border: selected ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                        background: selected ? "rgba(240,180,41,0.1)" : C.surface1,
                        color: selected ? C.accent : C.textSecondary,
                        fontSize: "11px", fontWeight: selected ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {f.icon} {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: C.textFaint, lineHeight: "1.5" }}>
              Use samples that represent how you actually want SKIT GEN to sound.
            </div>
            <PrimaryButton onClick={addSample} disabled={!sampleText.trim()}>
              Add Sample
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* ---- 02 Training ---- */}
      {sampleCount > 0 && (
        <div style={{ ...S.card, marginBottom: "18px" }}>
          <span style={{ ...S.sectionLabel, marginBottom: "14px" }}>TRAINING</span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <PrimaryButton
              onClick={analyzeAllPending}
              disabled={analyzingAll || buildingDNA || unanalyzedCount === 0}
              style={{ flex: "1 1 auto", minWidth: "160px" }}
            >
              {analyzingAll
                ? (analyzeProgress ? `Analyzing ${analyzeProgress.current} of ${analyzeProgress.total}...` : "Analyzing your comedy...")
                : unanalyzedCount === 0 ? "All Samples Analyzed" : `Analyze ${unanalyzedCount} New Sample${unanalyzedCount === 1 ? "" : "s"}`}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => buildDNA()}
              disabled={buildingDNA || analyzingAll || analyzedCount === 0}
              style={{
                flex: "1 1 auto", minWidth: "160px",
                borderColor: dnaOutOfDate ? C.accent : C.border,
                color: dnaOutOfDate ? C.accent : C.textPrimary,
              }}
            >
              {buildingDNA ? "Updating DNA..." : !dna ? "Build Comedy DNA" : `Update Comedy DNA (${newSampleCount} new)`}
            </SecondaryButton>
          </div>

          {dna && (
            <GhostButton
              onClick={() => buildDNA(null, true)}
              disabled={buildingDNA || analyzingAll || analyzedCount === 0}
              style={{ marginTop: "12px", color: C.textFaint }}
            >
              full rebuild from all {analyzedCount} samples
            </GhostButton>
          )}

          <GhostButton
            onClick={clearAll}
            disabled={buildingDNA || analyzingAll}
            style={{ marginTop: "12px", color: C.textFaint }}
          >
            reset — clear all samples & Comedy DNA
          </GhostButton>

          {trainingStatus && (
            <div style={{
              marginTop: "12px", padding: "10px 12px", borderRadius: "6px",
              background: C.surface1, border: `1px solid ${C.borderSoft}`, fontSize: "12px",
              color: trainingStatus.includes("successfully") ? C.success
                : trainingStatus.toLowerCase().includes("rate limited") ? C.warning
                : C.textSecondary,
              lineHeight: "1.5",
            }}>
              {trainingStatus}
            </div>
          )}
        </div>
      )}

      {dnaError && (
        <div style={{ color: C.danger, fontSize: "13px", marginBottom: "18px", padding: "12px 16px", background: C.dangerDim, border: "1px solid #3a1a1e", borderRadius: "8px" }}>
          {dnaError}
        </div>
      )}

      {sampleCount > 0 && (
        <div style={S.section}>
          <span style={S.sectionLabel}>SAMPLES ({sampleCount})</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {samples.map((sample) => {
              const isIncluded = includedSampleIds.includes(sample.id);
              return (
                <div key={sample.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#ddd" }}>{sample.title}</div>
                        <SampleStatusBadge sample={sample} isIncluded={isIncluded} />
                        {sample.format && (
                          <span style={{ ...S.chip, fontSize: "10px", padding: "3px 10px" }}>
                            {FORMATS.find((f) => f.id === sample.format)?.label || sample.format}
                          </span>
                        )}
                      </div>
                      {sample.notes && <div style={{ fontSize: "11px", color: C.textFaint, marginBottom: "6px", fontStyle: "italic" }}>{sample.notes}</div>}
                      {sample.analysis ? (
                        <>
                          <div style={{ fontSize: "12px", color: C.textSecondary, lineHeight: "1.5", marginBottom: "6px" }}>{sample.analysis.summary}</div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ ...S.chip, fontSize: "10px", padding: "3px 10px" }}>{sample.analysis.primary_comedy_instinct}</span>
                            <span style={{ ...S.chip, fontSize: "10px", padding: "3px 10px", color: C.success }}>{sample.analysis.comedy_mode_candidate}</span>
                            <span style={{ ...S.chip, fontSize: "10px", padding: "3px 10px" }}>strength {sample.analysis.representative_strength}/10</span>
                          </div>
                        </>
                      ) : (
                        sample.analysis_error && (
                          <div style={{ fontSize: "11px", color: C.danger, marginTop: "2px", lineHeight: "1.5" }}>
                            {sample.analysis_error}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <GhostButton onClick={() => handleCopySample(sample)} style={{ color: copiedSampleId === sample.id ? C.success : C.textMuted }}>
                        {copiedSampleId === sample.id ? "copied ✓" : "copy"}
                      </GhostButton>
                      {sample.analysis && (
                        <GhostButton onClick={() => setExpandedSampleId(expandedSampleId === sample.id ? null : sample.id)} style={{ color: C.textMuted }}>
                          {expandedSampleId === sample.id ? "hide analysis" : "view analysis"}
                        </GhostButton>
                      )}
                      {sample.analysis && (
                        <GhostButton onClick={() => reanalyzeSample(sample)} style={{ color: C.textMuted }}>reanalyze</GhostButton>
                      )}
                    </div>
                    <GhostButton
                      danger
                      onClick={() => handleDeleteClick(sample.id)}
                      style={{ color: confirmDeleteId === sample.id ? C.danger : C.textFaint, fontWeight: confirmDeleteId === sample.id ? 700 : 500 }}
                    >
                      {confirmDeleteId === sample.id ? "confirm delete?" : "delete"}
                    </GhostButton>
                  </div>

                  {expandedSampleId === sample.id && sample.analysis && (
                    <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.borderSoft}`, fontSize: "12px", color: C.textSecondary, lineHeight: "1.7" }}>
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
          <span style={S.sectionLabel}>YOUR COMEDY DNA</span>

          <div style={{ ...S.card, marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "10px" }}>CORE COMEDIC BRAIN</div>
            <p style={{ fontSize: "14px", color: "#ddd", lineHeight: "1.7", margin: "0 0 10px" }}>{dna.core_identity?.core_comedic_brain}</p>
            {dna.core_identity?.one_sentence_summary && (
              <p style={{ fontSize: "13px", color: C.textSecondary, fontStyle: "italic", margin: 0 }}>{dna.core_identity.one_sentence_summary}</p>
            )}
          </div>

          {dna.strongest_comedic_instincts?.length > 0 && (
            <div style={{ ...S.card, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "14px" }}>STRONGEST INSTINCTS</div>
              {dna.strongest_comedic_instincts.map((inst, i) => (
                <div key={i} style={{ marginBottom: i < dna.strongest_comedic_instincts.length - 1 ? "16px" : 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#ddd", marginBottom: "4px" }}>{inst.instinct}</div>
                  <StatBar label="" value={inst.strength} />
                  <div style={{ fontSize: "12px", color: C.textSecondary, lineHeight: "1.5", marginTop: "-4px" }}>{inst.description}</div>
                </div>
              ))}
            </div>
          )}

          {dna.comedy_modes?.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <span style={{ ...S.sectionLabel, marginBottom: "8px" }}>COMEDY MODES</span>
              {dna.comedy_modes.map((mode, i) => (
                <div key={i} style={{ ...S.card, marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#eee" }}>{mode.name}</span>
                    <span style={{ ...S.chip, fontSize: "10px" }}>{mode.strength}/10</span>
                  </div>
                  <p style={{ fontSize: "12px", color: C.textSecondary, lineHeight: "1.6", margin: "0 0 10px" }}>{mode.description}</p>
                  {mode.when_to_use?.length > 0 && (
                    <div style={{ fontSize: "11px", color: C.textSecondary, marginBottom: "6px" }}><strong style={{ color: "#999" }}>When it works:</strong> {mode.when_to_use.join(", ")}</div>
                  )}
                  {mode.delivery_style && (
                    <div style={{ fontSize: "11px", color: C.textSecondary, marginBottom: "6px" }}><strong style={{ color: "#999" }}>Delivery:</strong> {mode.delivery_style}</div>
                  )}
                  {mode.escalation_style && (
                    <div style={{ fontSize: "11px", color: C.textSecondary, marginBottom: "6px" }}><strong style={{ color: "#999" }}>Escalation:</strong> {mode.escalation_style}</div>
                  )}
                  {mode.best_formats?.length > 0 && (
                    <div style={{ fontSize: "11px", color: C.textSecondary }}><strong style={{ color: "#999" }}>Best formats:</strong> {mode.best_formats.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {dna.preferred_comedy_sources && (
            <div style={{ ...S.card, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "16px" }}>PREFERRED COMEDY SOURCES</div>
              {Object.entries(dna.preferred_comedy_sources).map(([key, val]) => (
                <StatBar key={key} label={key} value={val} />
              ))}
            </div>
          )}

          {dna.things_to_avoid?.length > 0 && (
            <div style={{ ...S.card, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "12px" }}>THINGS TO AVOID</div>
              {dna.things_to_avoid.map((item, i) => (
                <div key={i} style={{ fontSize: "12px", color: C.textSecondary, lineHeight: "1.6", marginBottom: "6px" }}>— {item}</div>
              ))}
            </div>
          )}

          {dna.contradictions_or_contextual_modes?.length > 0 && (
            <div style={{ ...S.card, marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "12px" }}>CONTEXTUAL DIFFERENCES</div>
              {dna.contradictions_or_contextual_modes.map((item, i) => (
                <div key={i} style={{ fontSize: "12px", color: C.textSecondary, lineHeight: "1.6", marginBottom: "6px" }}>{item}</div>
              ))}
            </div>
          )}

          {dna.training_summary && (
            <div style={{ ...S.card, borderLeft: `3px solid ${C.textMuted}` }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: C.textMuted, fontWeight: 700, marginBottom: "10px" }}>TRAINING SUMMARY</div>
              <p style={{ fontSize: "13px", color: C.textSecondary, lineHeight: "1.7", margin: 0 }}>{dna.training_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
