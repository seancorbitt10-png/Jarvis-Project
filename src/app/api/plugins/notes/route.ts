import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const plugin = await prisma.userPlugin.findUnique({
    where: { userId_pluginId: { userId: gated.userId, pluginId: "notes" } },
  });
  if (!plugin?.enabled) {
    return NextResponse.json(
      { error: "Notes plugin not installed/enabled" },
      { status: 403 },
    );
  }

  const notes = await prisma.note.findMany({
    where: { userId: gated.userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const plugin = await prisma.userPlugin.findUnique({
    where: { userId_pluginId: { userId: gated.userId, pluginId: "notes" } },
  });
  if (!plugin?.enabled) {
    return NextResponse.json(
      { error: "Notes plugin not installed/enabled" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content required" },
      { status: 400 },
    );
  }

  const note = await prisma.note.create({
    data: {
      userId: gated.userId,
      title,
      content,
      source: "manual",
      tags: body.tags ? String(body.tags) : null,
    },
  });

  return NextResponse.json({ note });
}
