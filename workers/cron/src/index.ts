// Ghostlite cron worker.
//
// Runs on a schedule (configured in wrangler.toml). Currently does:
//   1. Promote scheduled posts whose scheduledAt has passed.
//
// Add more jobs here as needs arise (RSS rebuild, sitemap, cache warming).

import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(promoteScheduledPosts(env.DB));
  },
};

async function promoteScheduledPosts(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const res = await db
    .prepare(
      `UPDATE posts
         SET status = 'published',
             published_at = scheduled_at,
             scheduled_at = NULL,
             updated_at = ?
       WHERE status = 'scheduled'
         AND scheduled_at <= ?`,
    )
    .bind(now, now)
    .run();
  console.log(`[cron] promoted ${res.meta.changes} scheduled post(s)`);
}
