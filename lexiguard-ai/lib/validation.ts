import type { z } from "zod";
import type { Segment } from "@/types/contract";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 200;

const ALLOWED: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/** Returns an error message, or null if the file looks acceptable. */
export function validateFile(name: string, type: string, size: number): string | null {
  const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  if (!(ext in ALLOWED)) return "Unsupported file type. Upload a PDF or DOCX file.";
  if (type && !ALLOWED[ext].includes(type) && type !== "application/octet-stream") {
    return "The file type does not match its extension. Upload a real PDF or DOCX file.";
  }
  if (size === 0) return "The file is empty.";
  if (size > MAX_FILE_BYTES) return `File is too large. The maximum size is ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  return null;
}

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export type QuoteMatch = { verified: boolean; segmentId: number | null; page: number | null };

/**
 * Checks that a quotation really exists in the extracted document and returns where.
 * This is what stops invented quotes and page numbers from reaching the UI.
 * Quotes containing "..." are verified piece by piece, in order.
 */
export function verifyQuote(quote: string, segments: Segment[]): QuoteMatch {
  const miss: QuoteMatch = { verified: false, segmentId: null, page: null };
  const cleaned = normalize(quote.replace(/\[\[S\d+[^\]]*\]\]/g, " ")).replace(/^[\s"'.…]+|[\s"'.…]+$/g, "");
  const parts = cleaned
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 12);
  if (parts.length === 0) return miss;

  const norms = segments.map((s) => normalize(s.text));
  const find = (part: string, from: number): number => {
    for (let i = from; i < norms.length; i++) {
      if (norms[i].includes(part)) return i;
      if (i + 1 < norms.length) {
        const joined = norms[i] + " " + norms[i + 1];
        const at = joined.indexOf(part);
        if (at !== -1 && at < norms[i].length) return i;
      }
    }
    return -1;
  };

  const first = find(parts[0], 0);
  if (first === -1) return miss;
  for (let p = 1; p < parts.length; p++) {
    if (find(parts[p], first) === -1) return miss;
  }
  return { verified: true, segmentId: segments[first].id, page: segments[first].page };
}

/** Pulls a JSON object out of model output (handles ```json fences and stray prose). */
export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in the model response.");
  return JSON.parse(stripped.slice(start, end + 1));
}

export function parseModelJson<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, text: string): T {
  const result = schema.safeParse(extractJson(text));
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Model JSON failed validation at "${issue.path.join(".")}": ${issue.message}`);
  }
  return result.data;
}

export const E164 = /^\+[1-9]\d{6,14}$/;
