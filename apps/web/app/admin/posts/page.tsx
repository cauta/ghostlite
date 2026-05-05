import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { listAllPosts } from "@/lib/db";

export const runtime = "edge";

export default async function PostsList() {
  await requireUser();
  const env = getEnv();
  const posts = await listAllPosts(env.DB);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Posts</h1>
        <Link href="/admin/posts/new" className="admin-btn primary">New post</Link>
      </div>

      {posts.length === 0 ? (
        <div className="admin-empty">No posts yet.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Author</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/posts/${p.id}`}>{p.title}</Link></td>
                <td><span className={`admin-pill ${p.status}`}>{p.status}</span></td>
                <td>{p.author_name}</td>
                <td>{new Date(p.updated_at * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
