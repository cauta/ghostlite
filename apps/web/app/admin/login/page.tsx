import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const runtime = "edge";

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        {user ? (
          <>
            <h1>You are already logged in</h1>
            <p>Signed in as {user.email}.</p>
            <Link href="/admin" className="admin-btn primary">
              Go to Dashboard
            </Link>
          </>
        ) : (
          <>
            <h1>Sign in to Ghostlite</h1>
            <LoginForm />
          </>
        )}
      </div>
    </div>
  );
}
