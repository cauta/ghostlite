"use client";

import Link from "next/link";
import { useState } from "react";

const DEFAULT_HINT = `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://your-site.com/sitemap.xml`;

export default function SeoSettingsForm({ initialRobots }: { initialRobots: string | null }) {
  const [robots, setRobots] = useState(initialRobots ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robots }),
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
        <h1>SEO settings</h1>
        <Link href="/admin/settings" className="admin-btn">Back</Link>
      </div>

      <form className="admin-form" onSubmit={save}>
        {msg ? (
          <div className={msg.kind === "ok" ? "admin-success" : "admin-error"}>{msg.text}</div>
        ) : null}
        <div>
          <label htmlFor="robots">robots.txt override</label>
          <p style={{ fontSize: 13, color: "#6b6b6b", margin: "4px 0 8px" }}>
            Leave blank to use the default (allows all crawlers, blocks /admin/, links to sitemap).
            The file is served at{" "}
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
              /robots.txt
            </a>
            .
          </p>
          <textarea
            id="robots"
            value={robots}
            onChange={(e) => setRobots(e.target.value)}
            placeholder={DEFAULT_HINT}
            rows={10}
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </div>
        <div>
          <button type="submit" className="admin-btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
