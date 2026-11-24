"use client";
import { useEffect, useRef, useState } from "react";
import { Quote, Send } from "lucide-react";
import { Button, Card, ModeBadge, Notice, Spinner } from "@/components/ui";
import { sectionLabel } from "@/lib/client";
import type { ChatApi } from "./useChat";

const CHIPS = [
  "What happens if I leave before three years?",
  "Can the company terminate me without notice?",
  "What are my main responsibilities?",
  "Are there any unusual penalties?",
  "What deadlines should I know about?",
];

export function ChatPanel({ chat, prefill, onJump }: { chat: ChatApi; prefill?: string; onJump: (segmentId: number, quote: string) => void }) {
  const [text, setText] = useState(prefill ?? "");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (prefill) setText(prefill); }, [prefill]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [chat.messages, chat.busy]);

  function submit(q: string) {
    if (!q.trim() || chat.busy) return;
    setText("");
    chat.ask(q);
  }

  return (
    <Card>
      <h2 className="font-display text-2xl font-semibold">Ask LexiGuard</h2>
      <p className="mt-1 text-sm text-ink-soft">Answers come only from your uploaded contract. If the document doesn&apos;t say, the answer will say so.</p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggested questions">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => submit(c)} disabled={chat.busy} className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-brand-tint disabled:opacity-50">{c}</button>
        ))}
      </div>

      <div className="mt-5 max-h-[28rem] space-y-4 overflow-y-auto pr-1" aria-live="polite">
        {chat.messages.length === 0 && <p className="rounded-xl bg-paper p-4 text-sm text-ink-soft">Try one of the questions above, or type your own.</p>}
        {chat.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white">{m.content}</div>
          ) : (
            <div key={i} className="max-w-full space-y-3 rounded-2xl rounded-bl-md border border-line bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={m.answer?.mode ?? "live"} />
                {m.answer && !m.answer.found && <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-soft">Not found in document</span>}
                {m.answer?.found && <span className="text-xs text-ink-faint">Confidence: {m.answer.confidence}</span>}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.answer?.uncertainty && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-950"><strong>Uncertainty:</strong> {m.answer.uncertainty}</p>}
              {m.answer && m.answer.sources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-ink-soft">What the contract says</p>
                  {m.answer.sources.map((s, j) => (
                    <blockquote key={j} className="rounded-lg border-l-4 border-brand bg-paper p-3 text-xs text-ink-soft">
                      <Quote className="mb-1 h-3 w-3 text-brand" aria-hidden />
                      {s.quote}
                      <button onClick={() => onJump(s.segmentId, s.quote)} className="mt-2 block font-medium text-brand hover:underline">
                        {sectionLabel(s.page, s.segmentId)}: show in document
                      </button>
                    </blockquote>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {chat.busy && <Spinner label="Reading the contract…" />}
        <div ref={end} />
      </div>

      {chat.error && <Notice tone="error" className="mt-3">{chat.error}</Notice>}

      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <label className="sr-only" htmlFor="q">Your question</label>
        <input id="q" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ask about a clause, a deadline, a penalty…" className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm placeholder:text-ink-faint" />
        <Button type="submit" disabled={!text.trim() || chat.busy}><Send className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Ask</span></Button>
      </form>
    </Card>
  );
}
