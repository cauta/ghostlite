// The theme contract.
//
// A theme is a module that exports a Theme object as default. Themes can
// only do what ThemeContext + page props permit. They cannot read env, hit
// the DB, or call APIs. This isolation is what will make user-uploaded
// themes safe(r) later.

import type { ComponentType, ReactNode } from "react";

// ----- Domain types passed to themes -----

export type Tag = { slug: string; name: string };

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  publishedAt: number;
  author: { name: string; avatarUrl: string | null };
};

export type PostFull = PostSummary & {
  bodyHtml: string;
  tags: Tag[];
};

// ----- Context every theme component receives -----

export type SiteContext = {
  title: string;
  description: string;
  logoUrl: string | null;
};

export type AuthContext = {
  name: string;
  role: "admin" | "editor" | "author";
} | null;

export type ThemeContext = {
  site: SiteContext;
  theme: { config: Record<string, unknown> };
  user: AuthContext;
};

// ----- Page props -----

export type HomePageProps = ThemeContext & {
  posts: PostSummary[];
  page: number;
  totalPages: number;
};

export type PostPageProps = ThemeContext & {
  post: PostFull;
};

export type TagPageProps = ThemeContext & {
  tag: Tag;
  posts: PostSummary[];
};

export type LayoutProps = ThemeContext & { children: ReactNode };

// ----- The Theme module shape -----

export type ThemeSettingsSchema = Record<
  string,
  {
    type: "string" | "number" | "boolean" | "color";
    label: string;
    default: unknown;
  }
>;

export type ThemeManifest = {
  /** Stable identifier — matches the folder name and the loader registry key. */
  name: string;
  /** Human-friendly name shown to authors in the admin theme picker. */
  label: string;
  /** One-line summary shown beside the label in the theme picker. */
  description: string;
  /** Quality tier. "premium" themes are richer, more designed layouts. */
  tier: "standard" | "premium";
  version: string;
  /** Bumped when the contract changes incompatibly. v1 right now. */
  apiVersion: 1;
  settings?: ThemeSettingsSchema;
};

export type Theme = {
  manifest: ThemeManifest;
  pages: {
    Home: ComponentType<HomePageProps>;
    Post: ComponentType<PostPageProps>;
    Tag: ComponentType<TagPageProps>;
  };
  Layout?: ComponentType<LayoutProps>;
  /** Inline CSS to inject in <head>. Use for theme-specific styles. */
  styles?: string;
};
