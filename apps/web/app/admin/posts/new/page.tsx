import { redirect } from "next/navigation";
import { ulid } from "@/lib/ulid";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { createPost } from "@/lib/db";
import { postBodyKey, writePostBody } from "@/lib/storage";

export const runtime = "edge";

export default async function NewPost({ searchParams }: { searchParams: { type?: string } }) {
  const user = await requireUser();
  const env = getEnv();

  const type = searchParams.type === "page" ? "page" : "post";
  const id = ulid().toLowerCase();
  const slug = `${type === "page" ? "page" : "untitled"}-${id.slice(-6)}`;
  const bodyKey = postBodyKey(id);

  await writePostBody(env.R2, bodyKey, "<p></p>");
  await createPost(env.DB, {
    id,
    slug,
    title: "Untitled",
    excerpt: "",
    bodyKey,
    authorId: user.id,
    type,
  });

  redirect(`/admin/posts/${id}`);
}
