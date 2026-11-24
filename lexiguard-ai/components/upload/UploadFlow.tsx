"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, FlaskConical } from "lucide-react";
import { Button, Card, Disclaimer, Notice } from "@/components/ui";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { PublicContract } from "@/types/contract";

const MAX = 10 * 1024 * 1024;

function uploadWithProgress(file: File, onProgress: (n: number) => void): Promise<PublicContract> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.ontimeout = () => reject(new Error("The upload timed out."));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json.contract);
        else reject(new Error(json?.error?.message ?? `Upload failed (${xhr.status}).`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.send(form);
  });
}

export function UploadFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [bedrockReady, setBedrockReady] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ bedrock: { configured: boolean } }>("/api/status").then((s) => setBedrockReady(s.bedrock.configured)).catch(() => setBedrockReady(false));
  }, []);

  const loadSample = useCallback(async (demo: boolean) => {
    setError(null);
    try {
      const r = await api<{ contract: PublicContract }>("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sample: true, demo }) });
      setContract(r.contract);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (params.get("sample") === "1" && bedrockReady !== null && !contract) loadSample(!bedrockReady);
  }, [params, bedrockReady, contract, loadSample]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setContract(null);
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") return setError("Unsupported file type. Upload a PDF or DOCX file.");
    if (file.size === 0) return setError("That file is empty.");
    if (file.size > MAX) return setError("File is too large. The maximum size is 10 MB.");
    setProgress(0);
    try {
      setContract(await uploadWithProgress(file, setProgress));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function analyze() {
    if (!contract) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: contract.id }) });
      router.push(`/contracts/${contract.id}`);
    } catch (e) {
      setError((e as Error).message);
      setAnalyzing(false);
    }
  }

  const preview = contract?.segments.slice(0, 2).map((s) => s.text).join("\n\n").slice(0, 1800);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Upload a contract</h1>
      <p className="mt-1 text-ink-soft">PDF or Word (.docx), up to 10 MB. Scanned images of pages can&apos;t be read.</p>

      {!contract && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          className={cn("mt-6 rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-colors", drag ? "border-brand bg-brand-tint" : "border-line")}
        >
          <FileUp className="mx-auto h-9 w-9 text-brand" aria-hidden />
          <p className="mt-3 font-medium">Drag and drop your contract here</p>
          <p className="text-sm text-ink-soft">or</p>
          <Button className="mt-3" onClick={() => input.current?.click()} loading={progress !== null}>Choose a file</Button>
          <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" aria-label="Contract file" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
          {progress !== null && (
            <div className="mx-auto mt-4 max-w-xs" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 overflow-hidden rounded-full bg-paper"><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-xs text-ink-soft">{progress < 100 ? `Uploading ${progress}%` : "Extracting text…"}</p>
            </div>
          )}
          <div className="mt-6 border-t border-line pt-4 text-sm">
            <p className="text-ink-soft">No contract handy?</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => loadSample(!bedrockReady)}><FlaskConical className="h-4 w-4" aria-hidden />Load the fictional sample{bedrockReady === false ? " (demo mode)" : ""}</Button>
              {bedrockReady && <Button variant="ghost" onClick={() => loadSample(true)}>Sample with pre-written demo analysis</Button>}
              <a className="inline-flex items-center px-2 text-brand hover:underline" href="/api/sample">Download sample text</a>
            </div>
          </div>
        </div>
      )}

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}

      {contract && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">{contract.fileName}</h2>
              <p className="text-sm text-ink-soft">
                {contract.pageCount ? `${contract.pageCount} pages` : "Word document"}, {contract.charCount.toLocaleString()} characters extracted
              </p>
            </div>
            {contract.mode === "demo" && <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">Demo mode: pre-written analysis</span>}
          </div>
          <p className="mt-4 text-sm font-medium">Extracted text preview</p>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-4 font-sans text-sm text-ink-soft">{preview}{contract.charCount > 1800 ? "\n…" : ""}</pre>
          <p className="mt-2 text-xs text-ink-faint">Check that the text looks right. If it is garbled or incomplete, the analysis will be too.</p>
          {contract.mode === "live" && <Notice className="mt-4">Analysis sends this document&apos;s text to AWS Bedrock. Long contracts are read in sections and can take a minute or two.</Notice>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={analyze} loading={analyzing}>{analyzing ? "Analyzing…" : "Analyze contract"}</Button>
            <Button variant="ghost" disabled={analyzing} onClick={() => { setContract(null); setError(null); }}>Choose a different file</Button>
          </div>
        </Card>
      )}

      <Disclaimer className="mt-6" />
    </div>
  );
}
