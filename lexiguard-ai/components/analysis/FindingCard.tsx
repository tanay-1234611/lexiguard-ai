"use client";
import { useState } from "react";
import { ChevronDown, FileSearch, MessageCircleQuestion, Scale } from "lucide-react";
import { Button, SeverityBadge } from "@/components/ui";
import { sectionLabel } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { Clause } from "@/types/contract";

export function FindingCard({
  clause,
  onShow,
  onAsk,
  onCompare,
  defaultOpen,
}: {
  clause: Clause;
  onShow: (clause: Clause) => void;
  onAsk: (clause: Clause) => void;
  onCompare: (clause: Clause) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <article className="rounded-2xl border border-line bg-white shadow-card">
      <button className="flex w-full items-start gap-3 p-4 text-left sm:p-5" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{clause.title}</h3>
            <SeverityBadge severity={clause.severity} />
            <span className="text-xs text-ink-faint">{sectionLabel(clause.page, clause.segmentId)}</span>
          </div>
          {!open && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{clause.explanation}</p>}
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4 text-sm sm:p-5">
          <div>
            <p className="text-xs font-medium text-ink-soft">What the contract says ({sectionLabel(clause.page, clause.segmentId)})</p>
            <blockquote className="mt-1 rounded-lg border-l-4 border-brand bg-paper p-3 font-display text-[15px] leading-relaxed">{clause.originalText}</blockquote>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-soft">In plain English (AI interpretation)</p>
            <p className="mt-1">{clause.explanation}</p>
          </div>
          {clause.whyItMatters && (
            <div>
              <p className="text-xs font-medium text-ink-soft">Why it may matter</p>
              <p className="mt-1">{clause.whyItMatters}</p>
            </div>
          )}
          {clause.questionsToAsk.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-soft">Questions to ask</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">{clause.questionsToAsk.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          )}
          {clause.suggestedNextStep && (
            <div className="rounded-lg bg-brand-tint p-3">
              <p className="text-xs font-medium text-brand-dark">Suggested next step</p>
              <p className="mt-0.5">{clause.suggestedNextStep}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onShow(clause)}><FileSearch className="h-4 w-4" aria-hidden />Show in document</Button>
            <Button variant="secondary" onClick={() => onAsk(clause)}><MessageCircleQuestion className="h-4 w-4" aria-hidden />Ask about this</Button>
            <Button variant="secondary" onClick={() => onCompare(clause)}><Scale className="h-4 w-4" aria-hidden />Compare wording</Button>
          </div>
        </div>
      )}
    </article>
  );
}
