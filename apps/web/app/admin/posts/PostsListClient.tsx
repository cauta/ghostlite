"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminPostRow } from "@/lib/db";

type StatusTab = "all" | "draft" | "scheduled" | "published";
type ViewTab = "posts" | "pages";
type SortCol = "title" | "author" | "updated";

const VALID_STATUS_TABS = new Set<StatusTab>(["all", "draft", "scheduled", "published"]);

const STATUS_TAB_LABELS: Record<StatusTab, string> = {
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
  const [view, setView] = useState<ViewTab>("posts");
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status") as StatusTab | null;
  const urlStatusTab: StatusTab = urlStatus && VALID_STATUS_TABS.has(urlStatus) ? urlStatus : "all";
  const [manualStatusTab, setManualStatusTab] = useState<StatusTab | null>(null);
  const statusTab: StatusTab = manualStatusTab ?? urlStatusTab;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "updated", dir: "desc" });

  const allPosts = posts.filter((p) => p.type === "post");
  const allPages = posts.filter((p) => p.type === "page");

  const statusCounts: Record<StatusTab, number> = {
    all: allPosts.length,
    draft: allPosts.filter((p) => p.status === "draft").length,
    scheduled: allPosts.filter((p) => p.status === "scheduled").length,
    published: allPosts.filter((p) => p.status === "published").length,
  };

  const statusFiltered = statusTab === "all" ? allPosts : allPosts.filter((p) => p.status === statusTab);

  const searched = query.trim()
    ? statusFiltered.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : statusFiltered;

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

  const renderPageRow = (p: AdminPostRow) => (
    <tr key={p.id}>
      <td>
        <Link href={`/admin/posts/${p.id}`}>
          {p.title || <em style={{ color: "var(--a-fg-muted)" }}>Untitled</em>}
        </Link>
      </td>
      <td><span className={`admin-pill ${p.status}`}>{p.status}</span></td>
      <td>{p.author_name}</td>
      <td style={{ color: "var(--a-fg-muted)", fontSize: 13 }}>
        {new Date(p.updated_at * 1000).toLocaleDateString(undefined, {
          month: "short", day: "numeric", year: "numeric",
        })}
      </td>
      <td>
        {p.status === "published" ? (
          <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="posts-view-link" title="View live page">
            View →
          </a>
        ) : (
          <Link href={`/admin/posts/${p.id}`} className="posts-view-link" title="Edit page">
            Edit →
          </Link>
        )}
      </td>
    </tr>
  );

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
              <span className="posts-search-count">{sorted.length} of {statusFiltered.length}</span>
            )}
          </div>

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

          {sorted.length === 0 ? (
            <div className="admin-empty">
              {query.trim()
                ? `No posts matching "${query}".`
                : statusTab === "all"
                ? "No posts yet."
                : `No ${STATUS_TAB_LABELS[statusTab].toLowerCase()} posts.`}
              {!query.trim() && (statusTab === "all" || statusTab === "draft") ? (
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
                  {statusTab === "all" && <th>Status</th>}
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
                    {statusTab === "all" && (
                      <td><span className={`admin-pill ${p.status}`}>{p.status}</span></td>
                    )}
                    <td>{p.author_name}</td>
                    <td style={{ color: "var(--a-fg-muted)", fontSize: 13 }}>
                      {new Date(p.updated_at * 1000).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td>
                      {p.status === "published" ? (
                        <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="posts-view-link" title="View live post">
                          View →
                        </a>
                      ) : (
                        <Link href={`/admin/posts/${p.id}`} className="posts-view-link" title="Edit post">
                          Edit →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {view === "pages" && (
        <>
          {allPages.length === 0 ? (
            <div className="admin-empty">
              No pages yet.{" "}
              <Link href="/admin/posts/new?type=page" className="admin-btn primary" style={{ marginTop: 12 }}>
                Create your first page
              </Link>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Updated</th>
                  <th style={{ width: 64 }}></th>
                </tr>
              </thead>
              <tbody>{allPages.map((p) => renderPageRow(p))}</tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
