import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllTags } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  await requireUser();
  const env = getEnv();
  const tags = await listAllTags(env.DB);
  return NextResponse.json({ tags });
}
