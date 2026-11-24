import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { saveContract, toPublic } from "@/lib/storage";
import { parseDocument } from "@/lib/document-parser";
import { validateFile } from "@/lib/validation";
import { createSampleRecord } from "@/lib/demo";
import type { ContractRecord } from "@/types/contract";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ownerId = getOrCreateSessionId();

    // JSON body {sample: true, demo?: boolean} loads the built-in FICTIONAL sample contract.
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (!body?.sample) throw new AppError(400, "bad_request", "Send a file, or {\"sample\": true}.");
      const rec = createSampleRecord(ownerId, Boolean(body.demo));
      await saveContract(rec);
      return NextResponse.json({ contract: toPublic(rec) });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError(400, "bad_request", "Could not read the upload. Send the file as multipart form data.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "bad_request", "No file was uploaded.");
    const problem = validateFile(file.name, file.type, file.size);
    if (problem) throw new AppError(400, "invalid_file", problem);

    const { segments, pageCount, fileType } = await parseDocument(Buffer.from(await file.arrayBuffer()), file.name);
    const rec: ContractRecord = {
      id: crypto.randomUUID(),
      ownerId,
      fileName: file.name.slice(0, 200),
      fileType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
      mode: "live",
      pageCount,
      charCount: segments.reduce((n, s) => n + s.text.length, 0),
      segments,
    };
    await saveContract(rec); // original file bytes are never stored, only extracted text
    return NextResponse.json({ contract: toPublic(rec) });
  } catch (e) {
    return errorResponse(e);
  }
}
