// R2 helpers.
//
// Layout:
//   posts/<post_id>.md     — post body (markdown source)
//   media/<ulid>.<ext>     — uploaded images, attachments

import type { R2Bucket } from "@cloudflare/workers-types";

export const POST_BODY_PREFIX = "posts/";
export const MEDIA_PREFIX = "media/";

export function postBodyKey(postId: string): string {
  return `${POST_BODY_PREFIX}${postId}.md`;
}

export async function readPostBody(r2: R2Bucket, key: string): Promise<string> {
  const obj = await r2.get(key);
  if (!obj) return "";
  return await obj.text();
}

export async function writePostBody(r2: R2Bucket, key: string, body: string): Promise<void> {
  await r2.put(key, body, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });
}

export async function deleteObject(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

export async function putMedia(
  r2: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer | string,
  contentType: string,
): Promise<void> {
  await r2.put(key, body, { httpMetadata: { contentType } });
}

export async function getMedia(r2: R2Bucket, key: string) {
  return await r2.get(key);
}
