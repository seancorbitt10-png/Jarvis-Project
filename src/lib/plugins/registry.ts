export type PluginCapability =
  | "notes.read"
  | "notes.list"
  | "calendar.read"
  | "email.read"
  | "classroom.read"
  | "sis.read";

export type PluginDefinition = {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: PluginCapability[];
  category: "productivity" | "school" | "communication" | "other";
};

export const PLUGIN_CATALOG: PluginDefinition[] = [
  {
    id: "notes",
    name: "Notes",
    description:
      "Sample note-taker plugin. Store transcripts and notes Jarvis can summarize when permitted.",
    version: "0.1.0",
    capabilities: ["notes.read", "notes.list"],
    category: "productivity",
  },
];

export function getPlugin(id: string) {
  return PLUGIN_CATALOG.find((p) => p.id === id);
}
