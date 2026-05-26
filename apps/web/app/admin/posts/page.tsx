import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllPosts } from "@/lib/db";
import PostsListClient from "./PostsListClient";

export const runtime = "edge";

export default async function PostsList() {
  await requireUser();
  const env = getEnv();
  const posts = await listAllPosts(env.DB);
  return <PostsListClient posts={posts} />;
}
