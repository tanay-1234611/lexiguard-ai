"use client";
import { Card } from "@/components/ui";
import { sectionLabel } from "@/lib/client";
import type { Analysis } from "@/types/contract";

const KIND = { date: "Date", deadline: "Deadline", duration: "Period", penalty: "Penalty" } as const;

export function DatesObligations({ analysis, onJump }: { analysis: Analysis; onJump: (segmentId: number, quote: string) => void }) {
  const link = (page: number | null, seg: number | null, quote: string) =>
    seg === null ? <span className="text-ink-faint">Not located</span> : (
      <button onClick={() => onJump(seg, quote)} className="font-medium text-brand hover:underline">{sectionLabel(page, seg)}</button>
    );
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-2xl font-semibold">Important dates and deadlines</h2>
        <p className="mt-1 text-sm text-ink-soft">Only dates and periods that appear in the contract text. Relative deadlines are shown as written.</p>
        {analysis.importantDates.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No dates or deadlines were found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-soft">
                <tr><th className="py-2 pr-3 font-medium">Event</th><th className="py-2 pr-3 font-medium">Type</th><th className="py-2 pr-3 font-medium">Date or period</th><th className="py-2 pr-3 font-medium">Source</th><th className="py-2 font-medium">Explanation</th></tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {analysis.importantDates.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 pr-3 font-medium">{d.event}</td>
                    <td className="py-3 pr-3">{KIND[d.kind]}</td>
                    <td className="py-3 pr-3">{d.dateOrPeriod ?? <span className="text-ink-faint">Not stated</span>}</td>
                    <td className="py-3 pr-3">{link(d.page, d.segmentId, d.originalText)}</td>
                    <td className="py-3 text-ink-soft">{d.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-semibold">Obligations and responsibilities</h2>
        {analysis.obligations.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No obligations were extracted.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {analysis.obligations.map((o) => (
              <li key={o.id} className="py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{o.description}</span><span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">{o.responsibleParty}</span></p>
                {o.explanation && <p className="mt-1 text-ink-soft">{o.explanation}</p>}
                <blockquote className="mt-2 rounded-lg border-l-4 border-line bg-paper p-2.5 font-display text-[14px] text-ink-soft">{o.originalText}</blockquote>
                <p className="mt-1 text-xs">{link(o.page, o.segmentId, o.originalText)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
