"use client";

import Link from "next/link";
import { useState } from "react";
import type { ThemeManifest } from "@/themes/theme.types";

// Palette + font hints used only to render the mini preview mockups below.
// Purely presentational — the live site is styled by each theme's own CSS.
const PREVIEWS: Record<
  string,
  { paper: string; ink: string; accent: string; serif: boolean }
> = {
  default: { paper: "#ffffff", ink: "#1d1d1f", accent: "#0f6e56", serif: false },
  editorial: { paper: "#fbf9f4", ink: "#1c1815", accent: "#9a3412", serif: true },
};
const FALLBACK_PREVIEW = { paper: "#ffffff", ink: "#1d1d1f", accent: "#2563eb", serif: false };

export default function ThemeSettingsForm({
  themes,
  active,
}: {
  themes: ThemeManifest[];
  active: string;
}) {
  const [selected, setSelected] = useState(active);
  const [savedTheme, setSavedTheme] = useState(active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const dirty = selected !== savedTheme;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: selected }),
      });
      if (!res.ok) {
        throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
      }
      setSavedTheme(selected);
      setMsg({ kind: "ok", text: "Theme updated. Reload your public site to see it." });
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
            onSelect={() => setSelected(theme.name)}
          />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="admin-btn primary" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving…" : dirty ? "Apply theme" : "Saved"}
        </button>
      </div>
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
  return (
    <label className={`theme-card${checked ? " selected" : ""}`}>
      <input
        type="radio"
        name="theme"
        className="theme-card-radio"
        checked={checked}
        onChange={onSelect}
      />
      <ThemePreview themeName={theme.name} />
      <div className="theme-card-info">
        <div className="theme-card-head">
          <span className="theme-card-name">{theme.label}</span>
          {theme.tier === "premium" ? (
            <span className="theme-card-badge">Premium</span>
          ) : null}
          {isLive ? <span className="theme-card-live">Live</span> : null}
        </div>
        <p className="theme-card-desc">{theme.description}</p>
      </div>
    </label>
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
