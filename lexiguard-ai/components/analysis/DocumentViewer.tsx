"use client";
import { Fragment, useEffect } from "react";
import { Card } from "@/components/ui";
import type { Segment } from "@/types/contract";

export type Focus = { segmentId: number; quote: string; n: number } | null;

function split(text: string, quote: string): [string, string, string] | null {
  const words = quote.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return null;
  try {
    const m = new RegExp(words.join("\\s+"), "i").exec(text);
    return m ? [text.slice(0, m.index), m[0], text.slice(m.index + m[0].length)] : null;
  } catch {
    return null;
  }
}

export function DocumentViewer({ segments, focus, className, idPrefix = "" }: { segments: Segment[]; focus: Focus; className?: string; idPrefix?: string }) {
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`${idPrefix}seg-${focus.segmentId}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [focus, idPrefix]);

  let lastPage: number | null | undefined;
  return (
    <Card className={className}>
      <h2 className="font-semibold">Original document</h2>
      <p className="text-xs text-ink-soft">Extracted text. Formatting such as tables may differ from the original file.</p>
      <div className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1 font-display text-[15px] leading-relaxed text-ink-soft" tabIndex={0} aria-label="Extracted contract text">
        {segments.map((s) => {
          const showPage = s.page !== lastPage;
          lastPage = s.page;
          const active = focus?.segmentId === s.id;
          const parts = active ? split(s.text, focus!.quote) : null;
          return (
            <Fragment key={s.id}>
              {showPage && s.page && <p className="sticky top-0 bg-white py-1 font-sans text-xs font-semibold text-ink-faint">Page {s.page}</p>}
              <div id={`${idPrefix}seg-${s.id}`} className={`whitespace-pre-wrap rounded-lg p-2 ${active ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>
                {!s.page && <span className="mb-1 block font-sans text-xs font-semibold text-ink-faint">Section {s.id + 1}</span>}
                {parts ? (<>{parts[0]}<mark className="clause-mark">{parts[1]}</mark>{parts[2]}</>) : s.text}
              </div>
            </Fragment>
          );
        })}
      </div>
    </Card>
  );
}
