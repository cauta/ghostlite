"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavItem } from "@/lib/db";

type NavListEditorProps = {
  label: string;
  items: NavItem[];
  onChange: (items: NavItem[]) => void;
};

function NavListEditor({ label, items, onChange }: NavListEditorProps) {
  function update(index: number, field: keyof NavItem, value: string) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(next);
  }

  function add() {
    onChange([...items, { label: "", url: "/" }]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{label}</h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 8 }}>No items yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 8, alignItems: "center" }}
            >
              <input
                className="admin-input"
                placeholder="Label"
                value={item.label}
                onChange={(e) => update(i, "label", e.target.value)}
              />
              <input
                className="admin-input"
                placeholder="URL"
                value={item.url}
                onChange={(e) => update(i, "url", e.target.value)}
              />
              <button
                type="button"
                className="admin-btn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Move up"
                style={{ padding: "4px 8px", minWidth: 28 }}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                title="Move down"
                style={{ padding: "4px 8px", minWidth: 28 }}
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => remove(i)}
                title="Remove"
                style={{ padding: "4px 8px", minWidth: 28, color: "#d32" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="admin-btn" onClick={add}>
        + Add item
      </button>
    </div>
  );
}

export default function NavigationSettingsForm({
  initialPrimary,
  initialSecondary,
}: {
  initialPrimary: NavItem[];
  initialSecondary: NavItem[];
}) {
  const [primary, setPrimary] = useState<NavItem[]>(initialPrimary);
  const [secondary, setSecondary] = useState<NavItem[]>(initialSecondary);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/navigation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary, secondary }),
      });
      if (!res.ok) {
        throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
      }
      setMsg({ kind: "ok", text: "Navigation saved." });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Navigation</h1>
        <Link href="/admin/settings" className="admin-btn">
          Back
        </Link>
      </div>

      <p style={{ color: "#6b6b6b", fontSize: 14, marginBottom: 24 }}>
        Configure the links shown in your site header (primary) and footer (secondary).
      </p>

      {msg ? (
        <div
          className={msg.kind === "ok" ? "admin-success" : "admin-error"}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      ) : null}

      <NavListEditor label="Primary navigation (header)" items={primary} onChange={setPrimary} />
      <NavListEditor label="Secondary navigation (footer)" items={secondary} onChange={setSecondary} />

      <div>
        <button className="admin-btn primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save navigation"}
        </button>
      </div>
    </div>
  );
}
