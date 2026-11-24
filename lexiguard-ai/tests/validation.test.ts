import { describe, expect, it } from "vitest";
import { extractJson, parseModelJson, validateFile, verifyQuote } from "@/lib/validation";
import { ChunkResultSchema, type Segment } from "@/types/contract";

const segs: Segment[] = [
  { id: 0, page: 1, text: "1. Term. The Employee agrees to remain employed for three (3) years." },
  { id: 1, page: 2, text: 'The Employee must repay USD 18,000 within fifteen (15) days.\n\nThe company   may deduct it from pay.' },
];

describe("validateFile", () => {
  it("accepts pdf and docx", () => {
    expect(validateFile("a.pdf", "application/pdf", 100)).toBeNull();
    expect(validateFile("a.DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 100)).toBeNull();
  });
  it("rejects unsupported, empty and oversized files", () => {
    expect(validateFile("a.exe", "", 100)).toMatch(/Unsupported/);
    expect(validateFile("a.pdf", "application/pdf", 0)).toMatch(/empty/);
    expect(validateFile("a.pdf", "application/pdf", 11 * 1024 * 1024)).toMatch(/too large/);
    expect(validateFile("a.pdf", "text/html", 10)).toMatch(/does not match/);
  });
});

describe("verifyQuote", () => {
  it("finds exact quotes and returns the real page", () => {
    expect(verifyQuote("must repay USD 18,000 within fifteen (15) days", segs)).toEqual({ verified: true, segmentId: 1, page: 2 });
  });
  it("ignores whitespace and case differences", () => {
    expect(verifyQuote("THE COMPANY MAY DEDUCT IT FROM PAY", segs).page).toBe(2);
  });
  it("supports ellipses between real fragments", () => {
    expect(verifyQuote("The Employee agrees ... three (3) years", segs).verified).toBe(true);
  });
  it("rejects invented text", () => {
    expect(verifyQuote("The Employee must repay USD 99,000 immediately", segs).verified).toBe(false);
    expect(verifyQuote("short", segs).verified).toBe(false);
  });
});

describe("model JSON handling", () => {
  it("extracts JSON from fenced output", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
  it("applies schema defaults and rejects bad severities", () => {
    const ok = parseModelJson(ChunkResultSchema, '{"clauses":[{"title":"T","severity":"High","originalText":"x"}]}');
    expect(ok.clauses[0].kind).toBe("risk");
    expect(ok.obligations).toEqual([]);
    expect(() => parseModelJson(ChunkResultSchema, '{"clauses":[{"title":"T","severity":"Huge","originalText":"x"}]}')).toThrow(/validation/);
  });
});
