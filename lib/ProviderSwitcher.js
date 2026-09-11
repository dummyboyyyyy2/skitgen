"use client";

import { useState } from "react";

const styles = {
  wrap: {
    display: "inline-flex",
    gap: "3px",
    padding: "3px",
    background: "#111111",
    border: "1px solid #222222",
    borderRadius: "9px",
  },
  button: (active, disabled) => ({
    minHeight: "34px",
    padding: "0 10px",
    border: "none",
    borderRadius: "7px",
    background: active ? "#f0b429" : "transparent",
    color: active ? "#14100a" : "#a0a0a0",
    fontSize: "11px",
    fontWeight: active ? 800 : 600,
    fontFamily: "inherit",
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.65 : 1,
    whiteSpace: "nowrap",
  }),
};

export default function ProviderSwitcher({ app, provider, onChange }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function select(next) {
    if (next === provider || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, provider: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save provider setting.");
      onChange(data.provider || next);
    } catch (err) {
      setError(err?.message || "Failed to save provider setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div title={error || `AI provider${saving ? " — saving…" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <div style={styles.wrap} aria-label="AI provider">
        <button type="button" onClick={() => select("gemini")} disabled={saving} aria-pressed={provider === "gemini"} style={styles.button(provider === "gemini", saving)}>
          Gemini
        </button>
        <button type="button" onClick={() => select("anthropic")} disabled={saving} aria-pressed={provider === "anthropic"} style={styles.button(provider === "anthropic", saving)}>
          Anthropic
        </button>
      </div>
      {error && <span style={{ color: "#f0575f", fontSize: "10px" }} aria-live="polite">!</span>}
    </div>
  );
}
