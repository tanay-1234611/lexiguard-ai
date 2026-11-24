"use client";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { ChatAnswer } from "@/types/contract";

export type ChatMessage = { role: "user" | "assistant"; content: string; answer?: ChatAnswer };

/** Shared by the text chat and the browser voice panel so both keep one conversation. */
export function useChat(contractId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<ChatMessage[]>([]);

  const ask = useCallback(
    async (question: string): Promise<ChatAnswer | null> => {
      const q = question.trim();
      if (!q) return null;
      const history = ref.current.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const next: ChatMessage[] = [...ref.current, { role: "user", content: q }];
      ref.current = next;
      setMessages(next);
      setBusy(true);
      setError(null);
      try {
        const { answer } = await api<{ answer: ChatAnswer }>("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: contractId, question: q, history }),
        });
        const done: ChatMessage[] = [...ref.current, { role: "assistant", content: answer.answer, answer }];
        ref.current = done;
        setMessages(done);
        return answer;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [contractId]
  );

  return { messages, busy, error, ask };
}
export type ChatApi = ReturnType<typeof useChat>;
