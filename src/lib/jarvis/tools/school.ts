import { google } from "googleapis";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { getGoogleAuthForUser, isDemoMode } from "@/lib/google/client";
import { getDemoTomorrow, type TimelineItem } from "@/lib/jarvis/demo-data";
import { prisma } from "@/lib/db";

async function hasPermission(userId: string, provider: string) {
  const conn = await prisma.connection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  return conn?.status === "connected" && conn.permissions.includes("read");
}

export async function getTomorrowCalendar(
  userId: string,
): Promise<TimelineItem[]> {
  if (!(await hasPermission(userId, "google_calendar"))) {
    return [];
  }

  if (isDemoMode()) {
    return getDemoTomorrow().filter((i) => i.source === "calendar");
  }

  const auth = await getGoogleAuthForUser(userId);
  if (!auth) return [];

  const calendar = google.calendar({ version: "v3", auth });
  const tomorrow = addDays(new Date(), 1);
  const timeMin = startOfDay(tomorrow).toISOString();
  const timeMax = endOfDay(tomorrow).toISOString();

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 40,
  });

  return (res.data.items ?? []).map((event) => ({
    id: event.id ?? crypto.randomUUID(),
    source: "calendar" as const,
    title: event.summary ?? "Untitled event",
    subtitle: event.location ?? event.description?.slice(0, 120) ?? undefined,
    startsAt: event.start?.dateTime ?? event.start?.date ?? undefined,
    endsAt: event.end?.dateTime ?? event.end?.date ?? undefined,
    type: "event" as const,
    url: event.htmlLink ?? undefined,
  }));
}

export async function getClassroomWork(
  userId: string,
): Promise<TimelineItem[]> {
  if (!(await hasPermission(userId, "google_classroom"))) {
    return [];
  }

  if (isDemoMode()) {
    return getDemoTomorrow().filter((i) => i.source === "classroom");
  }

  const auth = await getGoogleAuthForUser(userId);
  if (!auth) return [];

  const classroom = google.classroom({ version: "v1", auth });
  const courses = await classroom.courses.list({ courseStates: ["ACTIVE"] });
  const items: TimelineItem[] = [];
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const dayAfter = addDays(tomorrow, 1);

  for (const course of courses.data.courses ?? []) {
    if (!course.id) continue;
    const coursework = await classroom.courses.courseWork.list({
      courseId: course.id,
      pageSize: 30,
      orderBy: "dueDate asc",
    });

    for (const work of coursework.data.courseWork ?? []) {
      if (!work.dueDate?.year || !work.dueDate.month || !work.dueDate.day) {
        continue;
      }
      const due = new Date(
        work.dueDate.year,
        work.dueDate.month - 1,
        work.dueDate.day,
        work.dueTime?.hours ?? 23,
        work.dueTime?.minutes ?? 59,
      );
      if (due < tomorrow || due >= dayAfter) continue;

      const isQuiz =
        /quiz|test|exam|midterm|final/i.test(work.title ?? "") ||
        work.workType === "SHORT_ANSWER_QUESTION" ||
        work.workType === "MULTIPLE_CHOICE_QUESTION";

      items.push({
        id: work.id ?? crypto.randomUUID(),
        source: "classroom",
        title: work.title ?? "Coursework",
        subtitle: `${course.name ?? "Course"} · Google Classroom`,
        startsAt: due.toISOString(),
        type: isQuiz ? "test" : "assignment",
        url: work.alternateLink ?? undefined,
      });
    }
  }

  return items;
}

export async function getRecentSchoolEmail(
  userId: string,
  maxResults = 8,
): Promise<TimelineItem[]> {
  if (!(await hasPermission(userId, "gmail"))) {
    return [];
  }

  if (isDemoMode()) {
    return getDemoTomorrow().filter((i) => i.source === "gmail");
  }

  const auth = await getGoogleAuthForUser(userId);
  if (!auth) return [];

  const gmail = google.gmail({ version: "v1", auth });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: "newer_than:7d (school OR homework OR assignment OR class OR teacher OR due)",
    maxResults,
  });

  const items: TimelineItem[] = [];
  for (const msg of list.data.messages ?? []) {
    if (!msg.id) continue;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });
    const headers = full.data.payload?.headers ?? [];
    const subject =
      headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
    const from = headers.find((h) => h.name === "From")?.value;
    const date = headers.find((h) => h.name === "Date")?.value;

    items.push({
      id: msg.id,
      source: "gmail",
      title: subject,
      subtitle: from ? `From ${from}` : "Gmail",
      startsAt: date ? new Date(date).toISOString() : undefined,
      type: "email",
    });
  }

  return items;
}

export async function getRenwebEvents(userId: string): Promise<TimelineItem[]> {
  const conn = await prisma.connection.findUnique({
    where: { userId_provider: { userId, provider: "renweb" } },
  });
  if (!conn || conn.status !== "connected") return [];

  // Stub: RenWeb/FACTS typically lacks a clean student API.
  // Demo data stands in until a credentialed connector is added.
  if (isDemoMode() || conn.metadata) {
    return getDemoTomorrow().filter((i) => i.source === "renweb");
  }

  return [];
}

export async function getNotesForJarvis(userId: string): Promise<TimelineItem[]> {
  const plugin = await prisma.userPlugin.findUnique({
    where: { userId_pluginId: { userId, pluginId: "notes" } },
  });
  if (!plugin?.enabled || !plugin.permissions.includes("read")) {
    return [];
  }

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  if (!notes.length && isDemoMode()) {
    return getDemoTomorrow().filter((i) => i.source === "notes");
  }

  return notes.map((note) => ({
    id: note.id,
    source: "notes" as const,
    title: note.title,
    subtitle: `Notes plugin · ${note.source}`,
    type: "note" as const,
  }));
}

export async function buildUnifiedTomorrow(userId: string) {
  const [calendar, classroom, gmail, renweb, notes] = await Promise.all([
    getTomorrowCalendar(userId),
    getClassroomWork(userId),
    getRecentSchoolEmail(userId),
    getRenwebEvents(userId),
    getNotesForJarvis(userId),
  ]);

  const items = [...calendar, ...classroom, ...renweb, ...gmail, ...notes];
  items.sort((a, b) => {
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.localeCompare(b.startsAt);
  });
  return items;
}
