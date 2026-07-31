"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

function messageText(message: {
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (!message.parts?.length) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

const SUGGESTIONS = [
  "What's tomorrow look like?",
  "What homework or tests should I prep for?",
  "Summarize my notes",
  "Which connections do I have enabled?",
];

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ conversationId }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const id = res.headers.get("x-conversation-id");
          if (id) setConversationId(id);
          return res;
        },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="panel flex h-[calc(100vh-7.5rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h1 className="display text-2xl font-semibold">Jarvis</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Synapse orchestrator · read-only school tools + plugins
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={async () => {
            await fetch("/api/demo/seed", { method: "POST" });
            alert("Demo connections, Notes plugin, and sample memory seeded.");
          }}
        >
          <Sparkles size={16} />
          Seed demo data
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="animate-rise mx-auto max-w-2xl pt-8 text-center">
            <h2 className="display text-3xl font-semibold">Ask across everything</h2>
            <p className="mt-3 text-[var(--ink-soft)]">
              Jarvis will pull Calendar, Classroom, Gmail, RenWeb, and permitted
              plugin data into one answer.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => sendMessage({ text: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = messageText(message);
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-white/80"
                }`}
              >
                {!isUser && (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-deep)]">
                    Jarvis
                  </div>
                )}
                <div className="prose-chat text-[0.98rem]">{text}</div>
              </div>
            </div>
          );
        })}

        {(status === "submitted" || status === "streaming") && (
          <div className="text-sm text-[var(--ink-soft)]">Jarvis is thinking…</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--line)] p-4"
      >
        <div className="flex items-end gap-2">
          <textarea
            className="textarea min-h-[52px] flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Jarvis about tomorrow, due work, notes…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary h-[52px] w-[52px] shrink-0 rounded-2xl p-0"
            disabled={!input.trim() || status === "streaming"}
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
