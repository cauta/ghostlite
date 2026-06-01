"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminPostRow } from "@/lib/db";

type StatusTab = "all" | "draft" | "scheduled" | "published";
type ViewTab = "posts" | "pages";

const VALID_STATUS_TABS = new Set<StatusTab>(["all", "draft", "scheduled", "published"]);

const STATUS_TAB_LABELS: Record<StatusTab, string> = {
  all: "All",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
};

export default function PostsListClient({ posts }: { posts: AdminPostRow[] }) {
  const [view, setView] = useState<ViewTab>("posts");
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") as StatusTab | null;
  const urlStatusTab: StatusTab = urlStatus && VALID_STATUS_TABS.has(urlStatus) ? urlStatus : "all";
  const [manualStatusTab, setManualStatusTab] = useState<StatusTab | null>(null);
  const statusTab: StatusTab = manualStatusTab ?? urlStatusTab;

  const allPosts = posts.filter((p) => p.type === "post");
  const allPages = posts.filter((p) => p.type === "page");

  const statusCounts: Record<StatusTab, number> = {
    all: allPosts.length,
    draft: allPosts.filter((p) => p.status === "draft").length,
    scheduled: allPosts.filter((p) => p.status === "scheduled").length,
    published: allPosts.filter((p) => p.status === "published").length,
  };

  const visiblePosts =
    statusTab === "all" ? allPosts : allPosts.filter((p) => p.status === statusTab);

  const renderRow = (p: AdminPostRow, showStatus: boolean) => (
    <tr key={p.id}>
      <td>
        <Link href={`/admin/posts/${p.id}`}>
          {p.title || <em style={{ color: "var(--a-fg-muted)" }}>Untitled</em>}
        </Link>
      </td>
      {showStatus && (
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
            title={`View live ${p.type}`}
          >
            View →
          </a>
        ) : (
          <Link
            href={`/admin/posts/${p.id}`}
            className="posts-view-link"
            title={`Edit ${p.type}`}
          >
            Edit →
          </Link>
        )}
      </td>
    </tr>
  );

  const renderTable = (rows: AdminPostRow[], showStatus: boolean, emptyMsg: string, emptyHref: string, emptyLabel: string) => {
    if (rows.length === 0) {
      return (
        <div className="admin-empty">
          {emptyMsg}{" "}
          <Link href={emptyHref} className="admin-btn primary" style={{ marginTop: 12 }}>
            {emptyLabel}
          </Link>
        </div>
      );
    }
    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            {showStatus && <th>Status</th>}
            <th>Author</th>
            <th>Updated</th>
            <th style={{ width: 64 }}></th>
          </tr>
        </thead>
        <tbody>{rows.map((p) => renderRow(p, showStatus))}</tbody>
      </table>
    );
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>{view === "posts" ? "Posts" : "Pages"}</h1>
        <Link
          href={view === "posts" ? "/admin/posts/new" : "/admin/posts/new?type=page"}
          className="admin-btn primary"
        >
          {view === "posts" ? "New post" : "New page"}
        </Link>
      </div>

      {/* View switcher: Posts vs Pages */}
      <div className="posts-filter-tabs" role="tablist" style={{ marginBottom: 0 }}>
        {(["posts", "pages"] as ViewTab[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={`posts-filter-tab${view === v ? " active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "posts" ? "Posts" : "Pages"}
            <span className="posts-filter-count">
              {v === "posts" ? allPosts.length : allPages.length}
            </span>
          </button>
        ))}
      </div>

      {view === "posts" && (
        <>
          {/* Status filter tabs — only for posts */}
          <div className="posts-filter-tabs" role="tablist">
            {(["all", "draft", "scheduled", "published"] as StatusTab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={statusTab === t}
                className={`posts-filter-tab${statusTab === t ? " active" : ""}`}
                onClick={() => setManualStatusTab(t)}
              >
                {STATUS_TAB_LABELS[t]}
                <span className="posts-filter-count">{statusCounts[t]}</span>
              </button>
            ))}
          </div>

          {renderTable(
            visiblePosts,
            statusTab === "all",
            statusTab === "all" ? "No posts yet." : `No ${STATUS_TAB_LABELS[statusTab].toLowerCase()} posts.`,
            "/admin/posts/new",
            statusTab === "all" ? "Write your first post" : "Write a post",
          )}
        </>
      )}

      {view === "pages" && (
        <>
          {renderTable(
            allPages,
            true,
            "No pages yet.",
            "/admin/posts/new?type=page",
            "Create your first page",
          )}
        </>
      )}
    </div>
  );
}
