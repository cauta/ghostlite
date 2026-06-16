"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: number;
};

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`)
      .then((r) => r.json() as Promise<SearchResult[]>)
      .then((data) => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  return (
    <>
      <button
        type="button"
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search (⌘K)"
        title="Search (⌘K)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div
          className="search-overlay"
          onClick={(e) => e.target === e.currentTarget && close()}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="search-modal">
            <div className="search-input-wrap">
              <svg
                className="search-icon-inline"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                placeholder="Search posts…"
                value={query}
                onChange={onChange}
                className="search-input"
                autoComplete="off"
              />
              <button
                type="button"
                className="search-close"
                onClick={close}
                aria-label="Close search"
              >
                Esc
              </button>
            </div>
            <div className="search-results">
              {loading && <p className="search-empty">Searching…</p>}
              {!loading && query && results.length === 0 && (
                <p className="search-empty">
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}
              {results.map((r) => (
                <Link
                  key={r.id}
                  href={`/${r.slug}`}
                  className="search-result-item"
                  onClick={close}
                >
                  <span className="search-result-title">{r.title}</span>
                  {r.excerpt && (
                    <span className="search-result-excerpt">{r.excerpt}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
