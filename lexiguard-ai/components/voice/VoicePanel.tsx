"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, PhoneCall, Square, Volume2 } from "lucide-react";
import { Button, Card, Notice } from "@/components/ui";
import { api } from "@/lib/client";
import type { ChatApi } from "@/components/chat/useChat";

type VState = "idle" | "listening" | "processing" | "speaking" | "error";
type VoiceStatus = { configured: boolean; verified: boolean; organization?: string | null; scopes?: { calls: string; contacts: string } };
type CallResult = { callId: string; status: string; dispatched: boolean; message: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
const LABEL: Record<VState, string> = {
  idle: "Ready. Press the microphone and ask a question.",
  listening: "Listening…",
  processing: "Reading the contract…",
  speaking: "Speaking the answer…",
  error: "Something went wrong.",
};

export function VoicePanel({ contractId, chat, canCall, demo }: { contractId: string; chat: ChatApi; canCall: boolean; demo: boolean }) {
  /* ---------- Browser voice (Web Speech API; not HeyKoala) ---------- */
  const [state, setState] = useState<VState>("idle");
  const [supported, setSupported] = useState(true);
  const [heard, setHeard] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const rec = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition) && "speechSynthesis" in window);
    return () => { rec.current?.abort?.(); window.speechSynthesis?.cancel(); };
  }, []);

  const speak = useCallback((text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    setState("speaking");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  function start() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    window.speechSynthesis.cancel();
    setVoiceError(null);
    setHeard("");
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onstart = () => setState("listening");
    r.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setHeard(t);
      if (e.results[e.results.length - 1].isFinal) finalText = t;
    };
    r.onerror = (e: any) => {
      const map: Record<string, string> = {
        "not-allowed": "Microphone permission was denied. Allow microphone access for this site in your browser settings and try again.",
        "service-not-allowed": "Speech recognition is blocked in this browser or context.",
        "no-speech": "No speech was detected. Try again a little closer to the microphone.",
        "audio-capture": "No microphone was found.",
        network: "Speech recognition needs a network connection.",
      };
      setVoiceError(map[e.error] ?? `Speech recognition error: ${e.error}`);
      setState("error");
    };
    r.onend = async () => {
      if (!finalText) { setState((s) => (s === "error" ? s : "idle")); return; }
      setState("processing");
      const answer = await chat.ask(finalText);
      if (answer) speak(answer.answer);
      else { setVoiceError("The question could not be answered. See the message in the Ask tab."); setState("error"); }
    };
    rec.current = r;
    try { r.start(); } catch { setVoiceError("Could not start the microphone."); setState("error"); }
  }

  function stop() {
    rec.current?.stop?.();
    window.speechSynthesis.cancel();
    if (state === "speaking") setState("idle");
  }

  /* ---------- HeyKoala outbound call ---------- */
  const [vs, setVs] = useState<VoiceStatus | null>(null);
  const [vsError, setVsError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [call, setCall] = useState<CallResult | null>(null);

  useEffect(() => {
    api<VoiceStatus>("/api/voice/status").then(setVs).catch((e: Error) => setVsError(e.message));
  }, []);

  async function verify() {
    setVsError(null);
    try { setVs(await api<VoiceStatus>("/api/voice/status?check=1")); } catch (e) { setVsError((e as Error).message); }
  }

  async function placeCall() {
    setCalling(true);
    setCallError(null);
    setCall(null);
    try {
      const r = await api<{ call: CallResult }>("/api/voice/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: contractId, name, phone, consent }) });
      setCall(r.call);
    } catch (e) {
      setCallError((e as Error).message);
    } finally {
      setCalling(false);
    }
  }

  const busy = state === "listening" || state === "processing" || state === "speaking";
  const last = chat.messages.filter((m) => m.role === "assistant").slice(-1)[0];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-2xl font-semibold">Talk to your contract in the browser</h2>
        <p className="mt-1 text-sm text-ink-soft">Uses your browser&apos;s speech recognition and speech synthesis; answers come from the same Bedrock-powered Q&amp;A as the Ask tab. This part does <strong>not</strong> use HeyKoala (its documented API places phone calls only). In Chrome, speech recognition may send your audio to the browser vendor.</p>

        {!supported ? (
          <Notice tone="warn" className="mt-4">This browser doesn&apos;t support speech recognition. Use Chrome, Edge or Safari, or type your questions in the Ask tab.</Notice>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-paper p-6">
            <button
              onClick={busy ? stop : start}
              aria-label={busy ? "Stop" : "Start asking by voice"}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-card transition-colors ${state === "listening" ? "bg-red-600" : "bg-brand hover:bg-brand-dark"}`}
            >
              {state === "processing" ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden /> : busy ? <Square className="h-7 w-7" aria-hidden /> : <Mic className="h-8 w-8" aria-hidden />}
            </button>
            <p className="flex items-center gap-2 text-sm font-medium" role="status">{state === "speaking" && <Volume2 className="h-4 w-4" aria-hidden />}{LABEL[state]}</p>
            <p className="text-xs text-ink-faint">Try: &ldquo;What happens if I leave this job early?&rdquo;</p>
          </div>
        )}
        {voiceError && <Notice tone="error" className="mt-3">{voiceError}</Notice>}
        {chat.error && state === "error" && <Notice tone="error" className="mt-3">{chat.error}</Notice>}
        {(heard || last) && (
          <div className="mt-4 space-y-2 text-sm" aria-label="Transcript">
            {heard && <p><span className="font-medium">You said:</span> {heard}</p>}
            {last && <p><span className="font-medium">Answer:</span> {last.content}</p>}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-2xl font-semibold">Get a call from a HeyKoala voice agent</h2>
        <p className="mt-1 text-sm text-ink-soft">HeyKoala places an outbound phone call to the number you enter. A short brief of this contract (summary and top findings, not the full text) is passed to the agent as call variables.</p>

        {demo ? (
          <Notice tone="info" className="mt-4">Phone calls are turned off for demo data because the analysis isn&apos;t real. Load the sample with live analysis, or upload your own contract.</Notice>
        ) : !canCall ? (
          <Notice tone="info" className="mt-4">Analyze the contract first.</Notice>
        ) : vs && !vs.configured ? (
          <Notice tone="warn" className="mt-4">
            <p className="font-medium">HeyKoala is not connected.</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Ask HeyKoala to enable API access, then create a key under Settings → API Keys with <code>calls: write</code> and <code>contacts: write</code>.</li>
              <li>Add <code>HEYKOALA_API_KEY</code> to <code>.env.local</code> and restart the server.</li>
              <li>Configure your HeyKoala agent so its prompt uses the call variables (<code>contract_name</code>, <code>contract_type</code>, <code>contract_risk</code>, <code>contract_brief</code>). See the README.</li>
            </ol>
          </Notice>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <Button variant="secondary" onClick={verify}>Check HeyKoala connection</Button>
              {vs?.verified && <span className="text-emerald-700">Connected{vs.organization ? ` to ${vs.organization}` : ""}. calls: {vs.scopes?.calls}, contacts: {vs.scopes?.contacts}</span>}
            </div>
            {vsError && <Notice tone="error" className="mt-3">{vsError}</Notice>}
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); placeCall(); }}>
              <div>
                <label htmlFor="cn" className="text-sm font-medium">Your name</label>
                <input id="cn" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="cp" className="text-sm font-medium">Phone (international format)</label>
                <input id="cp" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+14155550123" inputMode="tel" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
              </div>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                <span>This is my number (or I have permission to call it). I understand a summary of this contract will be shared with HeyKoala and that the call uses calling credits.</span>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" loading={calling} disabled={!consent || !name.trim() || !phone.trim()}><PhoneCall className="h-4 w-4" aria-hidden />Call me</Button>
              </div>
            </form>
            {callError && <Notice tone="error" className="mt-3">{callError}</Notice>}
            {call && (
              <Notice tone={call.dispatched ? "info" : "warn"} className="mt-3">
                {call.dispatched ? "HeyKoala accepted the call." : "HeyKoala created a call record, but the call was not placed."} Status: {call.status}. Call ID: {call.callId}. {call.message}
                <span className="mt-1 block text-xs text-ink-soft">This app does not receive HeyKoala webhooks, so what happens on the call isn&apos;t shown here.</span>
              </Notice>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
