import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const CATALOG = [
  {
    provider: "google_calendar",
    label: "Google Calendar",
    description: "Read-only events for schedule orchestration.",
    viaGoogle: true,
  },
  {
    provider: "gmail",
    label: "Gmail",
    description: "Read-only school-related mail scanning.",
    viaGoogle: true,
  },
  {
    provider: "google_classroom",
    label: "Google Classroom",
    description: "Read-only coursework and due dates.",
    viaGoogle: true,
  },
  {
    provider: "renweb",
    label: "RenWeb / FACTS",
    description:
      "School SIS calendar connector (stub in v1 — uses demo events when enabled).",
    viaGoogle: false,
  },
] as const;

export async function GET() {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const existing = await prisma.connection.findMany({
    where: { userId: gated.userId },
  });
  const byProvider = Object.fromEntries(existing.map((c) => [c.provider, c]));

  return NextResponse.json({
    connections: CATALOG.map((item) => {
      const row = byProvider[item.provider];
      return {
        ...item,
        status: row?.status ?? "disconnected",
        permissions: row?.permissions ?? "read",
        connectedAt: row?.connectedAt ?? null,
        id: row?.id ?? null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const body = await req.json();
  const provider = body.provider as string;
  const action = body.action as "connect" | "disconnect";
  const meta = CATALOG.find((c) => c.provider === provider);

  if (!meta) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (meta.viaGoogle && action === "connect") {
    return NextResponse.json({
      ok: false,
      message:
        "Google apps connect automatically when you sign in with Google OAuth scopes. Re-login if needed.",
    });
  }

  if (action === "disconnect") {
    await prisma.connection.upsert({
      where: {
        userId_provider: { userId: gated.userId, provider },
      },
      create: {
        userId: gated.userId,
        provider,
        label: meta.label,
        status: "disconnected",
        permissions: "read",
      },
      update: { status: "disconnected", connectedAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.connection.upsert({
    where: {
      userId_provider: { userId: gated.userId, provider },
    },
    create: {
      userId: gated.userId,
      provider,
      label: meta.label,
      status: "connected",
      permissions: "read",
      connectedAt: new Date(),
      metadata: JSON.stringify({ mode: "stub" }),
    },
    update: {
      status: "connected",
      connectedAt: new Date(),
      metadata: JSON.stringify({ mode: "stub" }),
    },
  });

  return NextResponse.json({ ok: true });
}
