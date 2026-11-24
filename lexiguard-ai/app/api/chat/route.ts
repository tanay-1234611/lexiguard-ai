import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { getContract } from "@/lib/storage";
import { isBedrockConfigured } from "@/lib/bedrock";
import { answerQuestion } from "@/lib/contract-analysis";
import { demoAnswer } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  id: z.string(),
  question: z.string().trim().min(2).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
});

export async function POST(req: Request) {
  try {
    const ownerId = getOrCreateSessionId();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError(400, "bad_request", "Provide a contract id and a question (2-1000 characters).");
    const rec = await getContract(parsed.data.id, ownerId);
    if (!rec) throw new AppError(404, "not_found", "Contract not found.");

    if (rec.mode === "demo") {
      return NextResponse.json({ answer: demoAnswer(rec.segments, parsed.data.question) });
    }
    if (!isBedrockConfigured()) {
      throw new AppError(503, "bedrock_not_configured", "AWS Bedrock is not configured, so questions cannot be answered. See the README.");
    }
    const answer = await answerQuestion(rec.segments, parsed.data.question, parsed.data.history);
    return NextResponse.json({ answer });
  } catch (e) {
    return errorResponse(e);
  }
}
