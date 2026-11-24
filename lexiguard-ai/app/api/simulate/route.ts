import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { getContract } from "@/lib/storage";
import { isBedrockConfigured } from "@/lib/bedrock";
import { simulateClause } from "@/lib/contract-analysis";
import { demoSimulation } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  id: z.string(),
  clauseId: z.string(),
  proposedText: z.string().max(3000).optional(),
});

export async function POST(req: Request) {
  try {
    const ownerId = getOrCreateSessionId();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError(400, "bad_request", "Provide a contract id and clause id.");
    const rec = await getContract(parsed.data.id, ownerId);
    if (!rec?.analysis) throw new AppError(404, "not_found", "Analyzed contract not found.");
    const clause = rec.analysis.clauses.find((c) => c.id === parsed.data.clauseId);
    if (!clause) throw new AppError(404, "clause_not_found", "That clause was not found.");

    if (rec.mode === "demo") return NextResponse.json({ simulation: demoSimulation(clause, parsed.data.proposedText) });
    if (!isBedrockConfigured()) throw new AppError(503, "bedrock_not_configured", "AWS Bedrock is not configured. See the README.");
    return NextResponse.json({ simulation: await simulateClause(clause, parsed.data.proposedText) });
  } catch (e) {
    return errorResponse(e);
  }
}
