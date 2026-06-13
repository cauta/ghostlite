import { NextRequest } from "next/server";
import { getEnv } from "@/lib/cf";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: { key: string[] } }) {
  const env = getEnv();
  const key = params.key.join("/");

  // On Cloudflare (detected via the CF-Ray header that CF injects on all
  // requests), redirect resize requests to Cloudflare Image Resizing so we
  // get format=auto + quality compression for free. In local dev, serve the
  // original and ignore resize params.
  const reqUrl = new URL(req.url);
  const w = reqUrl.searchParams.get("w");
  const q = reqUrl.searchParams.get("q") ?? "85";
  if (w && req.headers.get("cf-ray")) {
    const origin = `${reqUrl.protocol}//${reqUrl.host}`;
    const source = `${origin}/api/media/${key}`;
    return Response.redirect(
      `/cdn-cgi/image/width=${w},quality=${q},format=auto/${source}`,
      302,
    );
  }
  const obj = await env.R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  // Copy HTTP metadata field-by-field. We deliberately avoid
  // obj.writeHttpMetadata(headers): passing a Headers object as an argument
  // fails across the local Miniflare proxy boundary ("Cannot stringify
  // arbitrary non-POJOs"). Reading the plain httpMetadata object is safe.
  const headers = new Headers();
  const meta = obj.httpMetadata;
  if (meta?.contentType) headers.set("content-type", meta.contentType);
  if (meta?.contentEncoding) headers.set("content-encoding", meta.contentEncoding);
  if (meta?.contentDisposition) headers.set("content-disposition", meta.contentDisposition);
  if (meta?.contentLanguage) headers.set("content-language", meta.contentLanguage);
  if (meta?.cacheControl) headers.set("cache-control", meta.cacheControl);
  headers.set("etag", obj.httpEtag);
  // R2 doesn't always set this; default to a long-ish cache for media
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(obj.body as ReadableStream, { headers });
}
