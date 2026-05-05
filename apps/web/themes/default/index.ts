import type { Theme } from "../theme.types";
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import TagPage from "./pages/TagPage";
import Layout from "./components/Layout";

const theme: Theme = {
  manifest: {
    name: "default",
    version: "0.1.0",
    apiVersion: 1,
    settings: {
      accentColor: { type: "color", label: "Accent color", default: "#0f6e56" },
      showAuthor: { type: "boolean", label: "Show author name on cards", default: true },
    },
  },
  pages: { Home: HomePage, Post: PostPage, Tag: TagPage },
  Layout,
};

export default theme;
