import type { Theme } from "../theme.types";
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import TagPage from "./pages/TagPage";
import Layout from "./components/Layout";

// Editorial — a premium magazine-style reading theme.
//
// A featured-story hero, a two-column story grid, serif display type, and a
// warm paper palette. Original CSS/markup; "premium" labels its tier only —
// it still runs entirely on the Cloudflare free tier.
const theme: Theme = {
  manifest: {
    name: "editorial",
    label: "Editorial",
    description:
      "A premium magazine layout with a featured story and serif display type.",
    tier: "premium",
    version: "0.1.0",
    apiVersion: 1,
  },
  pages: { Home: HomePage, Post: PostPage, Tag: TagPage },
  Layout,
};

export default theme;
