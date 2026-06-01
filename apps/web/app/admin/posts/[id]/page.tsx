import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getPostById, getPostTags } from "@/lib/db";
import { readPostBody } from "@/lib/storage";
import PostEditor from "./PostEditor";

export const runtime = "edge";

export default async function EditPost({ params }: { params: { id: string } }) {
  await requireUser();
  const env = getEnv();
  const post = await getPostById(env.DB, params.id);
  if (!post) notFound();

  const [body, tags] = await Promise.all([
    readPostBody(env.R2, post.body_key),
    getPostTags(env.DB, post.id),
  ]);

  return (
    <PostEditor
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        coverKey: post.cover_key,
        body,
        status: post.status,
        scheduledAt: post.scheduled_at,
        publishedAt: post.published_at,
        tags: tags.map((t) => t.name),
        seoTitle: post.seo_title ?? "",
        seoDescription: post.seo_description ?? "",
      }}
    />
  );
}
