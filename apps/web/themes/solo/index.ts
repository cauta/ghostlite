import type { Theme } from "../theme.types";
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import TagPage from "./pages/TagPage";
import Layout from "./components/Layout";

// Solo — a newsletter-style, single-column reading theme.
//
// A clean chronological post list (title + excerpt + date), a narrow prose
// column for reading, indigo accent, and a mix of serif body type with
// bold sans-serif headlines. Original CSS/markup; standard tier.
//
// CSS is imported globally in apps/web/app/layout.tsx (see "../themes/solo/styles.css")
// so it is bundled once and scoped to .theme-solo — it never touches the admin UI.
const theme: Theme = {
  manifest: {
    name: "solo",
    label: "Solo",
    description:
      "A newsletter-style single-column layout — the writing front and center.",
    tier: "standard",
    version: "0.1.0",
    apiVersion: 1,
  },
  pages: { Home: HomePage, Post: PostPage, Tag: TagPage },
  Layout,
};

export default theme;
