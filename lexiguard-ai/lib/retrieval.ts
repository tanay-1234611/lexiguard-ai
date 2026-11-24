import type { Segment } from "@/types/contract";

export type Passage = { id: number; segmentId: number; page: number | null; text: string };

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in is it its me my of on or our so than that the their then there these they this to was we what when where which who will with would you your am any not no".split(" ")
);

const SYNONYMS: Record<string, string[]> = {
  leave: ["resign", "terminate", "notice", "exit", "quit", "early"],
  quit: ["resign", "terminate", "notice", "exit"],
  fire: ["terminate", "dismiss", "termination"],
  penalty: ["repay", "fee", "deduct", "damages", "liquidated", "fine"],
  pay: ["salary", "compensation", "payment", "wage", "fee"],
  money: ["salary", "fee", "payment", "repay"],
  responsibilities: ["obligation", "duty", "must", "shall"],
  deadline: ["within", "days", "date"],
  court: ["arbitration", "dispute", "jurisdiction"],
  compete: ["competition", "competitor", "non-compete"],
};

export function stem(w: string): string {
  let s = w.replace(/s$/, "");
  if (s.length > 6) s = s.slice(0, 6);
  return s;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
}

const SYN_BY_STEM: Record<string, string[]> = Object.fromEntries(
  Object.entries(SYNONYMS).map(([k, v]) => [stem(k), v.map(stem)])
);

function expand(tokens: string[]): string[] {
  const out = [...tokens];
  for (const t of tokens) out.push(...(SYN_BY_STEM[t] ?? []));
  return out;
}

/** Splits segments into overlapping passages. Each passage text is an exact slice of the document. */
export function buildPassages(segments: Segment[], size = 900, overlap = 150): Passage[] {
  const out: Passage[] = [];
  for (const seg of segments) {
    const t = seg.text;
    let start = 0;
    while (start < t.length) {
      let end = Math.min(t.length, start + size);
      if (end < t.length) {
        const next = t.slice(end, end + 200).search(/[.!?]\s|\n/);
        if (next !== -1) end += next + 1;
      }
      out.push({ id: out.length, segmentId: seg.id, page: seg.page, text: t.slice(start, end).trim() });
      if (end >= t.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return out.filter((p) => p.text.length > 0);
}

/** BM25 keyword retrieval. Returns only passages with a positive score. */
export function search(passages: Passage[], query: string, k = 6): (Passage & { score: number })[] {
  const q = expand(tokenize(query));
  if (q.length === 0 || passages.length === 0) return [];
  const docs = passages.map((p) => tokenize(p.text));
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  const k1 = 1.5;
  const b = 0.75;

  const scored = passages.map((p, i) => {
    const tf = new Map<string, number>();
    for (const t of docs[i]) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of new Set(q)) {
      const f = tf.get(t) ?? 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * docs[i].length) / avg));
    }
    return { ...p, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b2) => b2.score - a.score).slice(0, k);
}
