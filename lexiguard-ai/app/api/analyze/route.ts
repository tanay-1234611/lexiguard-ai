import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { getContract, saveContract, toPublic } from "@/lib/storage";
import { isBedrockConfigured } from "@/lib/bedrock";
import { analyzeContract } from "@/lib/contract-analysis";
import { demoAnalysis } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({ id: z.string() });

export async function POST(req: Request) {
  try {
    const ownerId = getOrCreateSessionId();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError(400, "bad_request", "Missing contract id.");
    const rec = await getContract(parsed.data.id, ownerId);
    if (!rec) throw new AppError(404, "not_found", "Contract not found. It may have been deleted or the server restarted.");
    if (rec.status === "analyzing") throw new AppError(409, "busy", "This contract is already being analyzed.");

    if (rec.mode === "live" && !isBedrockConfigured()) {
      throw new AppError(503, "bedrock_not_configured", "AWS Bedrock is not configured. Set AWS_REGION and BEDROCK_MODEL_ID in .env.local (see README), or try the sample contract in demo mode.");
    }

    rec.status = "analyzing";
    rec.error = undefined;
    await saveContract(rec);
    try {
      rec.analysis = rec.mode === "demo" ? demoAnalysis(rec.segments) : await analyzeContract(rec.segments, rec.fileName);
      rec.status = "analyzed";
    } catch (e) {
      rec.status = "error";
      rec.error = e instanceof AppError ? e.message : "Analysis failed.";
      await saveContract(rec);
      throw e;
    }
    await saveContract(rec);
    return NextResponse.json({ contract: toPublic(rec) });
  } catch (e) {
    return errorResponse(e);
  }
}
