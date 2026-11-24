import fs from "node:fs/promises";
import path from "node:path";
import type { ContractRecord, ContractSummary, PublicContract } from "@/types/contract";

const g = globalThis as unknown as { __lexiguard?: Map<string, ContractRecord> };
const mem: Map<string, ContractRecord> = (g.__lexiguard ??= new Map<string, ContractRecord>());

const persist = () => process.env.PERSIST_CONTRACTS === "true";
const dir = () => path.join(process.cwd(), ".data", "contracts");
const validId = (id: string) => /^[a-f0-9-]{36}$/.test(id);

export async function saveContract(r: ContractRecord): Promise<void> {
  mem.set(r.id, r);
  if (persist()) {
    await fs.mkdir(dir(), { recursive: true });
    await fs.writeFile(path.join(dir(), `${r.id}.json`), JSON.stringify(r));
  }
}

export async function getContract(id: string, ownerId: string): Promise<ContractRecord | null> {
  if (!validId(id)) return null;
  let rec = mem.get(id) ?? null;
  if (!rec && persist()) {
    try {
      rec = JSON.parse(await fs.readFile(path.join(dir(), `${id}.json`), "utf8")) as ContractRecord;
      mem.set(id, rec);
    } catch {
      rec = null;
    }
  }
  return rec && rec.ownerId === ownerId ? rec : null;
}

export async function listContracts(ownerId: string): Promise<ContractSummary[]> {
  if (persist()) {
    try {
      for (const f of await fs.readdir(dir())) {
        if (f.endsWith(".json")) await getContract(f.slice(0, -5), ownerId);
      }
    } catch {
      /* directory may not exist yet */
    }
  }
  return [...mem.values()]
    .filter((r) => r.ownerId === ownerId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(toSummary);
}

export async function deleteContract(id: string, ownerId: string): Promise<boolean> {
  const rec = await getContract(id, ownerId);
  if (!rec) return false;
  mem.delete(id);
  if (persist()) await fs.rm(path.join(dir(), `${id}.json`), { force: true });
  return true;
}

export function toPublic(r: ContractRecord): PublicContract {
  const { ownerId: _ownerId, ...rest } = r;
  void _ownerId;
  return rest;
}

export function toSummary(r: ContractRecord): ContractSummary {
  const { segments: _s, analysis, ownerId: _o, ...rest } = r;
  void _s;
  void _o;
  return {
    ...rest,
    contractType: analysis?.contractType,
    overallRisk: analysis?.overallRisk,
    riskScore: analysis?.riskScore,
    findingsCount: analysis?.clauses.filter((c) => c.kind === "risk").length,
  };
}
