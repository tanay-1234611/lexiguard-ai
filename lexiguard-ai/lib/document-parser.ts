import { AppError } from "./errors";
import { MAX_PAGES } from "./validation";
import type { Segment } from "@/types/contract";

const MAX_SEGMENT = 6000;
const DOCX_SEGMENT = 3500;

type Block = { page: number | null; text: string };

function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max * 0.4) cut = rest.lastIndexOf(". ", max) + 1;
    if (cut < max * 0.4) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function toSegments(blocks: Block[], max = MAX_SEGMENT): Segment[] {
  const segs: Segment[] = [];
  for (const b of blocks) {
    const text = b.text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) continue;
    for (const piece of splitLong(text, max)) segs.push({ id: segs.length, page: b.page, text: piece });
  }
  return segs;
}

export function packParagraphs(text: string, max = DOCX_SEGMENT): Block[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const blocks: Block[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length > max) {
      blocks.push({ page: null, text: cur });
      cur = "";
    }
    cur += (cur ? "\n\n" : "") + p;
  }
  if (cur) blocks.push({ page: null, text: cur });
  return blocks;
}

function assertReadable(segments: Segment[], pageCount: number | null) {
  const chars = segments.reduce((n, s) => n + s.text.replace(/\s/g, "").length, 0);
  if (chars < 150) {
    if (pageCount && pageCount > 0) {
      throw new AppError(
        422,
        "no_text",
        "No readable text was found. This looks like a scanned PDF (images of pages), which needs OCR first. Export a text-based PDF or upload a DOCX instead."
      );
    }
    throw new AppError(422, "too_short", "The document contains almost no text, so there is nothing meaningful to analyze.");
  }
}

export async function parseDocument(
  buf: Buffer,
  fileName: string
): Promise<{ segments: Segment[]; pageCount: number | null; fileType: "pdf" | "docx" }> {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new AppError(400, "invalid_file", "This file is not a valid PDF.");
    }
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      if (totalPages > MAX_PAGES) {
        throw new AppError(413, "too_long", `This PDF has ${totalPages} pages. The demo limit is ${MAX_PAGES} pages; split the document and upload the parts separately.`);
      }
      const pages = Array.isArray(text) ? text : [text];
      const segments = toSegments(pages.map((t, i) => ({ page: i + 1, text: t })));
      assertReadable(segments, totalPages);
      return { segments, pageCount: totalPages, fileType: "pdf" };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(422, "pdf_parse_failed", "The PDF could not be read. It may be corrupted or password-protected.");
    }
  }

  if (buf.subarray(0, 2).toString("latin1") !== "PK") {
    throw new AppError(400, "invalid_file", "This file is not a valid DOCX document.");
  }
  try {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const segments = toSegments(packParagraphs(value));
    assertReadable(segments, null);
    // DOCX has no fixed pages, so findings reference sections instead of page numbers.
    return { segments, pageCount: null, fileType: "docx" };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(422, "docx_parse_failed", "The DOCX file could not be read. It may be corrupted or password-protected.");
  }
}
