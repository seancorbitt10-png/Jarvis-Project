import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/** Seeds demo connections + notes for local testing without Google OAuth. */
export async function POST() {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const providers = [
    { provider: "google_calendar", label: "Google Calendar" },
    { provider: "gmail", label: "Gmail" },
    { provider: "google_classroom", label: "Google Classroom" },
    { provider: "renweb", label: "RenWeb / FACTS" },
  ];

  for (const p of providers) {
    await prisma.connection.upsert({
      where: {
        userId_provider: { userId: gated.userId, provider: p.provider },
      },
      create: {
        userId: gated.userId,
        provider: p.provider,
        label: p.label,
        status: "connected",
        permissions: "read",
        connectedAt: new Date(),
        metadata: JSON.stringify({ mode: "demo" }),
      },
      update: {
        status: "connected",
        connectedAt: new Date(),
        metadata: JSON.stringify({ mode: "demo" }),
      },
    });
  }

  await prisma.userPlugin.upsert({
    where: {
      userId_pluginId: { userId: gated.userId, pluginId: "notes" },
    },
    create: {
      userId: gated.userId,
      pluginId: "notes",
      enabled: true,
      permissions: "read",
    },
    update: { enabled: true, permissions: "read" },
  });

  const noteCount = await prisma.note.count({ where: { userId: gated.userId } });
  if (noteCount === 0) {
    await prisma.note.create({
      data: {
        userId: gated.userId,
        title: "Chem review: limiting reagents",
        content:
          "Key idea: the limiting reagent runs out first and caps product yield. " +
          "Quiz tomorrow — memorize the 4-step method and the H2/O2 practice problem.",
        source: "demo_seed",
        tags: "chemistry",
      },
    });
  }

  await prisma.memory.upsert({
    where: {
      userId_key: { userId: gated.userId, key: "preferred_briefing_style" },
    },
    create: {
      userId: gated.userId,
      key: "preferred_briefing_style",
      value: "short timeline with prep priorities",
      category: "preference",
    },
    update: {
      value: "short timeline with prep priorities",
      category: "preference",
    },
  });

  return NextResponse.json({ ok: true });
}
