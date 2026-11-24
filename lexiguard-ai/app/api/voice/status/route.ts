import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getCapabilities, isHeyKoalaConfigured } from "@/lib/heykoala";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/voice/status?check=1 asks HeyKoala what the configured API key can do. */
export async function GET(req: Request) {
  try {
    if (!isHeyKoalaConfigured()) return NextResponse.json({ configured: false, verified: false });
    if (new URL(req.url).searchParams.get("check") !== "1") return NextResponse.json({ configured: true, verified: false });
    const caps = await getCapabilities();
    const grant = (name: string) => caps.resources.find((r) => r.resource === name)?.granted ?? "none";
    return NextResponse.json({
      configured: true,
      verified: true,
      organization: caps.organization,
      scopes: { calls: grant("calls"), contacts: grant("contacts") },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
