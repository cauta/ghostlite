"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt: number | null;
};

type EditorMode = "write" | "preview" | "split";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(post);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | "unpublish" | "delete" | null>(null);
  const [slugTouched, setSlugTouched] = useState(() => {
    const auto = slugify(post.title);
    return post.slug !== auto && post.slug !== "";
  });
  const [editorMode, setEditorMode] = useState<EditorMode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll between editor and preview panes in split mode
  useEffect(() => {
    if (editorMode !== "split") return;
    const ta = textareaRef.current;
    const pv = previewRef.current;
    if (!ta || !pv) return;

    let fromEditor = false;
    let fromPreview = false;

    function onEditorScroll() {
      if (fromPreview) return;
      fromEditor = true;
      const pct = ta!.scrollTop / Math.max(1, ta!.scrollHeight - ta!.clientHeight);
      pv!.scrollTop = pct * (pv!.scrollHeight - pv!.clientHeight);
      requestAnimationFrame(() => { fromEditor = false; });
    }

    function onPreviewScroll() {
      if (fromEditor) return;
      fromPreview = true;
      const pct = pv!.scrollTop / Math.max(1, pv!.scrollHeight - pv!.clientHeight);
      ta!.scrollTop = pct * (ta!.scrollHeight - ta!.clientHeight);
      requestAnimationFrame(() => { fromPreview = false; });
    }

    ta.addEventListener("scroll", onEditorScroll, { passive: true });
    pv.addEventListener("scroll", onPreviewScroll, { passive: true });
    return () => {
      ta.removeEventListener("scroll", onEditorScroll);
      pv.removeEventListener("scroll", onPreviewScroll);
    };
  }, [editorMode]);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleTitleChange(value: string) {
    update("title", value);
    if (!slugTouched) {
      update("slug", slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    update("slug", value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  }

  // Wraps selected text (or placeholder) with before/after markers
  function wrap(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const body = draft.body;
    const sel = body.slice(s, e) || placeholder;
    const next = body.slice(0, s) + before + sel + after + body.slice(e);
    update("body", next);
    const pos = s + before.length + sel.length;
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
  }

  // Prepends a prefix to the start of the current line
  function linePrefix(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const body = draft.body;
    const lineStart = body.lastIndexOf("\n", s - 1) + 1;
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    update("body", next);
    const pos = s + prefix.length;
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          title: draft.title,
          excerpt: draft.excerpt,
          body: draft.body,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Publish failed");
      update("status", "published");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function unpublish() {
    setBusy("unpublish");
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/unpublish`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Unpublish failed");
      update("status", "draft");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function destroy() {
    if (!confirm("Delete this post permanently?")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/admin/posts");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const tbBtn = (label: string, title: string, action: () => void) => (
    <button type="button" className="admin-editor-tb-btn" title={title} onClick={action}>
      {label}
    </button>
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1>Edit post</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`admin-pill ${draft.status}`}>{draft.status}</span>
          {savedAt ? (
            <span style={{ fontSize: 12, color: "#6b6b6b" }}>
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          ) : null}
          <Link href="/admin/posts" className="admin-btn">Back</Link>
        </div>
      </div>

      {error ? <div className="admin-error" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="admin-form" style={{ maxWidth: "none" }}>
        {/* Metadata fields */}
        <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={draft.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              value={draft.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="excerpt">Excerpt</label>
            <input
              id="excerpt"
              value={draft.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
              placeholder="One-sentence summary shown on the home page"
            />
          </div>
        </div>

        {/* Markdown editor */}
        <div>
          <label style={{ fontSize: 13, color: "var(--a-fg-muted)", display: "block", marginBottom: 6 }}>
            Body (Markdown)
          </label>
          <div className="admin-editor-wrap">
            {/* Toolbar + mode tabs */}
            <div className="admin-editor-header">
              <div className="admin-editor-toolbar">
                {tbBtn("B", "Bold", () => wrap("**", "**", "bold text"))}
                {tbBtn("I", "Italic", () => wrap("*", "*", "italic text"))}
                {tbBtn("S̶", "Strikethrough", () => wrap("~~", "~~", "strikethrough"))}
                <span className="admin-editor-tb-sep" />
                {tbBtn("H1", "Heading 1", () => linePrefix("# "))}
                {tbBtn("H2", "Heading 2", () => linePrefix("## "))}
                {tbBtn("H3", "Heading 3", () => linePrefix("### "))}
                <span className="admin-editor-tb-sep" />
                {tbBtn("🔗", "Link", () => wrap("[", "](https://)", "link text"))}
                {tbBtn("🖼", "Image", () => wrap("![", "](https://)", "alt text"))}
                <span className="admin-editor-tb-sep" />
                {tbBtn("`", "Inline code", () => wrap("`", "`", "code"))}
                {tbBtn("```", "Code block", () => wrap("```\n", "\n```", "code here"))}
                <span className="admin-editor-tb-sep" />
                {tbBtn("❝", "Blockquote", () => linePrefix("> "))}
                {tbBtn("•", "Bullet list", () => linePrefix("- "))}
                {tbBtn("1.", "Numbered list", () => linePrefix("1. "))}
                <span className="admin-editor-tb-sep" />
                {tbBtn("―", "Horizontal rule", () => wrap("\n\n---\n\n", "", ""))}
              </div>
              <div className="admin-editor-tabs">
                {(["write", "preview", "split"] as EditorMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={editorMode === m ? "active" : ""}
                    onClick={() => setEditorMode(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor / Preview panes */}
            <div className={`admin-editor-body ${editorMode}`}>
              {editorMode !== "preview" && (
                <textarea
                  ref={textareaRef}
                  id="body"
                  value={draft.body}
                  onChange={(e) => update("body", e.target.value)}
                  spellCheck={false}
                  placeholder="Write your post in Markdown…"
                />
              )}
              {editorMode !== "write" && (
                <div
                  ref={previewRef}
                  className="admin-editor-preview"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body) || "<p style=\"color:var(--a-fg-muted)\">Nothing to preview yet.</p>" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", maxWidth: "none" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="admin-btn primary" onClick={save} disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            {draft.status !== "published" ? (
              <button type="button" className="admin-btn" onClick={publish} disabled={busy !== null}>
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
            ) : (
              <button type="button" className="admin-btn" onClick={unpublish} disabled={busy !== null}>
                {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
              </button>
            )}
          </div>
          <button type="button" className="admin-btn danger" onClick={destroy} disabled={busy !== null}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
