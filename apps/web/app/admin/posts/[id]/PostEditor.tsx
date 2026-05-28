"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Tiptap component is client-only — the underlying lib touches `window` /
// browser-only APIs, so we disable SSR for it.
const TiptapEditor = dynamic(() => import("@/app/admin/components/TiptapEditor"), {
  ssr: false,
  loading: () => <div className="tiptap-loading">Loading editor…</div>,
});

type Status = "draft" | "scheduled" | "published";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverKey: string | null;
  body: string;
  status: Status;
  scheduledAt: number | null;
  publishedAt: number | null;
  tags: string[];
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// The salt is the last 6 chars of the post's ULID — random, permanent, and
// requires no extra storage. The auto-slug is always `slugify(title)-salt`,
// or just `-salt` when the title slugifies to empty.
function autoSlugFor(title: string, salt: string): string {
  const base = slugify(title);
  return base ? `${base}-${salt}` : `-${salt}`;
}

// Local datetime input <-> epoch seconds. The <input type="datetime-local">
// emits "YYYY-MM-DDTHH:mm" in local time.
function epochToLocalInput(epoch: number | null): string {
  if (!epoch) return "";
  const d = new Date(epoch * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToEpoch(s: string): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export default function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(post);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(epochToLocalInput(post.scheduledAt));
  const [tagInput, setTagInput] = useState("");
  const salt = post.id.slice(-6);
  // The slug is "untouched" (auto-tracks the title) only when it still matches
  // the auto-generated pattern. Any prior manual edit shows up as a mismatch.
  const [slugTouched, setSlugTouched] = useState(
    post.slug !== autoSlugFor(post.title, salt),
  );

  // Keep latest draft accessible to the autosave timer without re-binding it
  // every keystroke.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function showToast(message: string, href?: string, linkLabel?: string, durationMs = 3000) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const existing = document.getElementById("gl-toast");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "gl-toast";
    el.className = "post-editor-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    const span = document.createElement("span");
    span.textContent = message;
    el.appendChild(span);

    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "post-editor-toast-link";
      a.textContent = linkLabel ?? "View";
      el.appendChild(a);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "post-editor-toast-close";
    btn.setAttribute("aria-label", "Dismiss");
    btn.textContent = "×";
    btn.onclick = () => { el.remove(); if (toastTimer.current) clearTimeout(toastTimer.current); };
    el.appendChild(btn);

    document.body.appendChild(el);
    toastTimer.current = setTimeout(() => el.remove(), durationMs);
  }

  function handleTitleChange(value: string) {
    update("title", value);
    if (!slugTouched) update("slug", autoSlugFor(value, salt));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    update("slug", value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  }

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "Request failed");
    }
  }

  const save = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const d = draftRef.current;
      if (!opts.silent) setBusy("save");
      setError(null);
      try {
        await patch({
          slug: d.slug,
          title: d.title,
          excerpt: d.excerpt,
          coverKey: d.coverKey,
          body: d.body,
          tags: d.tags,
        });
        setSavedAt(Date.now());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!opts.silent) setBusy(null);
      }
    },
    [post.id],
  );

  // Clear toast and remove DOM element on unmount.
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    document.getElementById("gl-toast")?.remove();
  }, []);

  // Autosave drafts/scheduled posts on a 1.5s debounce after edits.
  // Published posts require an explicit "Update" click (Ghost behavior).
  useEffect(() => {
    if (draft.status === "published") return;
    const t = setTimeout(() => {
      save({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.body, draft.title, draft.slug, draft.excerpt, draft.coverKey, draft.tags]);

  async function publishNow() {
    setBusy("publish");
    setError(null);
    try {
      // Save first so the latest body/meta is in R2/D1, then flip status.
      await patch({
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        coverKey: draft.coverKey,
        body: draft.body,
        tags: draft.tags,
      });
      const res = await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Publish failed");
      update("status", "published");
      update("publishedAt", Math.floor(Date.now() / 1000));
      setSavedAt(Date.now());
      showToast("Post published!", `/${draft.slug}`, "View post");
      setTimeout(() => startTransition(() => router.refresh()), 3200);
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
      if (!res.ok) throw new Error("Unpublish failed");
      update("status", "draft");
      update("publishedAt", null);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function schedule() {
    const epoch = localInputToEpoch(scheduleAt);
    if (!epoch) {
      setError("Pick a valid date and time");
      return;
    }
    if (epoch * 1000 < Date.now()) {
      setError("Schedule time must be in the future");
      return;
    }
    setBusy("schedule");
    setError(null);
    try {
      await patch({
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        coverKey: draft.coverKey,
        body: draft.body,
        tags: draft.tags,
        status: "scheduled",
        scheduledAt: epoch,
      });
      update("status", "scheduled");
      update("scheduledAt", epoch);
      setSavedAt(Date.now());
      setScheduleOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revertToDraft() {
    setBusy("revert");
    try {
      await patch({ status: "draft", scheduledAt: null });
      update("status", "draft");
      update("scheduledAt", null);
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

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (draft.tags.includes(t)) {
      setTagInput("");
      return;
    }
    update("tags", [...draft.tags, t]);
    setTagInput("");
  }

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setError("Cover upload failed");
      return;
    }
    const { key } = (await res.json()) as { key: string };
    update("coverKey", key);
  }

  const isPublished = draft.status === "published";
  const isScheduled = draft.status === "scheduled";

  return (
    <div className="post-editor">
      <header className="post-editor-bar">
        <div className="post-editor-bar-left">
          <Link href="/admin/posts" className="admin-btn">← Posts</Link>
          <span className={`admin-pill ${draft.status}`}>{draft.status}</span>
          {savedAt ? (
            <span className="post-editor-saved">
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
        <div className="post-editor-bar-right">
          {!isPublished && !isScheduled && (
            <>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setScheduleOpen(true)}
                disabled={busy !== null}
              >
                Schedule
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={publishNow}
                disabled={busy !== null}
              >
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
          {isScheduled && (
            <>
              <button
                type="button"
                className="admin-btn"
                onClick={revertToDraft}
                disabled={busy !== null}
              >
                Revert to draft
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setScheduleOpen(true)}
                disabled={busy !== null}
              >
                Reschedule
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={publishNow}
                disabled={busy !== null}
              >
                Publish now
              </button>
            </>
          )}
          {isPublished && (
            <>
              <button
                type="button"
                className="admin-btn"
                onClick={unpublish}
                disabled={busy !== null}
              >
                {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={() => save()}
                disabled={busy !== null}
              >
                {busy === "save" ? "Updating…" : "Update"}
              </button>
            </>
          )}
          <button
            type="button"
            className="admin-btn"
            onClick={() => setDrawerOpen((v) => !v)}
            title="Toggle settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {error ? <div className="admin-error post-editor-error">{error}</div> : null}

      <div className={`post-editor-body ${drawerOpen ? "drawer-open" : ""}`}>
        <main className="post-editor-main">
          <input
            className="post-editor-title"
            value={draft.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title"
          />
          <TiptapEditor
            value={draft.body}
            onChange={(v) => update("body", v)}
          />
        </main>

        {drawerOpen && (
          <aside className="post-editor-drawer">
            <section>
              <h3>Post settings</h3>
            </section>

            <section>
              <label>Slug</label>
              <input
                value={draft.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
              <p className="hint">/{draft.slug}</p>
            </section>

            <section>
              <label>Excerpt</label>
              <textarea
                value={draft.excerpt}
                onChange={(e) => update("excerpt", e.target.value)}
                placeholder="One-sentence summary"
                rows={3}
              />
            </section>

            <section>
              <label>Feature image</label>
              {draft.coverKey ? (
                <div className="cover-preview">
                  <img src={`/api/media/${draft.coverKey}`} alt="Cover" />
                  <button
                    type="button"
                    className="admin-btn danger"
                    onClick={() => update("coverKey", null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                  }}
                />
              )}
            </section>

            <section>
              <label>Tags</label>
              <div className="tag-chips">
                {draft.tags.map((t) => (
                  <span key={t} className="tag-chip">
                    {t}
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "tags",
                          draft.tags.filter((x) => x !== t),
                        )
                      }
                      aria-label={`Remove ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="Add tag, press Enter"
              />
            </section>

            <section>
              <label>Publish date</label>
              {isPublished && draft.publishedAt ? (
                <p className="hint">
                  Published {new Date(draft.publishedAt * 1000).toLocaleString()}
                </p>
              ) : isScheduled && draft.scheduledAt ? (
                <p className="hint">
                  Scheduled for {new Date(draft.scheduledAt * 1000).toLocaleString()}
                </p>
              ) : (
                <p className="hint">Not published yet</p>
              )}
            </section>

            <section>
              <label>Visibility</label>
              <select disabled defaultValue="public">
                <option value="public">Public</option>
                <option value="members">Members only</option>
                <option value="paid">Paid members only</option>
              </select>
              <p className="hint">Members access coming soon</p>
            </section>

            <section className="danger-zone">
              <button
                type="button"
                className="admin-btn danger"
                onClick={destroy}
                disabled={busy !== null}
              >
                Delete post
              </button>
            </section>
          </aside>
        )}
      </div>

      {scheduleOpen && (
        <div className="post-editor-modal-backdrop" onClick={() => setScheduleOpen(false)}>
          <div className="post-editor-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{isScheduled ? "Reschedule post" : "Schedule post"}</h3>
            <label>Publish at</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
            <p className="hint">
              Note: cron-based auto-publish is not wired up yet. The post will
              wait at <code>scheduled</code> until you publish it manually.
            </p>
            <div className="post-editor-modal-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={schedule}
                disabled={busy !== null}
              >
                {busy === "schedule" ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
