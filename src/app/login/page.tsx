import { redirect } from "next/navigation";
import Link from "next/link";
import { demoSignIn, googleSignIn } from "@/app/login/actions";
import { getOptionalSession } from "@/lib/safe-auth";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Login isn’t configured yet. Stop the server, run `npm run setup`, then `npm run dev`, and try again.",
  configuration:
    "Login isn’t configured yet. Stop the server, run `npm run setup`, then `npm run dev`, and try again.",
  CredentialsSignin:
    "Demo sign-in failed. Run `npm run setup` (creates AUTH_SECRET + database), restart `npm run dev`, and retry.",
  credentials:
    "Demo sign-in failed. Run `npm run setup` (creates AUTH_SECRET + database), restart `npm run dev`, and retry.",
  demo: "Demo sign-in hit an error. Run `npm run setup`, restart `npm run dev`, and try Demo student again.",
  google:
    "Google sign-in failed. Check AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, or use demo login for now.",
  Default:
    "Sign-in failed. Run `npm run setup`, restart `npm run dev`, then try Demo student again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await getOptionalSession();
  if (session?.user) redirect("/chat");

  const params = (await searchParams) ?? {};
  const errorKey = params.error ?? "";
  const errorMessage =
    errorKey && (ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.Default);

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
              Add <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code>{" "}
              to enable Google sign-in.
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
