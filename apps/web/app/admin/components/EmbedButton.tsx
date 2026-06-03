"use client";

import { useState, useRef } from "react";
import type { Editor } from "@tiptap/core";

interface EmbedResult {
  type: "iframe" | "link";
  src?: string;
  href?: string;
  label?: string;
  provider: string;
}

interface Props {
  editor: Editor;
}

export function EmbedButton({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setUrl("");
    setError("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function close() {
    setOpen(false);
    setUrl("");
    setError("");
  }

  async function handleInsert() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/oembed?url=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as EmbedResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to resolve embed");
        return;
      }
      editor.chain().focus().insertEmbed(data).run();
      close();
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Insert embed (YouTube, Vimeo, CodePen, Twitter/X)"
        className="tiptap-embed-btn"
        onClick={openDialog}
        aria-label="Insert embed"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="m10 9 5 3-5 3V9z" />
        </svg>
      </button>

      {open && (
        <div
          className="embed-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Insert embed"
          onClick={close}
        >
          <div className="embed-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="embed-dialog-title">Insert Embed</h3>
            <p className="embed-dialog-hint">
              Paste a YouTube, Vimeo, CodePen, or Twitter/X URL
            </p>
            <input
              ref={inputRef}
              type="url"
              className="embed-dialog-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInsert();
                if (e.key === "Escape") close();
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={loading}
            />
            {error && <p className="embed-dialog-error">{error}</p>}
            <div className="embed-dialog-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={close}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={handleInsert}
                disabled={loading || !url.trim()}
              >
                {loading ? "Loading…" : "Insert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
