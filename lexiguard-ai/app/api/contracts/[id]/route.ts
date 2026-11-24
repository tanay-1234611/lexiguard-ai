import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { getOrCreateSessionId } from "@/lib/session";
import { deleteContract, getContract, toPublic } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rec = await getContract(params.id, getOrCreateSessionId());
    if (!rec) throw new AppError(404, "not_found", "Contract not found. It may have been deleted, or the server may have restarted (contracts are kept in memory by default).");
    return NextResponse.json({ contract: toPublic(rec) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ok = await deleteContract(params.id, getOrCreateSessionId());
    if (!ok) throw new AppError(404, "not_found", "Contract not found.");
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}
