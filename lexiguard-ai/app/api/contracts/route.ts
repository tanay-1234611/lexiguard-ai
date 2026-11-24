import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { listContracts } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ contracts: await listContracts(getOrCreateSessionId()) });
  } catch (e) {
    return errorResponse(e);
  }
}
