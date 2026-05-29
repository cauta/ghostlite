import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllPosts, countTags, type AdminPostRow } from "@/lib/db";
import QuickDraft from "./QuickDraft";

export const runtime = "edge";

export default async function AdminHome() {
  await requireUser();
  const env = getEnv();
  const [posts, tagCount] = await Promise.all([
    listAllPosts(env.DB),
    countTags(env.DB),
  ]);

  const counts = {
    draft: posts.filter((p: AdminPostRow) => p.status === "draft").length,
    scheduled: posts.filter((p: AdminPostRow) => p.status === "scheduled").length,
    published: posts.filter((p: AdminPostRow) => p.status === "published").length,
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <Link href="/admin/posts/new" className="admin-btn primary">New post</Link>
      </div>

      <QuickDraft />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Drafts"     value={counts.draft}     href="/admin/posts?status=draft" />
        <StatCard label="Scheduled"  value={counts.scheduled} href="/admin/posts?status=scheduled" />
        <StatCard label="Published"  value={counts.published} href="/admin/posts?status=published" />
        <StatCard label="Tags"       value={tagCount}         href="/admin/tags" />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent posts</h2>
      {posts.length === 0 ? (
        <div className="admin-empty">
          <p>No posts yet.</p>
          <Link href="/admin/posts/new" className="admin-btn primary">Write your first post</Link>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Author</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {posts.slice(0, 10).map((p: AdminPostRow) => (
              <tr key={p.id}>
                <td><Link href={`/admin/posts/${p.id}`}>{p.title}</Link></td>
                <td><span className={`admin-pill ${p.status}`}>{p.status}</span></td>
                <td>{p.author_name}</td>
                <td>{new Date(p.updated_at * 1000).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="stat-card" style={{ textDecoration: "none" }}>
      <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </Link>
  );
}
