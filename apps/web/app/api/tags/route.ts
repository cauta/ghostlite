import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllTags, createTag } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  await requireUser();
  const env = getEnv();
  const tags = await listAllTags(env.DB);
  return NextResponse.json({ tags });
}

export async function POST(req: Request) {
  await requireUser();
  const env = getEnv();
  const body = (await req.json()) as { name?: string; slug?: string };
  const name = body.name?.trim();
  const slug = body.slug?.trim();
  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
  }
  try {
    const tag = await createTag(env.DB, name, slug);
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "A tag with this slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create tag." }, { status: 500 });
  }
}
