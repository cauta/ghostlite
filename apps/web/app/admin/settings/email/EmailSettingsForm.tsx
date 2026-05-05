"use client";

import Link from "next/link";
import { useState } from "react";

type Provider = "none" | "resend" | "mailgun" | "sendgrid";

type Initial =
  | { provider: "none" }
  | { provider: "resend" | "sendgrid"; hasKey: boolean; fromAddress: string; fromName: string }
  | { provider: "mailgun"; hasKey: boolean; domain: string; region: "us" | "eu"; fromAddress: string; fromName: string };

export default function EmailSettingsForm({ initial }: { initial: Initial }) {
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [apiKey, setApiKey] = useState("");
  const [hasKey] = useState(initial.provider !== "none" && initial.hasKey);
  const [fromAddress, setFromAddress] = useState(
    initial.provider === "none" ? "" : initial.fromAddress,
  );
  const [fromName, setFromName] = useState(initial.provider === "none" ? "" : initial.fromName);
  const [domain, setDomain] = useState(initial.provider === "mailgun" ? initial.domain : "");
  const [region, setRegion] = useState<"us" | "eu">(
    initial.provider === "mailgun" ? initial.region : "us",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = { provider };
      if (provider !== "none") {
        body.fromAddress = fromAddress;
        body.fromName = fromName;
        // Only send key if user typed one (otherwise keep existing)
        if (apiKey) body.apiKey = apiKey;
        if (provider === "mailgun") {
          body.domain = domain;
          body.region = region;
        }
      }
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setMsg({ kind: "ok", text: "Saved." });
      setApiKey("");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/email/verify", { method: "POST" });
      const data = await res.json();
      if (data.ok) setMsg({ kind: "ok", text: "Credentials verified." });
      else setMsg({ kind: "err", text: data.error ?? "Verification failed" });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const to = prompt("Send test email to which address?");
    if (!to) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (res.ok) setMsg({ kind: "ok", text: `Test sent (id: ${data.id ?? "n/a"}).` });
      else setMsg({ kind: "err", text: data.error ?? "Test failed" });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Email settings</h1>
        <Link href="/admin/settings" className="admin-btn">Back</Link>
      </div>

      <form className="admin-form" onSubmit={save}>
        {msg ? (
          <div className={msg.kind === "ok" ? "admin-success" : "admin-error"}>{msg.text}</div>
        ) : null}

        <div>
          <label htmlFor="provider">Provider</label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
          >
            <option value="none">None (disable email)</option>
            <option value="resend">Resend</option>
            <option value="mailgun">Mailgun</option>
            <option value="sendgrid">SendGrid</option>
          </select>
        </div>

        {provider !== "none" ? (
          <>
            <div>
              <label htmlFor="apiKey">
                API key {hasKey ? "(leave blank to keep existing)" : ""}
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? "••••••••" : "Paste your API key"}
                autoComplete="new-password"
              />
            </div>

            {provider === "mailgun" ? (
              <>
                <div>
                  <label htmlFor="domain">Mailgun domain</label>
                  <input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="mg.yourblog.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="region">Region</label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value as "us" | "eu")}
                  >
                    <option value="us">US</option>
                    <option value="eu">EU</option>
                  </select>
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="fromAddress">From address</label>
              <input
                id="fromAddress"
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="hello@yourblog.com"
                required
              />
            </div>
            <div>
              <label htmlFor="fromName">From name (optional)</label>
              <input
                id="fromName"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="My Blog"
              />
            </div>
          </>
        ) : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="admin-btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          {provider !== "none" && hasKey ? (
            <>
              <button type="button" className="admin-btn" onClick={verify} disabled={busy}>
                Verify credentials
              </button>
              <button type="button" className="admin-btn" onClick={sendTest} disabled={busy}>
                Send test
              </button>
            </>
          ) : null}
        </div>

        <p style={{ fontSize: 13, color: "#6b6b6b", marginTop: 16 }}>
          Each provider requires DNS records (SPF, DKIM) for deliverability. Check your provider&apos;s
          docs after saving — emails will land in spam without them.
        </p>
      </form>
    </div>
  );
}
