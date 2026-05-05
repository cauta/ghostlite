// Cloudflare bindings exposed to the Next.js app via getRequestContext().
// Keep this in sync with wrangler.toml.

import type { D1Database, R2Bucket, KVNamespace } from "@cloudflare/workers-types";

export interface CloudflareEnv {
  // Bindings
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;

  // Vars
  SITE_NAME: string;
  ACTIVE_THEME: string;

  // Secrets (set via `wrangler pages secret put`)
  JWT_SECRET: string;
  EMAIL_KEK: string;
}

declare global {
  // Allow `process.env.X` typing in places where it's read directly
  namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET?: string;
      EMAIL_KEK?: string;
      SITE_NAME?: string;
      ACTIVE_THEME?: string;
    }
  }
}

export {};
