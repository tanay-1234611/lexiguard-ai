"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Card, Disclaimer, ModeBadge, Notice, RiskMeter, Spinner } from "@/components/ui";
import { FindingCard } from "./FindingCard";
import { DocumentViewer, type Focus } from "./DocumentViewer";
import { DatesObligations } from "./DatesObligations";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useChat } from "@/components/chat/useChat";
import { Simulator } from "@/components/simulator/Simulator";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { Clause, PublicContract } from "@/types/contract";

const TABS = [
  ["overview", "Overview"],
  ["dates", "Dates and obligations"],
  ["ask", "Ask LexiGuard"],
  ["simulator", "Risk simulator"],
  ["voice", "Voice"],
  ["document", "Document"],
] as const;
type Tab = (typeof TABS)[number][0];

export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const initialTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.some(([k]) => k === initialTab) ? (initialTab as Tab) : "overview");
  const [focus, setFocus] = useState<Focus>(null);
  const [prefill, setPrefill] = useState<string>();
  const [simClause, setSimClause] = useState<string>();
  const chat = useChat(id);

  useEffect(() => {
    api<{ contract: PublicContract }>(`/api/contracts/${id}`).then((r) => setContract(r.contract)).catch((e: Error) => setError(e.message));
  }, [id]);

  const jump = useCallback((segmentId: number, quote: string) => {
    setFocus((f) => ({ segmentId, quote, n: (f?.n ?? 0) + 1 }));
    if (window.matchMedia("(max-width: 1023px)").matches) setTab("document");
  }, []);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await api<{ contract: PublicContract }>("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setContract(r.contract);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this contract and its analysis from the server? This can't be undone.")) return;
    try {
      await api(`/api/contracts/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!contract) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {error ? <Notice tone="error">{error}</Notice> : <Spinner label="Loading contract" />}
      </div>
    );
  }

  const a = contract.analysis;
  const risks = a?.clauses.filter((c) => c.kind === "risk") ?? [];
  const important = a?.clauses.filter((c) => c.kind === "important") ?? [];

  const showSource = (c: Clause) => c.segmentId !== null && jump(c.segmentId, c.originalText);
  const askAbout = (c: Clause) => { setPrefill(`Explain the "${c.title}" clause and what it means for me.`); setTab("ask"); };
  const compare = (c: Clause) => { setSimClause(c.id); setTab("simulator"); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-semibold">{contract.fileName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {contract.pageCount ? `${contract.pageCount} pages` : "Word document"}
            <ModeBadge mode={a?.mode ?? contract.mode} />
          </p>
        </div>
        <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" aria-hidden />Delete contract</Button>
      </div>

      {a?.mode === "demo" && (
        <Notice tone="warn" className="mt-4"><strong>Demo mode.</strong> Everything below is pre-written for a fictional sample contract. No AI model was called.</Notice>
      )}
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}

      {!a ? (
        <Card className="mt-6">
          <h2 className="font-semibold">{contract.status === "error" ? "The last analysis failed" : "This contract hasn't been analyzed yet"}</h2>
          {contract.error && <p className="mt-1 text-sm text-red-800">{contract.error}</p>}
          <p className="mt-1 text-sm text-ink-soft">{contract.charCount.toLocaleString()} characters extracted.</p>
          <Button className="mt-4" onClick={analyze} loading={analyzing}>{analyzing ? "Analyzing… this can take a minute or two" : "Analyze contract"}</Button>
        </Card>
      ) : (
        <>
          <div role="tablist" aria-label="Contract sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium -mb-px", k === "document" && "lg:hidden", tab === k ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink")}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              {tab === "overview" && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_1.6fr]">
                    <Card>
                      <h2 className="text-sm font-medium text-ink-soft">Overall risk</h2>
                      <div className="mt-3"><RiskMeter score={a.riskScore} level={a.overallRisk} /></div>
                      <p className="mt-4 text-sm"><span className="text-ink-soft">Contract type:</span> <strong>{a.contractType}</strong></p>
                      <p className="mt-1 text-xs text-ink-faint">A rough guide based on the findings, not a legal verdict.</p>
                    </Card>
                    <Card>
                      <h2 className="font-display text-2xl font-semibold">Summary</h2>
                      <p className="mt-2 text-[15px] leading-relaxed">{a.summary}</p>
                    </Card>
                  </div>

                  {a.droppedUnverified > 0 && (
                    <Notice tone="info">{a.droppedUnverified} AI finding{a.droppedUnverified === 1 ? " was" : "s were"} left out because the quoted text couldn&apos;t be found in your document. Only findings with a verified source are shown.</Notice>
                  )}

                  <section aria-labelledby="risky">
                    <h2 id="risky" className="font-display text-2xl font-semibold">Potentially risky clauses <span className="text-base font-normal text-ink-soft">({risks.length})</span></h2>
                    <div className="mt-3 space-y-3">
                      {risks.length === 0 && <Card><p className="text-sm text-ink-soft">No potentially risky clauses were identified. That doesn&apos;t mean there are none; the analysis can miss things.</p></Card>}
                      {risks.map((c, i) => <FindingCard key={c.id} clause={c} defaultOpen={i === 0} onShow={showSource} onAsk={askAbout} onCompare={compare} />)}
                    </div>
                  </section>

                  {important.length > 0 && (
                    <section aria-labelledby="imp">
                      <h2 id="imp" className="font-display text-2xl font-semibold">Important clauses <span className="text-base font-normal text-ink-soft">({important.length})</span></h2>
                      <div className="mt-3 space-y-3">{important.map((c) => <FindingCard key={c.id} clause={c} onShow={showSource} onAsk={askAbout} onCompare={compare} />)}</div>
                    </section>
                  )}

                  {a.questionsBeforeSigning.length > 0 && (
                    <Card>
                      <h2 className="font-display text-2xl font-semibold">Questions to ask before signing</h2>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{a.questionsBeforeSigning.map((q) => <li key={q}>{q}</li>)}</ul>
                    </Card>
                  )}
                  <p className="text-xs text-ink-faint">{a.mode === "live" ? `Analyzed in ${a.chunksAnalyzed} section${a.chunksAnalyzed === 1 ? "" : "s"} with ${a.modelId}.` : "Pre-written demo analysis."} {a.disclaimer}</p>
                </div>
              )}

              {tab === "dates" && <DatesObligations analysis={a} onJump={jump} />}
              {tab === "ask" && <ChatPanel chat={chat} prefill={prefill} onJump={jump} />}
              {tab === "simulator" && <Simulator contractId={id} analysis={a} initialClauseId={simClause} />}
              {tab === "voice" && <VoicePanel contractId={id} chat={chat} canCall={Boolean(a)} demo={a.mode === "demo"} />}
              {tab === "document" && <DocumentViewer segments={contract.segments} focus={focus} className="lg:hidden" idPrefix="m-" />}
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-20"><DocumentViewer segments={contract.segments} focus={focus} /></div>
            </aside>
          </div>
        </>
      )}

      <Disclaimer className="mt-8" />
    </div>
  );
}
