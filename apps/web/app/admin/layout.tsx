import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const path = headers().get("x-pathname") ?? "";

  // Login page renders without the shell
  if (path.startsWith("/admin/login") || !user) {
    return <>{children}</>;
  }

  const link = (href: string, label: string) => {
    // Exact match for root-level routes to avoid /admin matching /admin/posts etc.
    const active = path === href || (href !== "/admin" && path.startsWith(href + "/"));
    return (
      <Link href={href} className={active ? "active" : ""}>
        {label}
      </Link>
    );
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Ghostlite</h2>
        <nav>
          {link("/admin", "Dashboard")}
          {link("/admin/posts", "Posts")}
          {link("/admin/tags", "Tags")}
          {link("/admin/settings", "Settings")}
          {link("/", "View site →")}
        </nav>
        <div className="admin-user">
          <div>{user.name}</div>
          <div>{user.email}</div>
          <form action="/api/auth/logout" method="POST" style={{ marginTop: 8 }}>
            <button type="submit" className="admin-btn" style={{ width: "100%" }}>Sign out</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
