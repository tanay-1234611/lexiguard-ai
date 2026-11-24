import type { Segment } from "@/types/contract";

export function renderSegment(s: Segment): string {
  return `[[S${s.id}${s.page ? ` | Page ${s.page}` : ""}]]\n${s.text}`;
}

/** Groups consecutive segments into chunks without ever dropping text. */
export function chunkSegments(segments: Segment[], maxChars = 12000): Segment[][] {
  const out: Segment[][] = [];
  let cur: Segment[] = [];
  let len = 0;
  for (const s of segments) {
    if (len + s.text.length > maxChars && cur.length > 0) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(s);
    len += s.text.length + 20;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}
