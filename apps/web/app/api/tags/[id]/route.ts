import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { deleteTag, updateTag } from "@/lib/db";

export const runtime = "edge";

type Ctx = { params: { id: string } };

// PATCH /api/tags/[id]  — rename a tag (body: { name, slug })
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: string; slug?: string } | null;
  const name = body?.name?.trim();
  const slug = body?.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const env = getEnv();
  try {
    await updateTag(env.DB, params.id, { name, slug });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Slug uniqueness violation
    const msg = e instanceof Error ? e.message : "Update failed";
    const status = msg.includes("UNIQUE") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// DELETE /api/tags/[id]  — remove a tag (and its post associations)
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = getEnv();
  await deleteTag(env.DB, params.id);
  return NextResponse.json({ ok: true });
}
