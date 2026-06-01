import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { setSetting } from "@/lib/db";

export const runtime = "edge";

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const env = getEnv();

  let body: { robots?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const robots = (body.robots ?? "").trim() || null;
  await setSetting(env.DB, "robots", robots);
  return NextResponse.json({ ok: true });
}
