"use client";

import { useState, useTransition } from "react";
import type { Comment } from "../theme.types";

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Props = {
  comments: Comment[];
  postUrl: string;
  className?: string;
  headingClassName?: string;
  commentClassName?: string;
  formClassName?: string;
};

export function CommentsSection({
  comments,
  postUrl,
  className,
  headingClassName,
  commentClassName,
  formClassName,
}: Props) {
  const [list] = useState<Comment[]>(comments);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName: name, authorEmail: email, body }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to submit comment");
          return;
        }
        setSuccess(true);
        setName("");
        setEmail("");
        setBody("");
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  return (
    <section className={className}>
      <h2 className={headingClassName}>
        {list.length > 0 ? `${list.length} Comment${list.length === 1 ? "" : "s"}` : "Comments"}
      </h2>

      {list.length > 0 ? (
        <ol style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
          {list.map((c) => (
            <li key={c.id} className={commentClassName} style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", marginBottom: "0.25rem" }}>
                <strong>{c.authorName}</strong>
                <span style={{ fontSize: "0.8em", opacity: 0.6 }}>{fmtDate(c.createdAt)}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p style={{ opacity: 0.6, marginBottom: "1.5rem" }}>No comments yet. Be the first!</p>
      )}

      {success ? (
        <p style={{ color: "green" }}>
          Your comment has been submitted and is awaiting moderation. Thank you!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className={formClassName}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <label>
              <span style={{ display: "block", fontSize: "0.85em", marginBottom: "0.25rem" }}>Name *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
              />
            </label>
            <label>
              <span style={{ display: "block", fontSize: "0.85em", marginBottom: "0.25rem" }}>Email * (not displayed)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box" }}
              />
            </label>
          </div>
          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            <span style={{ display: "block", fontSize: "0.85em", marginBottom: "0.25rem" }}>Comment *</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              maxLength={5000}
              style={{ width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>
          {error ? <p style={{ color: "red", margin: "0 0 0.5rem" }}>{error}</p> : null}
          <button type="submit" disabled={isPending}>
            {isPending ? "Submitting…" : "Post comment"}
          </button>
        </form>
      )}
    </section>
  );
}
