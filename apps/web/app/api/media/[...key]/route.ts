import { NextRequest } from "next/server";
import { getEnv } from "@/lib/cf";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  const env = getEnv();
  const key = params.key.join("/");
  const obj = await env.R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  // R2 doesn't set this; default to a long-ish cache for media
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(obj.body as ReadableStream, { headers });
}
