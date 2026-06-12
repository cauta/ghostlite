"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ThemeManifest } from "@/themes/theme.types";

// Palette + font hints used only to render the mini preview mockups below.
// Purely presentational — the live site is styled by each theme's own CSS.
const PREVIEWS: Record<
  string,
  { paper: string; ink: string; accent: string; serif: boolean }
> = {
  default:   { paper: "#ffffff", ink: "#1d1d1f", accent: "#0f6e56", serif: false },
  editorial: { paper: "#fbf9f4", ink: "#1c1815", accent: "#9a3412", serif: true  },
  solo:      { paper: "#f9f9f9", ink: "#111111", accent: "#4f46e5", serif: true  },
};
const FALLBACK_PREVIEW = { paper: "#ffffff", ink: "#1d1d1f", accent: "#2563eb", serif: false };

export default function ThemeSettingsForm({
  themes,
  active,
  config,
}: {
  themes: ThemeManifest[];
  active: string;
  config: Record<string, unknown>;
}) {
  const [selected, setSelected] = useState(active);
  const [savedTheme, setSavedTheme] = useState(active);
  const [progressBar, setProgressBar] = useState(config.progressBar !== false);
  const [darkMode, setDarkMode] = useState((config.darkMode as string | undefined) ?? "toggle");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [premiumModal, setPremiumModal] = useState<ThemeManifest | null>(null);

  const selectedTheme = themes.find((t) => t.name === selected);
  const dirty = selected !== savedTheme && selectedTheme?.tier !== "premium";
  const configDirty =
    progressBar !== (config.progressBar !== false) ||
    darkMode !== ((config.darkMode as string | undefined) ?? "toggle");

  useEffect(() => {
    if (msg?.kind !== "ok") return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const tasks: Promise<Response>[] = [];
      if (dirty && selectedTheme?.tier !== "premium") {
        tasks.push(
          fetch("/api/settings/theme", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: selected }),
          })
        );
      }
      if (configDirty) {
        tasks.push(
          fetch("/api/settings/theme", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: { progressBar, darkMode } }),
          })
        );
      }
      const results = await Promise.all(tasks);
      for (const res of results) {
        if (!res.ok) {
          throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
        }
      }
      if (dirty) setSavedTheme(selected);
      setMsg({ kind: "ok", text: "Theme settings saved." });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Theme</h1>
        <Link href="/admin/settings" className="admin-btn">
          Back
        </Link>
      </div>

      <p className="theme-picker-intro">
        Choose the reading theme for your public blog. The active theme styles
        every page your readers see.
      </p>

      {msg ? (
        <div
          className={msg.kind === "ok" ? "admin-success" : "admin-error"}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="theme-picker-grid" role="radiogroup" aria-label="Reading theme">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            checked={selected === theme.name}
            isLive={savedTheme === theme.name}
            onSelect={
              theme.tier === "premium"
                ? () => setPremiumModal(theme)
                : () => setSelected(theme.name)
            }
          />
        ))}
      </div>

      <div style={{ marginTop: 24, borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Reading experience</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>
            Dark mode
          </label>
          <select
            className="admin-input"
            value={darkMode}
            onChange={(e) => setDarkMode(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            <option value="toggle">User toggle (show sun/moon button)</option>
            <option value="system">Follow OS preference (no button)</option>
            <option value="off">Always light (disabled)</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={progressBar}
            onChange={(e) => setProgressBar(e.target.checked)}
          />
          <span>Show reading progress bar on post pages</span>
        </label>
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="admin-btn primary" onClick={save} disabled={busy || (!dirty && !configDirty)}>
          {busy ? "Saving…" : dirty || configDirty ? "Save changes" : "Saved"}
        </button>
      </div>

      {premiumModal ? (
        <PremiumModal theme={premiumModal} onClose={() => setPremiumModal(null)} />
      ) : null}
    </div>
  );
}

function ThemeCard({
  theme,
  checked,
  isLive,
  onSelect,
}: {
  theme: ThemeManifest;
  checked: boolean;
  isLive: boolean;
  onSelect: () => void;
}) {
  const isPremium = theme.tier === "premium";
  return (
    <label
      className={`theme-card${isPremium ? " premium" : ""}${checked && !isPremium ? " selected" : ""}`}
      onClick={isPremium ? onSelect : undefined}
    >
      {!isPremium && (
        <input
          type="radio"
          name="theme"
          className="theme-card-radio"
          checked={checked}
          onChange={onSelect}
        />
      )}
      <div style={{ position: "relative" }}>
        <ThemePreview themeName={theme.name} />
        {isPremium && (
          <div className="theme-card-lock" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}
      </div>
      <div className="theme-card-info">
        <div className="theme-card-head">
          <span className="theme-card-name">{theme.label}</span>
          {isPremium ? (
            <span className="theme-card-badge">Premium</span>
          ) : null}
          {isLive ? <span className="theme-card-live">Live</span> : null}
        </div>
        <p className="theme-card-desc">{theme.description}</p>
      </div>
    </label>
  );
}

function PremiumModal({ theme, onClose }: { theme: ThemeManifest; onClose: () => void }) {
  return (
    <div className="theme-premium-overlay" onClick={onClose} role="dialog" aria-modal aria-label="Premium theme">
      <div className="theme-premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-premium-modal-icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="theme-premium-modal-title">{theme.label} is a Premium Theme</h2>
        <p className="theme-premium-modal-body">
          Premium themes are beautifully crafted layouts available to Ghostlite Pro subscribers.
          Upgrade your plan to unlock <strong>{theme.label}</strong> and all future premium themes.
        </p>
        <div className="theme-premium-modal-actions">
          <button className="admin-btn primary" onClick={onClose}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// A tiny static mockup of the theme's home page — masthead plus two story
// cards. Decorative only; gives authors a feel for each theme at a glance.
function ThemePreview({ themeName }: { themeName: string }) {
  const p = PREVIEWS[themeName] ?? FALLBACK_PREVIEW;
  return (
    <div className="theme-preview" style={{ background: p.paper }} aria-hidden>
      <div
        className="theme-preview-masthead"
        style={{ color: p.ink, fontFamily: p.serif ? "Georgia, serif" : "inherit" }}
      >
        Aa
      </div>
      <div className="theme-preview-rule" style={{ background: p.accent }} />
      <div className="theme-preview-cards">
        {[0, 1].map((i) => (
          <div key={i} className="theme-preview-card">
            <div
              className="theme-preview-thumb"
              style={{ background: p.accent, opacity: 0.18 }}
            />
            <div className="theme-preview-line" style={{ background: p.ink }} />
            <div
              className="theme-preview-line short"
              style={{ background: p.ink, opacity: 0.38 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
