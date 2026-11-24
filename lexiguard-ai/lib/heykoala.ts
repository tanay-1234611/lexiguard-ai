/**
 * HeyKoala Voice API client.
 *
 * Only endpoints documented at https://voice.heykoala.ai/docs are used:
 *   GET  {base}/                    what the API key can do          (getting-started)
 *   POST {base}/contacts/           create a contact                 (placing-a-call)
 *   POST {base}/calls/dispatch/     place an outbound AI voice call  (placing-a-call)
 * Auth: "Authorization: Bearer hk_api_..."  Server-side only.
 *
 * The documented API places phone calls. It does not stream audio to a browser,
 * so the in-browser microphone feature in this app does NOT use HeyKoala.
 */
import { AppError } from "./errors";
import type { Analysis, ContractRecord } from "@/types/contract";

const DEFAULT_BASE = "https://dvoice.heykoala.ai/api/v1/ext";

export const isHeyKoalaConfigured = () => Boolean(process.env.HEYKOALA_API_KEY);
const base = () => (process.env.HEYKOALA_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");

type Envelope<T> = { status: boolean; message?: string; data: T | null; error?: unknown };
type HkResult<T> = { ok: boolean; http: number; body: Envelope<T> | null };

async function hk<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<HkResult<T>> {
  const key = process.env.HEYKOALA_API_KEY;
  if (!key) throw new AppError(503, "heykoala_not_configured", "HeyKoala is not configured. Set HEYKOALA_API_KEY (see README).");
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new AppError(504, "heykoala_unreachable", "Could not reach the HeyKoala API (network error or timeout).");
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }
  if (res.status === 401) {
    throw new AppError(401, "heykoala_unauthorized", "HeyKoala rejected the API key (401). Check HEYKOALA_API_KEY, that API access is enabled for your organization, and that the key matches HEYKOALA_BASE_URL (development vs production).");
  }
  if (res.status === 429) {
    throw new AppError(429, "heykoala_limited", "HeyKoala returned 429: your organization may be out of call credits or rate limited.");
  }
  return { ok: res.ok && body?.status !== false, http: res.status, body };
}

function describe(body: Envelope<unknown> | null, fallback: string): string {
  if (!body) return fallback;
  const errs = (body.error as { errors?: Record<string, string[]> } | null)?.errors;
  const detail = errs ? Object.entries(errs).map(([k, v]) => `${k}: ${v.join(" ")}`).join("; ") : "";
  return [body.message, detail].filter(Boolean).join(" ") || fallback;
}

export async function getCapabilities() {
  const r = await hk<{ organization?: string; resources?: { resource: string; granted: string }[] }>("/");
  if (!r.ok) throw new AppError(502, "heykoala_error", describe(r.body, "Could not read HeyKoala API capabilities."));
  return { organization: r.body?.data?.organization ?? null, resources: r.body?.data?.resources ?? [] };
}

export async function ensureContact(phone: string, name: string): Promise<{ created: boolean; note: string }> {
  const r = await hk("/contacts/", { method: "POST", body: { phone, name } });
  if (r.ok) return { created: true, note: "" };
  if (r.http === 403) {
    throw new AppError(403, "heykoala_scope", "This HeyKoala key lacks permission to create contacts. Grant 'contacts: write' (and 'calls: write') to the key.");
  }
  // The docs say an existing number returns a validation error. Continue; dispatch fails clearly if no contact exists.
  return { created: false, note: describe(r.body, "") };
}

export async function dispatchCall(phone: string, variables: Record<string, string>) {
  const body: Record<string, unknown> = { to_number: phone, variables };
  const opt: [string, string | undefined][] = [
    ["agent_id", process.env.HEYKOALA_AGENT_ID],
    ["from_number", process.env.HEYKOALA_FROM_NUMBER],
    ["knowledge_base_id", process.env.HEYKOALA_KNOWLEDGE_BASE_ID],
    ["call_flow_id", process.env.HEYKOALA_CALL_FLOW_ID],
    ["event_webhook_url", process.env.HEYKOALA_EVENT_WEBHOOK_URL],
  ];
  for (const [k, v] of opt) if (v) body[k] = v;

  const r = await hk<{ call_id: string; status: string; provider?: string; dispatched: boolean; message: string }>("/calls/dispatch/", { method: "POST", body });
  if (r.http === 403) {
    throw new AppError(403, "heykoala_scope", "This HeyKoala key lacks permission to place calls. Grant 'calls: write' to the key.");
  }
  if (!r.ok || !r.body?.data) throw new AppError(502, "heykoala_dispatch_failed", describe(r.body, "HeyKoala could not place the call."));
  const d = r.body.data;
  return { callId: d.call_id, status: d.status, dispatched: d.dispatched, message: d.message };
}

/**
 * A short, bounded summary passed to the agent as call `variables`.
 * The full contract text is never sent to HeyKoala.
 */
export function buildVoiceBrief(contract: ContractRecord, analysis: Analysis): Record<string, string> {
  const findings = analysis.clauses
    .filter((c) => c.kind === "risk")
    .slice(0, 5)
    .map((c) => `${c.title} (${c.severity}${c.page ? `, page ${c.page}` : ""}): ${c.explanation.slice(0, 200)}`)
    .join(" | ");
  return {
    contract_name: contract.fileName.slice(0, 120),
    contract_type: analysis.contractType,
    contract_risk: `${analysis.overallRisk} (${analysis.riskScore}/100)`,
    contract_brief: `${analysis.summary.slice(0, 700)} Key findings: ${findings}`.slice(0, 1800),
  };
}
