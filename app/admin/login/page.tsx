import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    redirect("/admin/login?error=bad");
  }
  const next = String(formData.get("next") ?? "/admin/queue");
  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();
  redirect(next.startsWith("/admin") ? next : "/admin/queue");
}

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const errorMessage =
    params.error === "bad"
      ? "Wrong password."
      : params.error === "missing-secret"
        ? "SESSION_SECRET is not configured."
        : null;

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-semibold">Admin sign-in</h1>
      <p className="mt-2 text-sm text-white/60">
        Enter the admin password to access the review queue.
      </p>

      <form action={loginAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={params.next ?? "/admin/queue"} />
        <label className="block text-sm">
          <span className="text-white/70">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 focus:border-accent focus:outline-none"
          />
        </label>
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-3 py-2 font-medium text-black hover:bg-accent-strong"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
