"use client";

import { useState, useEffect, useRef } from "react";

// Live OpenRouter model picker, shared by app/page.js (Solo) and
// app/couples/page.js (Couple) — pure provider chrome, same as ModeSwitcher.
// Options come from GET /api/models, which excludes Gemini specifically
// (Gemma stays — different model family) since direct Gemini access below
// covers that need without OpenRouter's shared free-tier rate limit.
//
// Also renders the OpenRouter-vs-direct-Gemini source toggle. Direct Gemini
// calls this app's own Gemini API key instead of OpenRouter — same free
// tier your Ideas/Tone calls already use, sharing OpenRouter's rate limit
// with nobody else's traffic. There's no per-call model choice on that path
// (Gemini isn't a marketplace of many providers' models the way OpenRouter
// is), so the dropdown hides itself when this is selected.
//
// Both the model choice and the source are persisted per-app via
// /api/model-settings so they survive a refresh.
//
// This component owns its own fetch/save lifecycle. The parent doesn't hold
// the list or do the persistence — it just receives the current model id via
// onChange (called once on initial load, then again on every user change),
// and the current source via onSourceChange (same calling pattern), so it
// can thread both into its own script/refine calls.

const wrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a7a7a",
  whiteSpace: "nowrap",
};

const selectStyle = {
  flex: "1 1 220px",
  minWidth: "160px",
  minHeight: "38px",
  padding: "0 10px",
  borderRadius: "7px",
  border: "1px solid #2a2a2a",
  background: "#141414",
  color: "#eaeaea",
  fontSize: "13px",
  fontFamily: "inherit",
};

const statusStyle = {
  fontSize: "11px",
  color: "#6a6a6a",
  whiteSpace: "nowrap",
};

function sourceButtonStyle(active) {
  return {
    padding: "7px 12px",
    borderRadius: "7px",
    border: active ? "1px solid #f0b429" : "1px solid #2a2a2a",
    background: active ? "rgba(240,180,41,0.12)" : "#141414",
    color: active ? "#f0b429" : "#9a9a9a",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
  };
}

// app: "solo" | "couple" — which app's saved selection to load/persist.
// onChange: (modelId: string) => void — called on initial load and on every change.
// onSourceChange: (source: "openrouter" | "gemini") => void — same calling pattern.
export default function ModelSelect({ app, onChange, onSourceChange }) {
  const [models, setModels] = useState([]);
  const [value, setValue] = useState("");
  const [source, setSource] = useState("openrouter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSourceChangeRef = useRef(onSourceChange);
  onSourceChangeRef.current = onSourceChange;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [modelsRes, settingsRes] = await Promise.all([
          fetch("/api/models"),
          fetch("/api/model-settings"),
        ]);
        const modelsData = await modelsRes.json().catch(() => ({}));
        const settingsData = await settingsRes.json().catch(() => ({}));
        if (cancelled) return;

        if (!modelsRes.ok) throw new Error(modelsData?.error || "Failed to load models.");
        const list = Array.isArray(modelsData.models) ? modelsData.models : [];
        setModels(list);

        const saved = settingsRes.ok ? settingsData?.[app] : null;
        // Prefer the saved selection; fall back to it being on the live list
        // is not required (server accepts anything), so a stale-but-valid
        // saved id still shows even if not the first alphabetically.
        const initialModel = saved?.model || list[0]?.id || "";
        const initialSource = saved?.source === "gemini" ? "gemini" : "openrouter";
        setValue(initialModel);
        setSource(initialSource);
        onChangeRef.current?.(initialModel);
        onSourceChangeRef.current?.(initialSource);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load OpenRouter models.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [app]);

  const persist = async (nextModel, nextSource) => {
    setSaving(true);
    try {
      await fetch("/api/model-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, model: nextModel, source: nextSource }),
      });
    } catch {
      // Non-fatal — the choice still applies to this session even if it
      // doesn't persist for next time.
    } finally {
      setSaving(false);
    }
  };

  const handleModelChange = (e) => {
    const next = e.target.value;
    setValue(next);
    onChangeRef.current?.(next);
    persist(next, source);
  };

  const handleSourceChange = (next) => {
    if (next === source) return;
    setSource(next);
    onSourceChangeRef.current?.(next);
    persist(value, next);
  };

  return (
    <div style={wrapStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>Generation Source</span>
        <button type="button" onClick={() => handleSourceChange("openrouter")} style={sourceButtonStyle(source === "openrouter")}>
          OpenRouter
        </button>
        <button type="button" onClick={() => handleSourceChange("gemini")} style={sourceButtonStyle(source === "gemini")}>
          Gemini (direct)
        </button>
        {saving && <span style={statusStyle}>saving…</span>}
      </div>
      {source === "openrouter" ? (
        <div style={rowStyle}>
          <span style={labelStyle}>Model (free)</span>
          <select value={value} onChange={handleModelChange} disabled={loading || !!error} style={selectStyle}>
            {loading && <option value="">Loading models…</option>}
            {error && <option value="">Couldn&apos;t load models</option>}
            {!loading && !error && models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {error && <span style={{ ...statusStyle, color: "#e05a5a" }}>{error}</span>}
        </div>
      ) : (
        <div style={statusStyle}>
          Uses this app&apos;s own free Gemini access directly — no OpenRouter, no shared rate limit with other apps&apos; traffic.
        </div>
      )}
    </div>
  );
}
