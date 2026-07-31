import { google } from "googleapis";
import { prisma } from "@/lib/db";

export async function getGoogleAuthForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token && !account?.refresh_token) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );

  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : account.expires_at,
        refresh_token: tokens.refresh_token ?? account.refresh_token,
      },
    });
  });

  return oauth2;
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.OPENAI_API_KEY;
}
