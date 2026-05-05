import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Wires up D1/R2/KV bindings during `next dev` against a local emulator,
// so dev experience matches production.
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform().catch(() => {
    // No wrangler config available, fall back to plain dev mode.
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required for Cloudflare Pages compat
  },
};

export default nextConfig;
