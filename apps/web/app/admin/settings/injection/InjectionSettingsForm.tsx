"use client";

import Link from "next/link";
import { useState } from "react";

type Initial = { headCss: string; headJs: string; footerJs: string };

export default function InjectionSettingsForm({ initial }: { initial: Initial }) {
  const [headCss, setHeadCss] = useState(initial.headCss);
  const [headJs, setHeadJs] = useState(initial.headJs);
  const [footerJs, setFooterJs] = useState(initial.footerJs);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/injection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headCss, headJs, footerJs }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Code injection</h1>
        <Link href="/admin/settings" className="admin-btn">Back</Link>
      </div>

      <form className="admin-form" onSubmit={save}>
        {msg ? (
          <div className={msg.kind === "ok" ? "admin-success" : "admin-error"}>{msg.text}</div>
        ) : null}

        <div>
          <label htmlFor="headCss">Site header CSS</label>
          <textarea
            id="headCss"
            value={headCss}
            onChange={(e) => setHeadCss(e.target.value)}
            rows={8}
            placeholder="/* Custom CSS injected into <head> of every public page */"
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </div>

        <div>
          <label htmlFor="headJs">Site header HTML / JS</label>
          <textarea
            id="headJs"
            value={headJs}
            onChange={(e) => setHeadJs(e.target.value)}
            rows={6}
            placeholder="<!-- Scripts or tags injected into <head> -->"
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </div>

        <div>
          <label htmlFor="footerJs">Site footer HTML / JS</label>
          <textarea
            id="footerJs"
            value={footerJs}
            onChange={(e) => setFooterJs(e.target.value)}
            rows={6}
            placeholder="<!-- Scripts injected before </body> -->"
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </div>

        <p style={{ fontSize: 13, color: "#6b6b6b", margin: "0 0 12px" }}>
          Code is injected as-is on every public page. Admin pages are not affected.
        </p>

        <button type="submit" className="admin-btn primary" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
