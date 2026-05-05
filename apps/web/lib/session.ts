// Server-side opaque session tokens stored in D1.
//
// Token: 32 random bytes, hex-encoded. Sent as cookie. Looked up in `sessions`.
// We don't use JWTs for sessions because revoking JWTs is annoying and we
// already have a DB. JWT_SECRET is reserved for things like password reset
// tokens (later).

import type { D1Database } from "@cloudflare/workers-types";

export type Session = {
  id: string;
  userId: string;
  expiresAt: number;
};

const SESSION_COOKIE = "gl_session";
const SESSION_TTL_DAYS = 30;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: D1Database, userId: string): Promise<Session> {
  const id = randomToken();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_DAYS * 86400;
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, expiresAt, now)
    .run();
  return { id, userId, expiresAt };
}

export async function findSession(db: D1Database, id: string): Promise<Session | null> {
  if (!id) return null;
  const row = await db
    .prepare("SELECT id, user_id as userId, expires_at as expiresAt FROM sessions WHERE id = ?")
    .bind(id)
    .first<Session>();
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  if (row.expiresAt < now) {
    // Lazy cleanup; don't block request on it
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run().catch(() => {});
    return null;
  }
  return row;
}

export async function destroySession(db: D1Database, id: string): Promise<void> {
  if (!id) return;
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

/** Returns the value to set as the cookie (the session id) along with attributes. */
export function buildSessionCookie(sessionId: string, expiresAt: number): string {
  const expires = new Date(expiresAt * 1000).toUTCString();
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Expires=${expires}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
