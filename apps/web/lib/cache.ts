import type { KVNamespace } from "@cloudflare/workers-types";

export async function purgeRelatedCache(kv: KVNamespace, postId: string): Promise<void> {
  const list = await kv.list({ prefix: `post-html:${postId}:` });
  await Promise.all([
    ...list.keys.map((k) => kv.delete(k.name)),
    kv.delete("sitemap-xml"),
    kv.delete("rss:feed"),
  ]).catch(() => {});
}
