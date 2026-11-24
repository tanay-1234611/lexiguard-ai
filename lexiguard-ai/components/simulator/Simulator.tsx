"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Card, ModeBadge, Notice, SeverityBadge } from "@/components/ui";
import { api } from "@/lib/client";
import type { Analysis, Simulation } from "@/types/contract";

export function Simulator({ contractId, analysis, initialClauseId }: { contractId: string; analysis: Analysis; initialClauseId?: string }) {
  const [clauseId, setClauseId] = useState(initialClauseId ?? analysis.clauses.find((c) => c.kind === "risk")?.id ?? analysis.clauses[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);

  useEffect(() => { if (initialClauseId) { setClauseId(initialClauseId); setSim(null); } }, [initialClauseId]);

  const clause = analysis.clauses.find((c) => c.id === clauseId);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ simulation: Simulation }>("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contractId, clauseId, proposedText: custom.trim() || undefined }),
      });
      setSim(r.simulation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (analysis.clauses.length === 0) return <Card><p className="text-sm text-ink-soft">No clauses were found to compare.</p></Card>;

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="font-display text-2xl font-semibold">Contract risk simulator</h2>
        <p className="mt-1 text-sm text-ink-soft">Pick a clause, then see alternative wording you could raise with the other party.</p>
        <Notice tone="warn" className="mt-4">Suggested wording is a discussion starting point. It is not guaranteed to be legally valid, enforceable, or acceptable to the other party. Have a lawyer review any change.</Notice>
        <label htmlFor="clause" className="mt-4 block text-sm font-medium">Clause</label>
        <select id="clause" value={clauseId} onChange={(e) => { setClauseId(e.target.value); setSim(null); }} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
          {analysis.clauses.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.severity})</option>)}
        </select>
        <label htmlFor="custom" className="mt-4 block text-sm font-medium">Your own wording (optional)</label>
        <textarea id="custom" value={custom} onChange={(e) => setCustom(e.target.value)} rows={3} maxLength={3000} placeholder="Leave empty to get a suggested alternative, or paste wording you want assessed." className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-faint" />
        <Button className="mt-3" onClick={run} loading={busy} disabled={!clause}>{custom.trim() ? "Assess my wording" : "Suggest alternative wording"}</Button>
        {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      </Card>

      {sim && clause && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between"><h3 className="font-semibold">Original clause</h3><SeverityBadge severity={sim.originalRisk} /></div>
              <p className="mt-3 whitespace-pre-wrap rounded-lg border-l-4 border-line bg-paper p-3 font-display text-[15px] leading-relaxed">{sim.originalText}</p>
            </Card>
            <Card className="border-brand/40">
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{sim.userProposed ? "Your wording" : "Alternative wording"}</h3><SeverityBadge severity={sim.alternativeRisk} /></div>
              <p className="mt-3 whitespace-pre-wrap rounded-lg border-l-4 border-brand bg-brand-tint p-3 font-display text-[15px] leading-relaxed">{sim.alternativeText}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">Risk: {sim.originalRisk} <ArrowRight className="h-3 w-3" aria-hidden /> {sim.alternativeRisk} (AI assessment)</p>
            </Card>
          </div>
          <Card>
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Assessment</h3><ModeBadge mode={sim.mode} /></div>
            <p className="mt-2 text-sm">{sim.assessment}</p>
            <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
              <List title="What changed" items={sim.whatChanged} />
              <List title="Potential benefits" items={sim.benefits} />
              <List title="Remaining concerns" items={sim.remainingConcerns} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-soft">{title}</p>
      {items.length === 0 ? <p className="mt-1 text-ink-faint">None listed</p> : <ul className="mt-1 list-disc space-y-1 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>}
    </div>
  );
}
