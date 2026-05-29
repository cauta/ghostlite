"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminPostRow } from "@/lib/db";

type Tab = "all" | "draft" | "scheduled" | "published";
type SortCol = "title" | "author" | "updated";

const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
};

function SortIcon({ col, sort }: { col: SortCol; sort: { col: SortCol; dir: "asc" | "desc" } }) {
  if (sort.col !== col) return <span className="posts-sort-icon inactive">↕</span>;
  return <span className="posts-sort-icon active">{sort.dir === "asc" ? "↑" : "↓"}</span>;
}

export default function PostsListClient({ posts }: { posts: AdminPostRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "updated", dir: "desc" });

  const counts: Record<Tab, number> = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  const tabFiltered = tab === "all" ? posts : posts.filter((p) => p.status === tab);

  const searched = query.trim()
    ? tabFiltered.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : tabFiltered;

  const sorted = [...searched].sort((a, b) => {
    const mul = sort.dir === "asc" ? 1 : -1;
    if (sort.col === "title") return mul * a.title.localeCompare(b.title);
    if (sort.col === "author") return mul * (a.author_name ?? "").localeCompare(b.author_name ?? "");
    if (sort.col === "updated") return mul * (a.updated_at - b.updated_at);
    return 0;
  });

  function handleSortClick(col: SortCol) {
    setSort((prev) => {
      if (prev.col === col) return { col, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { col, dir: col === "updated" ? "desc" : "asc" };
    });
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Posts</h1>
        <Link href="/admin/posts/new" className="admin-btn primary">
          New post
        </Link>
      </div>

      {/* Search bar */}
      <div className="posts-search-bar">
        <input
          type="text"
          className="posts-search-input"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
        />
        {query.trim() && (
          <span className="posts-search-count">{sorted.length} of {tabFiltered.length}</span>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="posts-filter-tabs" role="tablist">
        {(["all", "draft", "scheduled", "published"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`posts-filter-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            <span className="posts-filter-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="admin-empty">
          {query.trim()
            ? `No posts matching "${query}".`
            : tab === "all"
            ? "No posts yet."
            : `No ${TAB_LABELS[tab].toLowerCase()} posts.`}
          {!query.trim() && (tab === "all" || tab === "draft") ? (
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
              <th>
                <button className="posts-sort-header" onClick={() => handleSortClick("title")}>
                  Title <SortIcon col="title" sort={sort} />
                </button>
              </th>
              {tab === "all" && <th>Status</th>}
              <th>
                <button className="posts-sort-header" onClick={() => handleSortClick("author")}>
                  Author <SortIcon col="author" sort={sort} />
                </button>
              </th>
              <th>
                <button className="posts-sort-header" onClick={() => handleSortClick("updated")}>
                  Updated <SortIcon col="updated" sort={sort} />
                </button>
              </th>
              {/* Extra column: published posts get a live "View" link */}
              <th style={{ width: 64 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
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
