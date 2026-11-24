import { describe, expect, it } from "vitest";
import { buildPassages, search } from "@/lib/retrieval";
import { chunkSegments } from "@/lib/chunking";
import { sampleSegments } from "@/lib/demo";
import { verifyQuote } from "@/lib/validation";

describe("retrieval over the fictional sample", () => {
  const segments = sampleSegments();
  const passages = buildPassages(segments);

  it("keeps page numbers on passages", () => {
    expect(passages.every((p) => p.page !== null)).toBe(true);
  });
  it("passage text is quotable (verifies against the document)", () => {
    for (const p of passages.slice(0, 5)) expect(verifyQuote(p.text, segments).verified).toBe(true);
  });
  it("finds the early exit clause for a 'leave early' question", () => {
    const top = search(passages, "What happens if I leave before three years?", 3);
    expect(top.some((p) => /Early Exit Repayment/.test(p.text))).toBe(true);
  });
  it("returns nothing for unrelated queries", () => {
    expect(search(passages, "xylophone zebra", 3)).toEqual([]);
  });
});

describe("chunking", () => {
  it("never drops text", () => {
    const segs = Array.from({ length: 10 }, (_, i) => ({ id: i, page: i + 1, text: "x".repeat(5000) }));
    const chunks = chunkSegments(segs, 12000);
    expect(chunks.flat().length).toBe(10);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
