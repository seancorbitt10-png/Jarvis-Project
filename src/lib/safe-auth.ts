import { auth } from "@/lib/auth";

function isNextDynamicError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest?: string }).digest) : "";
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND")
  );
}

/** Session lookup that never crashes the page if auth/env/db isn't ready. */
export async function getOptionalSession() {
  try {
    return await auth();
  } catch (error) {
    if (isNextDynamicError(error)) throw error;
    console.error("[auth] optional session lookup failed", error);
    return null;
  }
}
