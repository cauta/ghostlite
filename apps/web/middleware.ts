import { NextRequest, NextResponse } from "next/server";

// Forwards the current pathname to layouts/pages via a header so the admin
// sidebar can highlight the active link. Edge-runtime safe.
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Run on everything except static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
