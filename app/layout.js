import RegisterSW from "./register-sw";

export const metadata = {
  title: "SKIT GEN",
  description: "Your comedy, your voice.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SKIT GEN",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

// Design system: CSS variables + shared utility classes.
// Kept in one global stylesheet (no new dependencies) so button/card/input
// treatments stay consistent across app/page.js instead of being redefined
// as one-off inline style objects everywhere.
const GLOBAL_CSS = `
  :root {
    --bg-0: #0a0a0a;
    --surface-1: #0d0d0d;
    --surface-2: #111111;
    --surface-3: #151515;
    --surface-4: #1a1a1a;
    --border: #222222;
    --border-soft: #1a1a1a;
    --text-primary: #f5f5f5;
    --text-secondary: #a0a0a0;
    --text-muted: #666666;
    --text-faint: #3d3d3d;

    --accent: #f0b429;
    --accent-strong: #ffc94d;
    --accent-dim: #7a5f18;
    --accent-wash: rgba(240, 180, 41, 0.08);

    --success: #34d399;
    --success-dim: #163326;
    --warning: #f2a93b;
    --warning-dim: #2e260f;
    --danger: #f0575f;
    --danger-dim: #2a1114;

    --radius-sm: 5px;
    --radius-md: 8px;
    --radius-lg: 10px;

    --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-script: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }

  * { box-sizing: border-box; }

  html, body {
    background: var(--bg-0);
    color: var(--text-primary);
    margin: 0;
    -webkit-font-smoothing: antialiased;
    overflow-wrap: break-word;
  }

  body {
    font-family: var(--font-ui);
    overflow-x: hidden;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    /* Installed-app feel: don't let the whole page bounce/refresh on overscroll. */
    overscroll-behavior-y: none;
  }

  img, svg { max-width: 100%; }

  ::selection { background: var(--accent-dim); color: var(--text-primary); }

  button, input, textarea { font-family: inherit; }

  textarea { font-family: var(--font-ui); }

  button {
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  input:focus, textarea:focus { border-color: var(--text-muted) !important; }

  .btn-primary {
    background: var(--accent);
    color: #14100a;
    border: 1px solid var(--accent);
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent-strong); border-color: var(--accent-strong); }
  .btn-primary:disabled { background: var(--surface-2); color: var(--text-faint); border-color: var(--border-soft); cursor: not-allowed; }

  .btn-secondary {
    background: var(--surface-2);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover:not(:disabled) { border-color: var(--text-muted); }
  .btn-secondary:disabled { color: var(--text-faint); cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
  }
  .btn-ghost:hover:not(:disabled) { color: var(--text-primary); }
  .btn-ghost:disabled { color: var(--text-faint); cursor: not-allowed; }

  .btn-danger-ghost {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid transparent;
  }
  .btn-danger-ghost:hover:not(:disabled) { color: var(--danger); }

  .idea-row { transition: border-color 0.15s ease, background-color 0.15s ease; }
  .idea-row:hover { border-color: var(--text-muted); background: var(--surface-2); }

  .format-card { transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease; }
  .format-card:hover:not(.is-selected) { border-color: var(--text-muted); }
  .format-card:active { transform: scale(0.98); }

  @keyframes pulse-dot {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
  .status-dot-pulse { animation: pulse-dot 1.6s ease-in-out infinite; }

  .format-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  /* Installed PWA on notched/rounded-corner phones: keep content clear of
     the status bar (statusBarStyle is black-translucent, so the header
     otherwise sits under it) and the home-indicator area at the bottom.
     max() falls back to the normal spacing on regular browsers/devices
     where the safe-area inset is 0. */
  .header-shell {
    padding-top: max(24px, env(safe-area-inset-top)) !important;
    padding-left: max(28px, env(safe-area-inset-left)) !important;
    padding-right: max(28px, env(safe-area-inset-right)) !important;
  }
  .page-shell {
    padding-left: max(20px, env(safe-area-inset-left)) !important;
    padding-right: max(20px, env(safe-area-inset-right)) !important;
    padding-bottom: calc(60px + env(safe-area-inset-bottom)) !important;
  }

  @media (max-width: 560px) {
    .format-grid { grid-template-columns: repeat(2, 1fr); }
    .page-shell { padding-left: max(16px, env(safe-area-inset-left)) !important; padding-right: max(16px, env(safe-area-inset-right)) !important; }
    .header-shell { padding-left: max(16px, env(safe-area-inset-left)) !important; padding-right: max(16px, env(safe-area-inset-right)) !important; }
  }

  /* Very small phones (SE, mini) — tighten up further */
  @media (max-width: 360px) {
    .page-shell { padding-left: max(14px, env(safe-area-inset-left)) !important; padding-right: max(14px, env(safe-area-inset-right)) !important; }
    .header-shell { padding-left: max(14px, env(safe-area-inset-left)) !important; padding-right: max(14px, env(safe-area-inset-right)) !important; }
  }

  /* Comfortable minimum touch targets on touch devices (Apple/Google both
     recommend ~44px). Only widen the hit area, not the visual box, via
     padding on the ghost/tab buttons that were tightest. */
  @media (pointer: coarse) {
    .btn-ghost, .btn-danger-ghost { min-height: 40px; display: inline-flex; align-items: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
