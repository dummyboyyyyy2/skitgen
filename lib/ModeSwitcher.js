"use client";

// Global "which generator am I in" switcher, shared by app/page.js (Solo)
// and app/couples/page.js (Couple). Plain <a href> navigation only — no
// client router, no shared state between the two apps. Replaces the old
// one-directional text links ("Couple Content Generator →" / "← SKIT GEN").
//
// This is intentionally the ONLY thing this component does. It does not
// know about Comedy DNA, Saved ideas, or either generator's own page-level
// tabs (GENERATE/COMEDY DNA on Solo; Generator/Comedy DNA/Saved on Couple) —
// those stay exactly where they already were, in each page's own header.

const ACCENT = "#f0b429"; // = SKIT GEN's --accent, and now also Couple's C.pink

const wrapStyle = {
  display: "inline-flex",
  gap: "3px",
  padding: "3px",
  background: "#111111",
  border: "1px solid #222222",
  borderRadius: "9px",
};

function tabStyle(isActive) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    minHeight: "40px", // matches this project's existing touch-target standard (see .btn-ghost in app/layout.js)
    padding: "0 13px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: isActive ? 800 : 600,
    fontFamily: "inherit",
    textDecoration: "none",
    whiteSpace: "nowrap",
    color: isActive ? "#14100a" : "#a0a0a0",
    background: isActive ? ACCENT : "transparent",
  };
}

// active: "solo" | "couple"
export default function ModeSwitcher({ active }) {
  return (
    <nav aria-label="Content mode" style={wrapStyle}>
      <a
        href="/"
        aria-current={active === "solo" ? "page" : undefined}
        style={tabStyle(active === "solo")}
      >
        <span aria-hidden="true">🎬</span> Solo
      </a>
      <a
        href="/couples"
        aria-current={active === "couple" ? "page" : undefined}
        style={tabStyle(active === "couple")}
      >
        <span aria-hidden="true">💑</span> Couple
      </a>
    </nav>
  );
}
