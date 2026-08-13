import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getPersonalContext } from "@/lib/jarvis/personal-context";

/**
 * DEV/TEST ONLY — inspect getPersonalContext() for the current user.
 * Remove before production hardening. Does not create or seed data.
 *
 * GET /api/dev/personal-context
 */
export async function GET() {
  // Development/test mechanism: disable outside non-production runtimes.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Not found",
        note: "DEV/TEST ONLY endpoint — disabled in production",
      },
      { status: 404 },
    );
  }

  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const context = await getPersonalContext(gated.userId);

  return NextResponse.json({
    _devOnly: true,
    _warning:
      "Development/test verification endpoint for PersonalContext. Remove before production.",
    context,
  });
}
