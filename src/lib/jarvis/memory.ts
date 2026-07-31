import { prisma } from "@/lib/db";

export async function getUserMemories(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
}

export async function upsertMemory(
  userId: string,
  key: string,
  value: string,
  category = "general",
) {
  return prisma.memory.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value, category },
    update: { value, category },
  });
}

export function memoriesToPrompt(
  memories: { key: string; value: string; category: string }[],
) {
  if (!memories.length) return "No long-term memories stored yet.";
  return memories
    .map((m) => `- (${m.category}) ${m.key}: ${m.value}`)
    .join("\n");
}
