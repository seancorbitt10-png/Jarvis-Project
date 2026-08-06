import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { demoSignIn, googleSignIn } from "@/app/login/actions";

const ERROR_MESSAGES: Record<string, string> = {
  configuration:
    "Login isn’t configured yet. In the project folder run `npm run setup`, then `npx prisma migrate dev`, restart `npm run dev`, and try again.",
  credentials:
    "Demo sign-in failed. Run `npx prisma migrate dev` (database tables missing is the usual cause), restart the server, and retry.",
  demo: "Demo sign-in hit an error. Confirm `.env` has AUTH_SECRET (run `npm run setup`), migrate the DB, and restart `npm run dev`.",
  google:
    "Google sign-in failed. Check AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, or use demo login for now.",
  Default:
    "Sign-in failed. Run `npm run setup`, migrate the database, restart the server, then try Demo student again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/chat");

  const params = (await searchParams) ?? {};
  const errorKey = params.error ?? "";
  const errorMessage =
    errorKey && (ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.Default);

  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const authReady = Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_SECRET !== "replace-with-a-long-random-secret",
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <Link href="/" className="display mb-10 text-2xl font-semibold">
        Synapse
      </Link>
      <div className="panel p-8 animate-rise">
        <h1 className="display text-3xl font-semibold">Sign in</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Use <strong>Demo student</strong> to test Synapse without Google.
          Google login is optional until you add OAuth keys.
        </p>

        {!authReady && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            AUTH_SECRET is missing. Stop the server, run{" "}
            <code>npm run setup</code>, then{" "}
            <code>npx prisma migrate dev</code>, then{" "}
            <code>npm run dev</code> again.
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 space-y-3">
          {googleEnabled ? (
            <form action={googleSignIn}>
              <button type="submit" className="btn btn-primary w-full">
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="rounded-xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink-soft)]">
              Google sign-in is optional. Add{" "}
              <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code>{" "}
              later. Demo login works without them.
            </p>
          )}

          <form action={demoSignIn}>
            <button type="submit" className="btn btn-ghost w-full">
              Enter as demo student
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
