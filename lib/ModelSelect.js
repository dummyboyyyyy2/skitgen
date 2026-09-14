"use client";

import { useState, useEffect, useRef } from "react";

// Live OpenRouter model picker, shared by app/page.js (Solo) and
// app/couples/page.js (Couple) — pure provider chrome, same as ModeSwitcher.
// Options come from GET /api/models, which OpenRouter already filters down
// to free-tier models only (including Google's free Gemini variants) —
// never hardcoded here. The chosen model is persisted per-app via
// /api/model-settings so it survives a refresh.
//
// This component owns its own fetch/save lifecycle. The parent doesn't hold
// the list or do the persistence — it just receives the current model id via
// onChange (called once on initial load, then again on every user change) so
// it can thread that id into its own script/refine calls.

const wrapStyle = {
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

// app: "solo" | "couple" — which app's saved selection to load/persist.
// onChange: (modelId: string) => void — called on initial load and on every change.
export default function ModelSelect({ app, onChange }) {
  const [models, setModels] = useState([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
        const initial = saved || list[0]?.id || "";
        setValue(initial);
        onChangeRef.current?.(initial);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load OpenRouter models.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [app]);

  const handleChange = async (e) => {
    const next = e.target.value;
    setValue(next);
    onChangeRef.current?.(next);
    setSaving(true);
    try {
      await fetch("/api/model-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, model: next }),
      });
    } catch {
      // Non-fatal — the choice still applies to this session even if it
      // doesn't persist for next time.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>Model (free)</span>
      <select value={value} onChange={handleChange} disabled={loading || !!error} style={selectStyle}>
        {loading && <option value="">Loading models…</option>}
        {error && <option value="">Couldn&apos;t load models</option>}
        {!loading && !error && models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {saving && <span style={statusStyle}>saving…</span>}
      {error && <span style={{ ...statusStyle, color: "#e05a5a" }}>{error}</span>}
    </div>
  );
}
