import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { searchPosts } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 20);

  if (!q) return NextResponse.json([]);

  const env = getEnv();
  try {
    const results = await searchPosts(env.DB, q, limit);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
