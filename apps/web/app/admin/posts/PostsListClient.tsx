"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminPostRow } from "@/lib/db";

type Tab = "all" | "draft" | "scheduled" | "published";

const VALID_TABS = new Set<Tab>(["all", "draft", "scheduled", "published"]);

const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
};

export default function PostsListClient({ posts }: { posts: AdminPostRow[] }) {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") as Tab | null;
  const urlTab: Tab = urlStatus && VALID_TABS.has(urlStatus) ? urlStatus : "all";
  const [manualTab, setManualTab] = useState<Tab | null>(null);
  const tab: Tab = manualTab ?? urlTab;

  const counts: Record<Tab, number> = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  const visible = tab === "all" ? posts : posts.filter((p) => p.status === tab);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Posts</h1>
        <Link href="/admin/posts/new" className="admin-btn primary">
          New post
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="posts-filter-tabs" role="tablist">
        {(["all", "draft", "scheduled", "published"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`posts-filter-tab${tab === t ? " active" : ""}`}
            onClick={() => setManualTab(t)}
          >
            {TAB_LABELS[t]}
            <span className="posts-filter-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="admin-empty">
          {tab === "all"
            ? "No posts yet."
            : `No ${TAB_LABELS[tab].toLowerCase()} posts.`}
          {tab === "all" || tab === "draft" ? (
            <>
              {" "}
              <Link href="/admin/posts/new" className="admin-btn primary" style={{ marginTop: 12 }}>
                Write your first post
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              {tab === "all" && <th>Status</th>}
              <th>Author</th>
              <th>Updated</th>
              {/* Extra column: published posts get a live "View" link */}
              <th style={{ width: 64 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/posts/${p.id}`}>
                    {p.title || <em style={{ color: "var(--a-fg-muted)" }}>Untitled</em>}
                  </Link>
                </td>
                {tab === "all" && (
                  <td>
                    <span className={`admin-pill ${p.status}`}>{p.status}</span>
                  </td>
                )}
                <td>{p.author_name}</td>
                <td style={{ color: "var(--a-fg-muted)", fontSize: 13 }}>
                  {new Date(p.updated_at * 1000).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td>
                  {p.status === "published" ? (
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="posts-view-link"
                      title="View live post"
                    >
                      View →
                    </a>
                  ) : (
                    <Link
                      href={`/admin/posts/${p.id}`}
                      className="posts-view-link"
                      title="Edit post"
                    >
                      Edit →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
