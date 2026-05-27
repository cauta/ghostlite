"use client";

import { useState, useRef } from "react";
import type { TagWithCount } from "@/lib/db";

// Mirrors the server-side slugify so the preview updates as you type.
function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Tag = TagWithCount;
type EditState = { name: string; slug: string; slugTouched: boolean };

export default function TagsManager({ tags: initial }: { tags: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initial);
  // editingId: which row is in edit mode (null = none)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", slug: "", slugTouched: false });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // ── open edit row ──────────────────────────────────────────────────────────
  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditState({ name: tag.name, slug: tag.slug, slugTouched: false });
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function handleNameChange(value: string) {
    setEditState((s) => ({
      ...s,
      name: value,
      slug: s.slugTouched ? s.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setEditState((s) => ({
      ...s,
      slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      slugTouched: true,
    }));
  }

  // ── save rename ────────────────────────────────────────────────────────────
  async function saveEdit(id: string) {
    const { name, slug } = editState;
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug cannot be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      setTags((ts) =>
        ts.map((t) => (t.id === id ? { ...t, name: name.trim(), slug: slug.trim() } : t)),
      );
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  async function confirmAndDelete(tag: Tag) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Delete failed");
      }
      setTags((ts) => ts.filter((t) => t.id !== tag.id));
      setConfirmDelete(null);
    } catch (e) {
      setError((e as Error).message);
      setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Tags</h1>
      </div>

      <p style={{ color: "var(--a-fg-muted)", fontSize: 14, marginBottom: 20 }}>
        {tags.length === 0
          ? "No tags yet. Tags are created automatically when you add them to a post."
          : `${tags.length} tag${tags.length === 1 ? "" : "s"} — click a row to rename it.`}
      </p>

      {error ? (
        <div className="admin-error" style={{ marginBottom: 16 }}>{error}</div>
      ) : null}

      {tags.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th style={{ width: 100, textAlign: "right" }}>Posts</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) =>
              editingId === tag.id ? (
                // ── edit row ──────────────────────────────────────────────────
                <tr key={tag.id} style={{ background: "var(--a-bg)" }}>
                  <td>
                    <input
                      ref={nameRef}
                      className="admin-inline-input"
                      value={editState.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(tag.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      disabled={busy}
                      aria-label="Tag name"
                    />
                  </td>
                  <td>
                    <input
                      className="admin-inline-input"
                      value={editState.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(tag.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      disabled={busy}
                      aria-label="Tag slug"
                      style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}
                    />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--a-fg-muted)" }}>
                    {tag.postCount}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="admin-btn primary"
                        onClick={() => saveEdit(tag.id)}
                        disabled={busy}
                        style={{ padding: "4px 12px", fontSize: 13 }}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="admin-btn"
                        onClick={cancelEdit}
                        disabled={busy}
                        style={{ padding: "4px 12px", fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                // ── display row ───────────────────────────────────────────────
                <tr key={tag.id}>
                  <td style={{ fontWeight: 500 }}>{tag.name}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: "var(--a-fg-muted)" }}>
                    {tag.slug}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--a-fg-muted)" }}>
                    {tag.postCount}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="admin-btn"
                        onClick={() => startEdit(tag)}
                        style={{ padding: "4px 12px", fontSize: 13 }}
                      >
                        Rename
                      </button>
                      <button
                        className="admin-btn"
                        onClick={() => setConfirmDelete(tag)}
                        style={{ padding: "4px 12px", fontSize: 13, color: "var(--a-danger)", borderColor: "var(--a-danger)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {/* ── delete confirmation dialog ─────────────────────────────────────── */}
      {confirmDelete ? (
        <DeleteDialog
          tag={confirmDelete}
          busy={busy}
          onConfirm={() => confirmAndDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--a-fg-muted)" }}>
        Tags are created automatically when you add them to a post in the editor.
        Deleting a tag removes it from all posts.
      </p>
    </div>
  );
}

// ── delete confirmation overlay ────────────────────────────────────────────────
function DeleteDialog({
  tag,
  busy,
  onConfirm,
  onCancel,
}: {
  tag: Tag;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "28px 32px",
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Delete "{tag.name}"?</h2>
        <p style={{ fontSize: 14, color: "#555", margin: "0 0 20px" }}>
          {tag.postCount > 0
            ? `This tag is used in ${tag.postCount} post${tag.postCount === 1 ? "" : "s"}. Deleting it will remove the tag from those posts.`
            : "This tag has no posts. It will be permanently deleted."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="admin-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="admin-btn"
            onClick={onConfirm}
            disabled={busy}
            style={{ background: "var(--a-danger)", color: "#fff", borderColor: "var(--a-danger)" }}
          >
            {busy ? "Deleting…" : "Delete tag"}
          </button>
        </div>
      </div>
    </div>
  );
}
