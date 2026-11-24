"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button, Card, LinkButton, Notice, SeverityBadge, Spinner, ModeBadge } from "@/components/ui";
import { SetupStatus } from "./SetupStatus";
import { api } from "@/lib/client";
import type { ContractSummary, Severity } from "@/types/contract";

const STATUS_LABEL = { uploaded: "Ready to analyze", analyzing: "Analyzing", analyzed: "Analyzed", error: "Analysis failed" } as const;

export function Dashboard() {
  const [items, setItems] = useState<ContractSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ contracts: ContractSummary[] }>("/api/contracts").then((r) => setItems(r.contracts)).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this contract and its analysis from the server?")) return;
    try {
      await api(`/api/contracts/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const counts: Record<Severity, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  items?.forEach((c) => c.overallRisk && counts[c.overallRisk]++);
  const analyzed = items?.filter((c) => c.status === "analyzed") ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-ink-soft">Your contracts for this browser session.</p>
        </div>
        <LinkButton href="/upload"><Upload className="h-4 w-4" aria-hidden />Upload new contract</LinkButton>
      </div>

      {error && <Notice tone="error" className="mt-6">{error}</Notice>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="font-semibold">Recent contracts</h2>
          {!items && !error && <div className="mt-4"><Spinner label="Loading contracts" /></div>}
          {items && items.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-line p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-ink-faint" aria-hidden />
              <p className="mt-3 font-medium">No contracts yet</p>
              <p className="mt-1 text-sm text-ink-soft">Upload a PDF or Word contract, or load the fictional sample to see how it works.</p>
              <div className="mt-4 flex justify-center gap-2">
                <LinkButton href="/upload">Upload a contract</LinkButton>
                <LinkButton href="/upload?sample=1" variant="secondary">Try the sample</LinkButton>
              </div>
            </div>
          )}
          <ul className="mt-4 divide-y divide-line">
            {items?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/contracts/${c.id}`} className="block truncate font-medium hover:text-brand">{c.fileName}</Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span>{STATUS_LABEL[c.status]}</span>
                    {c.contractType && <span>{c.contractType}</span>}
                    {c.findingsCount !== undefined && <span>{c.findingsCount} risky clauses</span>}
                    {c.mode === "demo" && <ModeBadge mode="demo" />}
                  </p>
                </div>
                {c.overallRisk && <SeverityBadge severity={c.overallRisk} />}
                <Link href={`/contracts/${c.id}`} className="text-sm font-medium text-brand hover:underline">{c.status === "analyzed" ? "Open" : "Continue"}</Link>
                <Button variant="ghost" aria-label={`Delete ${c.fileName}`} onClick={() => remove(c.id)} className="px-2"><Trash2 className="h-4 w-4" aria-hidden /></Button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Risk overview</h2>
            {analyzed.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Analyzed contracts will show up here.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(Object.keys(counts) as Severity[]).map((s) => (
                  <li key={s} className="flex items-center justify-between"><SeverityBadge severity={s} /><span className="font-medium">{counts[s]}</span></li>
                ))}
              </ul>
            )}
            {analyzed[0] && <Link href={`/contracts/${analyzed[0].id}?tab=ask`} className="mt-4 block text-sm font-medium text-brand hover:underline">Ask the assistant about {analyzed[0].fileName}</Link>}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Setup</h2>
            <SetupStatus />
          </Card>
        </div>
      </div>
    </div>
  );
}
