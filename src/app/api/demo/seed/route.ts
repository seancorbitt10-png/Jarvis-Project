import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Demo seed for local testing.
 * TEMPORARY: also upserts identifiable Jarvis V1 personal-state test rows
 * (UserProfile → Goal → Project → Task) for the authenticated user.
 * Remove/narrow this personal-state block after live-LLM verification.
 */

const TEST_PROFILE_SUMMARY =
  "[TEST] Jarvis V1 personal profile — verify PersonalContext reaches live LLM";
const TEST_PROFILE_TIMEZONE = "America/New_York";
const TEST_GOAL_TITLE = "[TEST] Jarvis V1 personal goal";
const TEST_GOAL_DESCRIPTION =
  "[TEST] Prove Profile → Goal → Project → Task appears in live Jarvis context.";
const TEST_PROJECT_TITLE = "[TEST] Jarvis V1 personal project";
const TEST_PROJECT_DESCRIPTION =
  "[TEST] Project under the V1 personal goal for context verification.";
const TEST_TASK_TITLE = "[TEST] Jarvis V1 personal task";
const TEST_TASK_DESCRIPTION =
  "[TEST] Incomplete task under the V1 personal project for context verification.";

export async function POST() {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const userId = gated.userId;

  const providers = [
    { provider: "google_calendar", label: "Google Calendar" },
    { provider: "gmail", label: "Gmail" },
    { provider: "google_classroom", label: "Google Classroom" },
    { provider: "renweb", label: "RenWeb / FACTS" },
  ];

  for (const p of providers) {
    await prisma.connection.upsert({
      where: {
        userId_provider: { userId, provider: p.provider },
      },
      create: {
        userId,
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
      userId_pluginId: { userId, pluginId: "notes" },
    },
    create: {
      userId,
      pluginId: "notes",
      enabled: true,
      permissions: "read",
    },
    update: { enabled: true, permissions: "read" },
  });

  const noteCount = await prisma.note.count({ where: { userId } });
  if (noteCount === 0) {
    await prisma.note.create({
      data: {
        userId,
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
      userId_key: { userId, key: "preferred_briefing_style" },
    },
    create: {
      userId,
      key: "preferred_briefing_style",
      value: "short timeline with prep priorities",
      category: "preference",
    },
    update: {
      value: "short timeline with prep priorities",
      category: "preference",
    },
  });

  // --- TEMPORARY V1 personal-state verification seed (idempotent) ---
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      summary: TEST_PROFILE_SUMMARY,
      timezone: TEST_PROFILE_TIMEZONE,
    },
    update: {
      summary: TEST_PROFILE_SUMMARY,
      timezone: TEST_PROFILE_TIMEZONE,
    },
  });

  const existingGoal = await prisma.goal.findFirst({
    where: { userId, title: TEST_GOAL_TITLE },
  });
  const goal = existingGoal
    ? await prisma.goal.update({
        where: { id: existingGoal.id },
        data: {
          description: TEST_GOAL_DESCRIPTION,
          status: "active",
          priority: 1,
        },
      })
    : await prisma.goal.create({
        data: {
          userId,
          title: TEST_GOAL_TITLE,
          description: TEST_GOAL_DESCRIPTION,
          status: "active",
          priority: 1,
        },
      });

  const existingProject = await prisma.project.findFirst({
    where: { userId, title: TEST_PROJECT_TITLE },
  });
  const project = existingProject
    ? await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          description: TEST_PROJECT_DESCRIPTION,
          status: "active",
          goalId: goal.id,
        },
      })
    : await prisma.project.create({
        data: {
          userId,
          goalId: goal.id,
          title: TEST_PROJECT_TITLE,
          description: TEST_PROJECT_DESCRIPTION,
          status: "active",
        },
      });

  const existingTask = await prisma.task.findFirst({
    where: { userId, title: TEST_TASK_TITLE },
  });
  const task = existingTask
    ? await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          description: TEST_TASK_DESCRIPTION,
          status: "todo",
          projectId: project.id,
          priority: 1,
          completedAt: null,
        },
      })
    : await prisma.task.create({
        data: {
          userId,
          projectId: project.id,
          title: TEST_TASK_TITLE,
          description: TEST_TASK_DESCRIPTION,
          status: "todo",
          priority: 1,
        },
      });

  return NextResponse.json({
    ok: true,
    personalStateTest: {
      temporary: true,
      profileId: profile.id,
      goalId: goal.id,
      projectId: project.id,
      taskId: task.id,
      titles: {
        profileSummary: TEST_PROFILE_SUMMARY,
        goal: TEST_GOAL_TITLE,
        project: TEST_PROJECT_TITLE,
        task: TEST_TASK_TITLE,
      },
    },
  });
}
