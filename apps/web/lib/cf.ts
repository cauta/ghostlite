import { getRequestContext } from "@cloudflare/next-on-pages";
import type { CloudflareEnv } from "./env";

/**
 * Returns the Cloudflare bindings for the current request.
 *
 * Must be called from a route handler, server component, or middleware
 * running on the edge runtime. Will throw if called from `next dev` without
 * the dev platform initialized.
 */
export function getEnv(): CloudflareEnv {
  return getRequestContext().env as CloudflareEnv;
}
