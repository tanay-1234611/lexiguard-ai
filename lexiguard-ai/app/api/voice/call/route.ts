import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { getContract } from "@/lib/storage";
import { buildVoiceBrief, dispatchCall, ensureContact, isHeyKoalaConfigured } from "@/lib/heykoala";
import { E164 } from "@/lib/validation";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(E164, "Enter the phone number in international format, e.g. +14155550123."),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm consent before a call is placed." }) }),
});

/**
 * POST /api/voice/call
 * Uses HeyKoala's documented flow: create a contact, then dispatch an outbound call.
 * A short contract brief goes along as call `variables`. The full contract text is never sent.
 */
export async function POST(req: Request) {
  try {
    const ownerId = getOrCreateSessionId();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError(400, "bad_request", parsed.error.issues[0]?.message ?? "Invalid request.");
    if (!isHeyKoalaConfigured()) {
      throw new AppError(503, "heykoala_not_configured", "HeyKoala is not configured. Set HEYKOALA_API_KEY in .env.local (see README).");
    }
    const rec = await getContract(parsed.data.id, ownerId);
    if (!rec?.analysis) throw new AppError(409, "not_analyzed", "Analyze the contract before requesting a voice call.");
    if (rec.mode === "demo") {
      throw new AppError(409, "demo_mode", "Voice calls are disabled for demo data. Upload a real contract, or load the sample with live analysis, to try this.");
    }

    await ensureContact(parsed.data.phone, parsed.data.name);
    const result = await dispatchCall(parsed.data.phone, buildVoiceBrief(rec, rec.analysis));
    return NextResponse.json({ call: result });
  } catch (e) {
    return errorResponse(e);
  }
}
