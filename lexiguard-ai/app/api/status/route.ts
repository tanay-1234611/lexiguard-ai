import { NextResponse } from "next/server";
import { bedrockConfig, isBedrockConfigured } from "@/lib/bedrock";
import { isHeyKoalaConfigured } from "@/lib/heykoala";

export const dynamic = "force-dynamic";

/** Configuration status only. Never returns secrets. "configured" does not guarantee the credentials work. */
export async function GET() {
  const b = bedrockConfig();
  return NextResponse.json({
    bedrock: { configured: isBedrockConfigured(), region: b.region || null, modelId: b.modelId || null },
    heykoala: { configured: isHeyKoalaConfigured() },
    persistence: process.env.PERSIST_CONTRACTS === "true" ? "disk" : "memory",
  });
}
