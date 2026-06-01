import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { getRobotsTxt, getSiteSettings } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const env = getEnv();
  const [custom, site] = await Promise.all([getRobotsTxt(env.DB), getSiteSettings(env.DB)]);

  if (custom) {
    return new NextResponse(custom, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
  // Use configured site URL if available, otherwise infer from request
  const siteUrl = (site as { url?: string } & typeof site).url ?? baseUrl;

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
