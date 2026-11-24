import { describe, expect, it } from "vitest";
import { mergeChunkResults, riskFromScore } from "@/lib/contract-analysis";
import { demoAnalysis, demoAnswer, sampleSegments } from "@/lib/demo";
import { packParagraphs, toSegments } from "@/lib/document-parser";
import { E164 } from "@/lib/validation";

describe("mergeChunkResults", () => {
  const segments = sampleSegments();
  it("drops findings whose quotes are not in the document and counts them", () => {
    const merged = mergeChunkResults(
      [{
        clauses: [
          { title: "Real", kind: "risk", severity: "High", originalText: "retention and training fee of USD 18,000 within fifteen (15) days", explanation: "", whyItMatters: "", questionsToAsk: [], suggestedNextStep: "" },
          { title: "Invented", kind: "risk", severity: "Critical", originalText: "The Employee forfeits all savings upon resignation.", explanation: "", whyItMatters: "", questionsToAsk: [], suggestedNextStep: "" },
        ],
        obligations: [],
        importantDates: [],
      }],
      segments
    );
    expect(merged.clauses.map((c) => c.title)).toEqual(["Real"]);
    expect(merged.clauses[0].page).toBe(3);
    expect(merged.dropped).toBe(1);
  });
  it("deduplicates repeated quotes keeping the higher severity", () => {
    const text = "must report to the Company's office at the address stated in Schedule A";
    const c = (severity: "Low" | "High") => ({ title: "x", kind: "risk" as const, severity, originalText: text, explanation: "", whyItMatters: "", questionsToAsk: [], suggestedNextStep: "" });
    const merged = mergeChunkResults([{ clauses: [c("Low")], obligations: [], importantDates: [] }, { clauses: [c("High")], obligations: [], importantDates: [] }], segments);
    expect(merged.clauses).toHaveLength(1);
    expect(merged.clauses[0].severity).toBe("High");
  });
});

describe("riskFromScore", () => {
  it("maps score bands", () => {
    expect([10, 30, 60, 90].map(riskFromScore)).toEqual(["Low", "Medium", "High", "Critical"]);
  });
});

describe("demo mode", () => {
  const segments = sampleSegments();
  it("every demo finding is located in the document with a real page", () => {
    const a = demoAnalysis(segments);
    expect(a.mode).toBe("demo");
    expect(a.clauses.length).toBeGreaterThan(5);
    expect(a.clauses.every((c) => c.page !== null && c.segmentId !== null)).toBe(true);
    expect(a.clauses.find((c) => c.title === "Early Exit Repayment")?.page).toBe(3);
  });
  it("grounds the 'leave before three years' demo answer with a source", () => {
    const ans = demoAnswer(segments, "What happens if I leave before three years?");
    expect(ans.mode).toBe("demo");
    expect(ans.sources[0].page).toBe(3);
  });
});

describe("document parsing helpers", () => {
  it("splits very long blocks and keeps ids sequential", () => {
    const segs = toSegments([{ page: 1, text: ("Sentence one. ".repeat(900)).trim() }], 3000);
    expect(segs.length).toBeGreaterThan(3);
    expect(segs.map((s) => s.id)).toEqual(segs.map((_, i) => i));
  });
  it("packs docx paragraphs without page numbers", () => {
    const blocks = packParagraphs("a\n\nb\n\n" + "c".repeat(3000) + "\n\nd", 3500);
    expect(blocks.every((b) => b.page === null)).toBe(true);
  });
});

describe("phone validation", () => {
  it("accepts E.164 and rejects others", () => {
    expect(E164.test("+14155550123")).toBe(true);
    expect(E164.test("4155550123")).toBe(false);
    expect(E164.test("+0123456")).toBe(false);
  });
});
