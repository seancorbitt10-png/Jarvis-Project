import { prisma } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/jarvis/system-prompt";
import { createJarvisTools } from "@/lib/jarvis/tools";
import { buildUnifiedTomorrow } from "@/lib/jarvis/tools/school";
import { formatTimelineForPrompt } from "@/lib/jarvis/demo-data";
import { isDemoMode } from "@/lib/google/client";
import {
  formatPersonalContextForPrompt,
  getPersonalContext,
} from "@/lib/jarvis/personal-context";

export {
  getPersonalContext,
  formatPersonalContextForPrompt,
  ACTIVE_ENTITY_STATUS,
  COMPLETED_TASK_STATUSES,
  type PersonalContext,
  type PersonalContextProfile,
  type PersonalContextGoal,
  type PersonalContextProject,
  type PersonalContextTask,
  type PersonalContextMemory,
} from "@/lib/jarvis/personal-context";

/**
 * Live-LLM prompt/tools assembly.
 * Loads PersonalContext once and injects it into the system prompt.
 * School Connections/Plugins remain available for this stage.
 */
export async function buildJarvisContext(
  userId: string,
  userName?: string | null,
) {
  const [personalContext, connections, plugins] = await Promise.all([
    getPersonalContext(userId),
    prisma.connection.findMany({ where: { userId } }),
    prisma.userPlugin.findMany({ where: { userId } }),
  ]);

  const system = buildSystemPrompt({
    userName,
    personalContext: formatPersonalContextForPrompt(personalContext),
    connections:
      connections
        .map(
          (c) =>
            `- ${c.label} (${c.provider}): ${c.status}, perms=${c.permissions}`,
        )
        .join("\n") || "None connected yet.",
    plugins:
      plugins
        .map(
          (p) =>
            `- ${p.pluginId}: ${p.enabled ? "enabled" : "disabled"}, perms=${p.permissions}`,
        )
        .join("\n") || "No plugins installed.",
  });

  return {
    system,
    tools: createJarvisTools(userId),
    personalContext,
  };
}

/** Offline/demo reply when OpenAI is unavailable. */
export async function demoJarvisReply(userId: string, prompt: string) {
  const lower = prompt.toLowerCase();
  const wantsTimeline =
    /tomorrow|schedule|what.?s due|timeline|prepare|calendar|homework|test|quiz/.test(
      lower,
    );

  if (wantsTimeline) {
    const items = await buildUnifiedTomorrow(userId);
    if (!items.length) {
      return (
        "I don't see any connected school data yet. Open **Connections**, connect Google " +
        "(Calendar, Gmail, Classroom), optionally enable RenWeb, and install the Notes plugin " +
        "so I can build your tomorrow timeline."
      );
    }

    const lines = items.map((item) => {
      const time = item.startsAt
        ? new Date(item.startsAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "—";
      return `• ${time} · ${item.title} · ${item.source}${
        item.subtitle ? ` (${item.subtitle})` : ""
      }`;
    });

    return [
      "Here's your Synapse timeline for tomorrow (demo/orchestrator mode):",
      "",
      ...lines,
      "",
      "Priority prep: focus on any tests/quizzes first, then due assignments, then events.",
      "",
      `Raw tool view:\n${formatTimelineForPrompt(items)}`,
    ].join("\n");
  }

  if (/note|transcript|summar/.test(lower)) {
    const plugin = await prisma.userPlugin.findUnique({
      where: { userId_pluginId: { userId, pluginId: "notes" } },
    });
    if (!plugin?.enabled) {
      return "The Notes plugin isn't installed. Go to Plugins → install Notes, then grant me read access.";
    }
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    if (!notes.length) {
      return (
        "Notes is installed, but I don't see entries yet. Add a note on the Plugins page " +
        "and I'll summarize it here."
      );
    }
    return [
      "Here are your latest notes:",
      ...notes.map(
        (n) =>
          `### ${n.title}\n${n.content.slice(0, 500)}${n.content.length > 500 ? "…" : ""}`,
      ),
    ].join("\n\n");
  }

  return (
    "I'm Jarvis on Synapse (demo mode). Ask me things like:\n" +
    "• \"What's tomorrow look like?\"\n" +
    "• \"What homework is due?\"\n" +
    "• \"Summarize my notes\"\n\n" +
    (isDemoMode()
      ? "DEMO_MODE is on — Google/OpenAI live calls are stubbed with sample school data until keys are set."
      : "Add OPENAI_API_KEY for full LLM orchestration.")
  );
}
