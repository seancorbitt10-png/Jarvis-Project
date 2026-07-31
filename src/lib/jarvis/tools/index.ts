import { tool } from "ai";
import { z } from "zod";
import {
  buildUnifiedTomorrow,
  getClassroomWork,
  getNotesForJarvis,
  getRecentSchoolEmail,
  getRenwebEvents,
  getTomorrowCalendar,
} from "@/lib/jarvis/tools/school";
import { formatTimelineForPrompt } from "@/lib/jarvis/demo-data";
import { upsertMemory } from "@/lib/jarvis/memory";
import { prisma } from "@/lib/db";

export function createJarvisTools(userId: string) {
  return {
    get_tomorrow_timeline: tool({
      description:
        "Build a unified read-only timeline for tomorrow across Google Calendar, Classroom, Gmail, RenWeb, and Notes.",
      inputSchema: z.object({}),
      execute: async () => {
        const items = await buildUnifiedTomorrow(userId);
        return {
          count: items.length,
          timeline: formatTimelineForPrompt(items),
          items,
        };
      },
    }),
    get_calendar_tomorrow: tool({
      description: "Fetch tomorrow's Google Calendar events (read-only).",
      inputSchema: z.object({}),
      execute: async () => {
        const items = await getTomorrowCalendar(userId);
        return { timeline: formatTimelineForPrompt(items), items };
      },
    }),
    get_classroom_due_tomorrow: tool({
      description:
        "Fetch Google Classroom assignments/quizzes due tomorrow (read-only).",
      inputSchema: z.object({}),
      execute: async () => {
        const items = await getClassroomWork(userId);
        return { timeline: formatTimelineForPrompt(items), items };
      },
    }),
    get_school_email: tool({
      description: "Fetch recent school-related Gmail messages (read-only).",
      inputSchema: z.object({
        maxResults: z.number().min(1).max(20).optional(),
      }),
      execute: async ({ maxResults }) => {
        const items = await getRecentSchoolEmail(userId, maxResults ?? 8);
        return { timeline: formatTimelineForPrompt(items), items };
      },
    }),
    get_renweb_events: tool({
      description:
        "Fetch RenWeb/FACTS events if the connector is enabled (stub/demo in v1).",
      inputSchema: z.object({}),
      execute: async () => {
        const items = await getRenwebEvents(userId);
        return { timeline: formatTimelineForPrompt(items), items };
      },
    }),
    get_notes: tool({
      description:
        "List notes/transcripts from the Notes plugin when the user has installed it and granted read permission.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Optional keyword filter for titles/content"),
      }),
      execute: async ({ query }) => {
        const plugin = await prisma.userPlugin.findUnique({
          where: { userId_pluginId: { userId, pluginId: "notes" } },
        });
        if (!plugin?.enabled) {
          return {
            error:
              "Notes plugin is not installed. Ask the user to install it under Plugins.",
          };
        }
        if (!plugin.permissions.includes("read")) {
          return { error: "Notes plugin is installed but read access is off." };
        }

        const notes = await prisma.note.findMany({
          where: {
            userId,
            ...(query
              ? {
                  OR: [
                    { title: { contains: query } },
                    { content: { contains: query } },
                  ],
                }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        });

        if (!notes.length) {
          const demo = await getNotesForJarvis(userId);
          return {
            notes: demo.map((n) => ({
              title: n.title,
              summary: n.subtitle,
            })),
            source: "demo_or_empty",
          };
        }

        return {
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content.slice(0, 2000),
            source: n.source,
            tags: n.tags,
            updatedAt: n.updatedAt,
          })),
        };
      },
    }),
    remember_fact: tool({
      description:
        "Store a durable preference or fact about the user for future sessions.",
      inputSchema: z.object({
        key: z.string().describe("Short snake_case key"),
        value: z.string(),
        category: z
          .string()
          .optional()
          .describe("e.g. preference, course, schedule"),
      }),
      execute: async ({ key, value, category }) => {
        await upsertMemory(userId, key, value, category ?? "general");
        return { ok: true, key, value };
      },
    }),
    list_connections: tool({
      description: "List the user's Synapse app connections and plugin access.",
      inputSchema: z.object({}),
      execute: async () => {
        const [connections, plugins] = await Promise.all([
          prisma.connection.findMany({ where: { userId } }),
          prisma.userPlugin.findMany({ where: { userId } }),
        ]);
        return {
          connections: connections.map((c) => ({
            provider: c.provider,
            label: c.label,
            status: c.status,
            permissions: c.permissions,
          })),
          plugins: plugins.map((p) => ({
            pluginId: p.pluginId,
            enabled: p.enabled,
            permissions: p.permissions,
          })),
        };
      },
    }),
  };
}
