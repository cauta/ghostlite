"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt: number | null;
};

export default function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(post);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | "unpublish" | "delete" | null>(null);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
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
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
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
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Publish failed");
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
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Unpublish failed");
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

      <div className="admin-form">
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            value={draft.slug}
            onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
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
        <div>
          <label htmlFor="body">Body (Markdown)</label>
          <textarea
            id="body"
            value={draft.body}
            onChange={(e) => update("body", e.target.value)}
            spellCheck={false}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
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
