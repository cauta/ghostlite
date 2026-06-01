"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function QuickDraft() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create draft");
      const { id } = (await res.json()) as { id: string };
      router.push(`/admin/posts/${id}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quick-draft">
      <input
        ref={inputRef}
        type="text"
        className="quick-draft-input"
        placeholder="What's on your mind? Type a title and press Enter…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
        autoComplete="off"
      />
      <button
        type="submit"
        className="admin-btn primary quick-draft-btn"
        disabled={!title.trim() || loading}
      >
        {loading ? (
          <span className="quick-draft-spinner" aria-label="Creating…" />
        ) : (
          "Draft →"
        )}
      </button>
    </form>
  );
}
