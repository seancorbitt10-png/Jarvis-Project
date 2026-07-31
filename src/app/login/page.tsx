import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/chat");

  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="display mb-10 text-2xl font-semibold">
        Synapse
      </Link>
      <div className="panel p-8 animate-rise">
        <h1 className="display text-3xl font-semibold">Sign in</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Google login unlocks Calendar, Gmail, and Classroom for Jarvis.
          Demo mode works without OAuth while you wire credentials.
        </p>

        <div className="mt-8 space-y-3">
          {googleEnabled ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/chat" });
              }}
            >
              <button type="submit" className="btn btn-primary w-full">
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="rounded-xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink-soft)]">
              Add <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code>{" "}
              to enable Google sign-in.
            </p>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("demo", {
                email: "student@synapse.local",
                redirectTo: "/chat",
              });
            }}
          >
            <button type="submit" className="btn btn-ghost w-full">
              Enter as demo student
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
