import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const reqUrl = new URL(req.url);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
