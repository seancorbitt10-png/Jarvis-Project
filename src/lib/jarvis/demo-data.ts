import { addDays, format, startOfDay } from "date-fns";

export type TimelineItem = {
  id: string;
  source: "calendar" | "classroom" | "gmail" | "renweb" | "notes";
  title: string;
  subtitle?: string;
  startsAt?: string;
  endsAt?: string;
  type: "event" | "assignment" | "test" | "email" | "note";
  url?: string;
};

export function getDemoTomorrow(): TimelineItem[] {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const day = format(tomorrow, "yyyy-MM-dd");

  return [
    {
      id: "cal-1",
      source: "calendar",
      title: "AP Chemistry",
      subtitle: "Room 204 · Period 2",
      startsAt: `${day}T09:00:00`,
      endsAt: `${day}T09:50:00`,
      type: "event",
    },
    {
      id: "cal-2",
      source: "calendar",
      title: "Dual Enrollment English Comp",
      subtitle: "Online lecture block",
      startsAt: `${day}T11:00:00`,
      endsAt: `${day}T12:15:00`,
      type: "event",
    },
    {
      id: "class-1",
      source: "classroom",
      title: "Lab report due: Stoichiometry",
      subtitle: "AP Chemistry · Google Classroom",
      startsAt: `${day}T23:59:00`,
      type: "assignment",
    },
    {
      id: "class-2",
      source: "classroom",
      title: "Quiz: Literary devices",
      subtitle: "English Comp · Google Classroom",
      startsAt: `${day}T11:00:00`,
      type: "test",
    },
    {
      id: "rw-1",
      source: "renweb",
      title: "Spirit Week pep rally",
      subtitle: "RenWeb / FACTS calendar",
      startsAt: `${day}T14:30:00`,
      endsAt: `${day}T15:15:00`,
      type: "event",
    },
    {
      id: "mail-1",
      source: "gmail",
      title: "Teacher: bring lab notebook tomorrow",
      subtitle: "Unread · Mrs. Chen",
      startsAt: format(new Date(), "yyyy-MM-dd'T'18:42:00"),
      type: "email",
    },
    {
      id: "note-1",
      source: "notes",
      title: "Chem review: limiting reagents",
      subtitle: "From Notes plugin transcript",
      type: "note",
    },
  ];
}

export function formatTimelineForPrompt(items: TimelineItem[]) {
  if (!items.length) return "No items found.";
  return items
    .map((item) => {
      const when = item.startsAt ? ` @ ${item.startsAt}` : "";
      return `- [${item.source}/${item.type}] ${item.title}${when}${
        item.subtitle ? ` — ${item.subtitle}` : ""
      }`;
    })
    .join("\n");
}
