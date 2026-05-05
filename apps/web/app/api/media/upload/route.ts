import { NextRequest, NextResponse } from "next/server";
import { ulid } from "@/lib/ulid";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { putMedia } from "@/lib/storage";

export const runtime = "edge";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);

export async function POST(req: NextRequest) {
  await requireUser();
  const env = getEnv();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const key = `media/${ulid().toLowerCase()}.${ext.replace(/[^a-z0-9]/g, "")}`;
  await putMedia(env.R2, key, await file.arrayBuffer(), file.type);

  return NextResponse.json({ key, url: `/api/media/${key}` });
}
