import type { KVNamespace } from "@cloudflare/workers-types";

const KV_PREFIX = "analytics:views:";
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyKey(slug: string, date: string): string {
  return `${KV_PREFIX}${slug}:${date}`;
}

function totalKey(slug: string): string {
  return `${KV_PREFIX}${slug}:total`;
}

/**
 * Increment the page view counter for a post slug.
 * Not atomic — acceptable for analytics. Stores count in both value and metadata
 * so the dashboard can aggregate via kv.list() without per-key gets.
 */
export async function incrementPageView(kv: KVNamespace, slug: string): Promise<void> {
  const date = todayUTC();
  const dKey = dailyKey(slug, date);
  const tKey = totalKey(slug);

  const [dailyRaw, totalRaw] = await Promise.all([kv.get(dKey), kv.get(tKey)]);
  const daily = parseInt(dailyRaw ?? "0", 10) + 1;
  const total = parseInt(totalRaw ?? "0", 10) + 1;

  await Promise.all([
    kv.put(dKey, String(daily), {
      expirationTtl: DAILY_TTL_SECONDS,
      metadata: { count: daily },
    }),
    // No TTL on total — lifetime counter persists indefinitely
    kv.put(tKey, String(total), { metadata: { count: total } }),
  ]);
}

export interface PostViewStats {
  slug: string;
  views30d: number;
  total: number;
}

/**
 * Return top posts by 30-day views.
 * Uses kv.list() metadata to aggregate without per-key gets.
 */
export async function getTopPosts(
  kv: KVNamespace,
  limit = 10,
): Promise<PostViewStats[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const views30d: Record<string, number> = {};
  const totals: Record<string, number> = {};

  let cursor: string | undefined;
  do {
    const result: KVNamespaceListResult<{ count: number }, string> =
      await (kv as KVNamespace).list<{ count: number }>({
        prefix: KV_PREFIX,
        ...(cursor ? { cursor } : {}),
      });

    for (const key of result.keys) {
      const inner = key.name.slice(KV_PREFIX.length);
      const lastColon = inner.lastIndexOf(":");
      if (lastColon < 0) continue;
      const slug = inner.slice(0, lastColon);
      const suffix = inner.slice(lastColon + 1);
      const count = key.metadata?.count ?? 0;

      if (suffix === "total") {
        totals[slug] = count;
      } else if (suffix >= cutoffDate) {
        views30d[slug] = (views30d[slug] ?? 0) + count;
      }
    }

    cursor = result.list_complete ? undefined : (result as { cursor?: string }).cursor;
  } while (cursor);

  const slugs = new Set([...Object.keys(views30d), ...Object.keys(totals)]);
  const stats: PostViewStats[] = Array.from(slugs).map((slug) => ({
    slug,
    views30d: views30d[slug] ?? 0,
    total: totals[slug] ?? 0,
  }));

  return stats
    .sort((a, b) => b.views30d - a.views30d)
    .slice(0, limit);
}
