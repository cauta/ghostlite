import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/cf";
import { clearSessionCookie, destroySession, sessionCookieName } from "@/lib/session";

export const runtime = "edge";

export async function POST(_req: NextRequest) {
  const env = getEnv();
  const sid = cookies().get(sessionCookieName())?.value ?? "";
  if (sid) await destroySession(env.DB, sid);

  // Form-submitted logout, redirect back to login. JSON callers see 303.
  const res = NextResponse.redirect(new URL("/admin/login", _req.url), { status: 303 });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
