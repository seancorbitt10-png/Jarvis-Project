import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { requireUser } from "@/lib/session";
import { buildJarvisContext, demoJarvisReply } from "@/lib/jarvis/orchestrator";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/google/client";

export const maxDuration = 60;

function extractText(message: UIMessage) {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export async function POST(req: Request) {
  const gated = await requireUser();
  if ("error" in gated) return gated.error;

  const body = await req.json();
  const messages = (body.messages ?? []) as UIMessage[];
  const conversationId = body.conversationId as string | undefined;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser ? extractText(lastUser) : "";

  let conversation =
    conversationId &&
    (await prisma.conversation.findFirst({
      where: { id: conversationId, userId: gated.userId },
    }));

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: gated.userId,
        title: prompt.slice(0, 60) || "New chat",
      },
    });
  }

  if (prompt) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: prompt,
      },
    });
  }

  const useLiveLlm = Boolean(process.env.OPENAI_API_KEY) && !isDemoMode();

  if (!useLiveLlm) {
    const reply = await demoJarvisReply(gated.userId, prompt);
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
      },
    });

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        const id = crypto.randomUUID();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: reply });
        writer.write({ type: "text-end", id });
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "x-conversation-id": conversation.id,
      },
    });
  }

  const { system, tools } = await buildJarvisContext(
    gated.userId,
    gated.user.name,
  );

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
    onFinish: async ({ text }) => {
      if (!text) return;
      await prisma.message.create({
        data: {
          conversationId: conversation!.id,
          role: "assistant",
          content: text,
        },
      });
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-conversation-id": conversation.id,
    },
  });
}
