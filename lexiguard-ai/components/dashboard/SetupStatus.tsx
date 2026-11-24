"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { api } from "@/lib/client";

type Status = {
  bedrock: { configured: boolean; region: string | null; modelId: string | null };
  heykoala: { configured: boolean };
  persistence: "memory" | "disk";
};

export function SetupStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    api<Status>("/api/status").then(setS).catch(() => setS(null));
  }, []);
  if (!s) return null;
  const Row = ({ ok, label, detail }: { ok: boolean; label: string; detail: string }) => (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden /> : <CircleDashed className="mt-0.5 h-4 w-4 text-ink-faint" aria-hidden />}
      <span><span className="font-medium">{label}.</span> <span className="text-ink-soft">{detail}</span></span>
    </li>
  );
  return (
    <ul className="space-y-2 text-sm" aria-label="Service configuration">
      <Row ok={s.bedrock.configured} label="AWS Bedrock" detail={s.bedrock.configured ? `Settings found (${s.bedrock.region}, ${s.bedrock.modelId}). Credentials are checked on first use.` : "Not configured. Uploads can't be analyzed live; the fictional sample works in demo mode."} />
      <Row ok={s.heykoala.configured} label="HeyKoala" detail={s.heykoala.configured ? "API key found. Voice calls are available after analysis." : "Not configured. Phone calls are unavailable; browser voice still works."} />
      <Row ok={s.persistence === "disk"} label="Storage" detail={s.persistence === "disk" ? "Saved to local disk (.data/)." : "Memory only. Contracts disappear when the server restarts."} />
    </ul>
  );
}
