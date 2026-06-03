"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  id: string;
  status: "pending" | "approved" | "spam";
};

export function CommentActions({ id, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function setStatus(newStatus: "approved" | "spam" | "pending") {
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!confirm("Delete this comment permanently?")) return;
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {status !== "approved" && (
        <button
          className="admin-btn admin-btn-sm"
          onClick={() => setStatus("approved")}
          disabled={isPending}
          style={{ background: "#dcfce7", color: "#166534", border: "none" }}
        >
          Approve
        </button>
      )}
      {status !== "spam" && (
        <button
          className="admin-btn admin-btn-sm"
          onClick={() => setStatus("spam")}
          disabled={isPending}
          style={{ background: "#fee2e2", color: "#991b1b", border: "none" }}
        >
          Spam
        </button>
      )}
      {status !== "pending" && (
        <button
          className="admin-btn admin-btn-sm"
          onClick={() => setStatus("pending")}
          disabled={isPending}
        >
          Pending
        </button>
      )}
      <button
        className="admin-btn admin-btn-sm"
        onClick={handleDelete}
        disabled={isPending}
        style={{ background: "#fee2e2", color: "#991b1b", border: "none" }}
      >
        Delete
      </button>
    </div>
  );
}
