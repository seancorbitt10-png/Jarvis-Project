import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
].join(" ");

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: googleScopes,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  );
}

// Local/dev fallback so the app is usable before Google OAuth credentials exist.
providers.push(
  Credentials({
    id: "demo",
    name: "Demo student",
    credentials: {
      email: { label: "Email", type: "email" },
    },
    async authorize(credentials) {
      const email =
        (credentials?.email as string)?.trim() || "student@synapse.local";

      try {
        const user = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name: "Demo Student",
            image: null,
          },
          update: {},
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      } catch (error) {
        console.error("[auth] demo authorize failed — is the database migrated?", error);
        throw new Error(
          "Database not ready. Run `npx prisma migrate dev` then restart the server.",
        );
      }
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Adapter helps Google account linking; demo login uses JWT sessions.
  adapter: PrismaAdapter(prisma),
  providers,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      if (account?.provider !== "google") return;

      const googleProviders = [
        { provider: "google_calendar", label: "Google Calendar" },
        { provider: "gmail", label: "Gmail" },
        { provider: "google_classroom", label: "Google Classroom" },
      ] as const;

      for (const item of googleProviders) {
        await prisma.connection.upsert({
          where: {
            userId_provider: { userId: user.id, provider: item.provider },
          },
          create: {
            userId: user.id,
            provider: item.provider,
            label: item.label,
            status: "connected",
            permissions: "read",
            connectedAt: new Date(),
            metadata: JSON.stringify({ via: "google_oauth" }),
          },
          update: {
            status: "connected",
            connectedAt: new Date(),
            metadata: JSON.stringify({ via: "google_oauth" }),
          },
        });
      }
    },
  },
  trustHost: true,
});
