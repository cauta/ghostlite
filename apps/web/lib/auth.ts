import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "./cf";
import { findSession, sessionCookieName } from "./session";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "author";
  avatarUrl: string | null;
  bio: string | null;
};

/** Returns the current user, or null if not signed in. */
export async function getCurrentUser(): Promise<User | null> {
  const env = getEnv();
  const sid = cookies().get(sessionCookieName())?.value ?? "";
  const sess = await findSession(env.DB, sid);
  if (!sess) return null;

  const row = await env.DB
    .prepare(
      "SELECT id, email, name, role, avatar_key as avatarKey, bio FROM users WHERE id = ?",
    )
    .bind(sess.userId)
    .first<{ id: string; email: string; name: string; role: User["role"]; avatarKey: string | null; bio: string | null }>();
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatarKey ? `/api/media/${row.avatarKey}` : null,
    bio: row.bio,
  };
}

/** Redirects to /admin/login if not signed in. Use in admin server components. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Redirects unless user has admin role. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
