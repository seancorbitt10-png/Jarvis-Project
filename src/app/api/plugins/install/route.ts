import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLUGIN_CATALOG, getPlugin } from "@/lib/plugins/registry";
import { NextResponse } from "next/server";

export async function GET() {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const installed = await prisma.userPlugin.findMany({
    where: { userId: gated.userId },
  });
  const byId = Object.fromEntries(installed.map((p) => [p.pluginId, p]));

  return NextResponse.json({
    catalog: PLUGIN_CATALOG.map((plugin) => ({
      ...plugin,
      installed: Boolean(byId[plugin.id]),
      enabled: byId[plugin.id]?.enabled ?? false,
      permissions: byId[plugin.id]?.permissions ?? "none",
    })),
  });
}

export async function POST(req: Request) {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const body = await req.json();
  const pluginId = body.pluginId as string;
  const action = body.action as
    | "install"
    | "uninstall"
    | "enable"
    | "disable"
    | "set_permissions";
  const permissions = (body.permissions as string) || "read";

  const def = getPlugin(pluginId);
  if (!def) {
    return NextResponse.json({ error: "Unknown plugin" }, { status: 400 });
  }

  if (action === "install") {
    await prisma.userPlugin.upsert({
      where: { userId_pluginId: { userId: gated.userId, pluginId } },
      create: {
        userId: gated.userId,
        pluginId,
        enabled: true,
        permissions: "read",
      },
      update: { enabled: true, permissions: "read" },
    });

    // Seed a sample note so Jarvis has something to summarize in demo.
    const count = await prisma.note.count({ where: { userId: gated.userId } });
    if (count === 0) {
      await prisma.note.create({
        data: {
          userId: gated.userId,
          title: "Chem review: limiting reagents",
          content:
            "Transcript excerpt — Limiting reagents determine how far a reaction proceeds. " +
            "Steps: 1) balance equation 2) convert to moles 3) compare mole ratios 4) identify limiting reactant. " +
            "Practice problem: 5g H2 + 20g O2 → water. H2 is limiting. Quiz tomorrow covers this.",
          source: "notes_plugin_sample",
          tags: "chemistry,quiz",
        },
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "uninstall") {
    await prisma.userPlugin.deleteMany({
      where: { userId: gated.userId, pluginId },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "enable" || action === "disable") {
    await prisma.userPlugin.update({
      where: { userId_pluginId: { userId: gated.userId, pluginId } },
      data: { enabled: action === "enable" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "set_permissions") {
    await prisma.userPlugin.update({
      where: { userId_pluginId: { userId: gated.userId, pluginId } },
      data: { permissions },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
