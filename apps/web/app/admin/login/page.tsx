import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const runtime = "edge";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>Sign in to Ghostlite</h1>
        <LoginForm />
      </div>
    </div>
  );
}
