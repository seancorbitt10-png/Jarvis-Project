import { prisma } from "@/lib/db";
import { getUserMemories, memoriesToPrompt } from "@/lib/jarvis/memory";

/** Goal/Project statuses treated as "active" for V1 context retrieval. */
export const ACTIVE_ENTITY_STATUS = "active";

/** Task statuses excluded from the personal context task list. */
export const COMPLETED_TASK_STATUSES = ["done", "cancelled"] as const;

const LIMITS = {
  goals: 25,
  projects: 50,
  tasks: 100,
} as const;

export type PersonalContextProfile = {
  id: string;
  summary: string | null;
  timezone: string | null;
  updatedAt: string;
};

export type PersonalContextGoal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  targetDate: string | null;
  updatedAt: string;
};

export type PersonalContextProject = {
  id: string;
  goalId: string | null;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
};

export type PersonalContextTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string | null;
  priority: number | null;
  completedAt: string | null;
  updatedAt: string;
};

export type PersonalContextMemory = {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
};

/**
 * Deterministic assembled personal state for Jarvis V1.
 * Empty collections are valid; profile may be null when unset.
 */
export type PersonalContext = {
  userId: string;
  profile: PersonalContextProfile | null;
  goals: PersonalContextGoal[];
  projects: PersonalContextProject[];
  tasks: PersonalContextTask[];
  memories: PersonalContextMemory[];
  meta: {
    retrievedAt: string;
    limits: typeof LIMITS;
    counts: {
      hasProfile: boolean;
      goals: number;
      projects: number;
      tasks: number;
      memories: number;
    };
  };
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Load the user's persistent Jarvis personal state for server-side use.
 * Does not invent defaults. Missing profile yields profile: null.
 */
export async function getPersonalContext(
  userId: string,
): Promise<PersonalContext> {
  const retrievedAt = new Date().toISOString();

  const [profileRow, goalRows, projectRows, taskRows, memoryRows] =
    await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          summary: true,
          timezone: true,
          updatedAt: true,
        },
      }),
      prisma.goal.findMany({
        where: { userId, status: ACTIVE_ENTITY_STATUS },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: LIMITS.goals,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          targetDate: true,
          updatedAt: true,
        },
      }),
      prisma.project.findMany({
        where: { userId, status: ACTIVE_ENTITY_STATUS },
        orderBy: [{ createdAt: "asc" }],
        take: LIMITS.projects,
        select: {
          id: true,
          goalId: true,
          title: true,
          description: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: { notIn: [...COMPLETED_TASK_STATUSES] },
        },
        orderBy: [{ dueAt: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
        take: LIMITS.tasks,
        select: {
          id: true,
          projectId: true,
          title: true,
          description: true,
          status: true,
          dueAt: true,
          priority: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
      getUserMemories(userId),
    ]);

  const profile: PersonalContextProfile | null = profileRow
    ? {
        id: profileRow.id,
        summary: profileRow.summary,
        timezone: profileRow.timezone,
        updatedAt: profileRow.updatedAt.toISOString(),
      }
    : null;

  const goals: PersonalContextGoal[] = goalRows.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    priority: g.priority,
    targetDate: toIso(g.targetDate),
    updatedAt: g.updatedAt.toISOString(),
  }));

  const projects: PersonalContextProject[] = projectRows.map((p) => ({
    id: p.id,
    goalId: p.goalId,
    title: p.title,
    description: p.description,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
  }));

  const tasks: PersonalContextTask[] = taskRows.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    dueAt: toIso(t.dueAt),
    priority: t.priority,
    completedAt: toIso(t.completedAt),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const memories: PersonalContextMemory[] = memoryRows.map((m) => ({
    id: m.id,
    key: m.key,
    value: m.value,
    category: m.category,
    updatedAt: m.updatedAt.toISOString(),
  }));

  return {
    userId,
    profile,
    goals,
    projects,
    tasks,
    memories,
    meta: {
      retrievedAt,
      limits: LIMITS,
      counts: {
        hasProfile: profile !== null,
        goals: goals.length,
        projects: projects.length,
        tasks: tasks.length,
        memories: memories.length,
      },
    },
  };
}

/**
 * Deterministic text block for LIVE LLM system prompts.
 * Empty sections stay explicit; no invented entities.
 */
export function formatPersonalContextForPrompt(
  context: PersonalContext,
): string {
  const profileBlock = context.profile
    ? [
        `- summary: ${context.profile.summary ?? "(none)"}`,
        `- timezone: ${context.profile.timezone ?? "(none)"}`,
      ].join("\n")
    : "No profile set yet.";

  const goalsBlock = context.goals.length
    ? context.goals
        .map((g) => {
          const bits = [
            `id=${g.id}`,
            `status=${g.status}`,
            g.priority != null ? `priority=${g.priority}` : null,
            g.targetDate ? `target=${g.targetDate}` : null,
          ].filter(Boolean);
          return `- ${g.title} (${bits.join(", ")})${
            g.description ? ` — ${g.description}` : ""
          }`;
        })
        .join("\n")
    : "No active goals.";

  const projectsBlock = context.projects.length
    ? context.projects
        .map((p) => {
          const bits = [
            `id=${p.id}`,
            `status=${p.status}`,
            p.goalId ? `goalId=${p.goalId}` : "goalId=(none)",
          ];
          return `- ${p.title} (${bits.join(", ")})${
            p.description ? ` — ${p.description}` : ""
          }`;
        })
        .join("\n")
    : "No active projects.";

  const tasksBlock = context.tasks.length
    ? context.tasks
        .map((t) => {
          const bits = [
            `id=${t.id}`,
            `projectId=${t.projectId}`,
            `status=${t.status}`,
            t.priority != null ? `priority=${t.priority}` : null,
            t.dueAt ? `due=${t.dueAt}` : null,
          ].filter(Boolean);
          return `- ${t.title} (${bits.join(", ")})${
            t.description ? ` — ${t.description}` : ""
          }`;
        })
        .join("\n")
    : "No incomplete tasks.";

  const memoriesBlock = memoriesToPrompt(context.memories);

  return [
    "Profile:",
    profileBlock,
    "",
    "Active goals:",
    goalsBlock,
    "",
    "Active projects:",
    projectsBlock,
    "",
    "Incomplete tasks:",
    tasksBlock,
    "",
    "Long-term memory:",
    memoriesBlock,
  ].join("\n");
}
