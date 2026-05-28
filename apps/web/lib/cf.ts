import { getRequestContext } from "@cloudflare/next-on-pages";
import { headers } from "next/headers";
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

/** Derive the canonical origin from request headers — works on both CF Pages and local dev. */
export function getOrigin(): string {
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
