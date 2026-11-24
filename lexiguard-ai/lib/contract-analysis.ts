import { callJson, bedrockConfig } from "./bedrock";
import { chunkSegments, renderSegment } from "./chunking";
import { AppError } from "./errors";
import { buildPassages, search } from "./retrieval";
import { normalize, verifyQuote } from "./validation";
import {
  ChunkResultSchema,
  DISCLAIMER,
  ModelChatSchema,
  ModelSimulationSchema,
  SynthesisSchema,
  type Analysis,
  type ChatAnswer,
  type ChunkResult,
  type Clause,
  type ImportantDate,
  type Obligation,
  type Segment,
  type Severity,
  type Simulation,
} from "@/types/contract";

const MAX_CHUNKS = 40;
const RANK: Record<Severity, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

export function riskFromScore(score: number): Severity {
  if (score < 25) return "Low";
  if (score < 50) return "Medium";
  if (score < 75) return "High";
  return "Critical";
}

/* ------------------------------ prompts ------------------------------ */

const CHUNK_SYSTEM = `You are a careful contract analyst helping non-lawyers understand agreements. You give informational analysis, not legal advice.

Rules:
- Use ONLY the contract text provided. Do not rely on outside assumptions about what the law says.
- Every item needs "originalText": an exact, verbatim, contiguous excerpt (at most 500 characters) copied from the contract text. Never paraphrase, correct, translate, or stitch separate passages together. Do not include the [[S# | Page #]] markers.
- Do not call a clause risky just because it is unusual. Explain why it could matter to the person signing and say what is uncertain. Never state that a clause is illegal or unenforceable.
- Write in plain English for a non-lawyer. Keep contract wording (originalText) separate from your interpretation (the other fields).
- Never invent dates. For relative deadlines (e.g. "within 15 days") copy the wording into dateOrPeriod. Use null if no date or period is stated.
- Severity: Low, Medium, High, Critical (Critical = potentially severe financial or legal consequences or highly one-sided terms).
- kind "risk" = potentially unfavourable to the signer. kind "important" = neutral but significant (term, payment, scope).
- Take the perspective of the individual or smaller party being asked to sign.
- If this part of the contract contains nothing relevant, return empty arrays.

Return ONLY a JSON object (no markdown) shaped like:
{"clauses":[{"title":"","kind":"risk","severity":"High","originalText":"","explanation":"","whyItMatters":"","questionsToAsk":[""],"suggestedNextStep":""}],
"obligations":[{"description":"","responsibleParty":"Employee | Company | Both | ...","originalText":"","explanation":""}],
"importantDates":[{"event":"","kind":"date | deadline | duration | penalty","dateOrPeriod":null,"originalText":"","explanation":""}]}`;

const SYNTH_SYSTEM = `You summarize a contract analysis for a non-lawyer. You are given the opening text of the contract and a list of findings already extracted from it. Return ONLY JSON:
{"contractType":"e.g. Employment Agreement","summary":"4-7 plain-English sentences about what this contract does and what the signer should notice most","riskScore":0-100,"questionsBeforeSigning":["5-8 specific questions to ask the other party"]}
riskScore guide: 0-24 low, 25-49 moderate, 50-74 high, 75-100 severe. Base it only on the findings provided. Do not claim anything is illegal. Use hedged wording; this is informational only.`;

const ANSWER_SYSTEM = `You answer questions about ONE contract using only the numbered passages provided.
Rules:
- If the passages do not contain the answer, set "found": false and say plainly that the document does not appear to cover it. Do not guess and do not give generic legal advice.
- Separate what the contract says ("The contract says...") from your interpretation ("This likely means...").
- "sources" must contain verbatim excerpts (max 400 characters each) copied exactly from the passages. Never paraphrase inside sources. Do not include passage labels.
- State uncertainty and ambiguity in "uncertainty" (empty string if none). Set confidence to low, medium, or high.
- Plain English. This is informational, not legal advice.
Return ONLY JSON: {"answer":"","found":true,"confidence":"medium","uncertainty":"","sources":[{"quote":""}]}`;

const SIM_SYSTEM = `You help a non-lawyer discuss a contract clause with the other party. Given one clause, either propose alternative wording that is fairer to the signer while keeping the commercial purpose, or assess wording the user proposed. The wording is a discussion starting point, not guaranteed valid legal language, and you must not claim it is legally valid or enforceable.
Return ONLY JSON: {"alternativeText":"the alternative wording (or the user's wording, lightly cleaned if they supplied one)","whatChanged":["..."],"assessment":"2-4 sentences","alternativeRisk":"Low|Medium|High|Critical","benefits":["..."],"remainingConcerns":["..."]}`;

/* ---------------------------- analysis ---------------------------- */

export function mergeChunkResults(results: ChunkResult[], segments: Segment[]) {
  let dropped = 0;
  const clauseMap = new Map<string, Clause>();
  const obligationMap = new Map<string, Obligation>();
  const dateMap = new Map<string, ImportantDate>();

  for (const r of results) {
    for (const c of r.clauses) {
      const m = verifyQuote(c.originalText, segments);
      if (!m.verified) { dropped++; continue; }
      const key = normalize(c.originalText).slice(0, 100);
      const prev = clauseMap.get(key);
      if (prev && RANK[prev.severity] >= RANK[c.severity]) continue;
      clauseMap.set(key, { ...c, id: "", page: m.page, segmentId: m.segmentId });
    }
    for (const o of r.obligations) {
      const m = verifyQuote(o.originalText, segments);
      if (!m.verified) { dropped++; continue; }
      const key = normalize(o.originalText).slice(0, 100);
      if (!obligationMap.has(key)) obligationMap.set(key, { ...o, id: "", page: m.page, segmentId: m.segmentId });
    }
    for (const d of r.importantDates) {
      const m = verifyQuote(d.originalText, segments);
      if (!m.verified) { dropped++; continue; }
      const key = normalize(d.event + d.originalText).slice(0, 120);
      if (!dateMap.has(key)) dateMap.set(key, { ...d, id: "", page: m.page, segmentId: m.segmentId });
    }
  }

  const clauses = [...clauseMap.values()]
    .sort((a, b) => RANK[b.severity] - RANK[a.severity])
    .map((c, i) => ({ ...c, id: `c${i + 1}` }));
  const obligations = [...obligationMap.values()].map((o, i) => ({ ...o, id: `o${i + 1}` }));
  const importantDates = [...dateMap.values()].map((d, i) => ({ ...d, id: `d${i + 1}` }));
  return { clauses, obligations, importantDates, dropped };
}

export async function analyzeContract(segments: Segment[], fileName: string): Promise<Analysis> {
  const chunks = chunkSegments(segments);
  if (chunks.length > MAX_CHUNKS) {
    throw new AppError(413, "too_long", `This document is too long for the demo (${chunks.length} sections). Split it into smaller documents.`);
  }

  const results: ChunkResult[] = [];
  // Two chunks at a time keeps latency reasonable without hammering Bedrock rate limits.
  for (let i = 0; i < chunks.length; i += 2) {
    const batch = chunks.slice(i, i + 2);
    const out = await Promise.all(
      batch.map((chunk, j) =>
        callJson(
          ChunkResultSchema,
          CHUNK_SYSTEM,
          `Contract part ${i + j + 1} of ${chunks.length}:\n\n${chunk.map(renderSegment).join("\n\n")}`,
          { maxTokens: 6000 }
        )
      )
    );
    results.push(...out);
  }

  const merged = mergeChunkResults(results, segments);
  const opening = segments.slice(0, 3).map((s) => s.text).join("\n\n").slice(0, 3000);
  const synth = await callJson(
    SynthesisSchema,
    SYNTH_SYSTEM,
    JSON.stringify({
      fileName,
      openingText: opening,
      findings: merged.clauses.map((c) => ({ title: c.title, kind: c.kind, severity: c.severity, explanation: c.explanation.slice(0, 240) })),
    }),
    { maxTokens: 2000 }
  );

  const riskScore = Math.round(synth.riskScore);
  return {
    contractType: synth.contractType,
    overallRisk: riskFromScore(riskScore),
    riskScore,
    summary: synth.summary,
    questionsBeforeSigning: synth.questionsBeforeSigning,
    clauses: merged.clauses,
    obligations: merged.obligations,
    importantDates: merged.importantDates,
    disclaimer: DISCLAIMER + " AI analysis may be incomplete or inaccurate.",
    mode: "live",
    modelId: bedrockConfig().modelId,
    generatedAt: new Date().toISOString(),
    chunksAnalyzed: chunks.length,
    droppedUnverified: merged.dropped,
  };
}

/* ------------------------------ chat ------------------------------ */

export type HistoryTurn = { role: "user" | "assistant"; content: string };

export async function answerQuestion(segments: Segment[], question: string, history: HistoryTurn[]): Promise<ChatAnswer> {
  // For short follow-ups ("what about the notice?") borrow the previous user question for retrieval.
  const prevUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
  const query = question.split(/\s+/).length < 8 ? `${prevUser} ${question}` : question;
  const hits = search(buildPassages(segments), query, 6);

  if (hits.length === 0) {
    return {
      answer: "I couldn't find anything in the uploaded document that relates to that question.",
      found: false,
      confidence: "high",
      uncertainty: "The document may use different wording. Try rephrasing the question.",
      sources: [],
      mode: "live",
    };
  }

  const passages = hits.map((h, i) => `[P${i + 1}${h.page ? ` | Page ${h.page}` : ""}]\n${h.text}`).join("\n\n");
  const convo = history.slice(-6).map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content.slice(0, 600)}`).join("\n");
  const out = await callJson(
    ModelChatSchema,
    ANSWER_SYSTEM,
    `Conversation so far:\n${convo || "(none)"}\n\nPassages from the contract:\n${passages}\n\nQuestion: ${question}`,
    { maxTokens: 1500 }
  );

  const sources: ChatAnswer["sources"] = [];
  for (const s of out.sources) {
    const m = verifyQuote(s.quote, segments);
    if (m.verified && m.segmentId !== null) sources.push({ quote: s.quote.trim(), page: m.page, segmentId: m.segmentId });
  }
  const droppedSome = out.sources.length > sources.length;
  return {
    answer: out.answer,
    found: out.found,
    confidence: out.confidence,
    uncertainty: [out.uncertainty, droppedSome ? "Some quotations from the model could not be matched to the document and were hidden." : ""].filter(Boolean).join(" "),
    sources,
    mode: "live",
  };
}

/* ---------------------------- simulator ---------------------------- */

export async function simulateClause(clause: Clause, proposedText?: string): Promise<Simulation> {
  const out = await callJson(
    ModelSimulationSchema,
    SIM_SYSTEM,
    JSON.stringify({
      clauseTitle: clause.title,
      originalClause: clause.originalText,
      knownConcern: clause.explanation,
      originalSeverity: clause.severity,
      userProposedWording: proposedText?.trim() || null,
    }),
    { maxTokens: 2000, temperature: 0.3 }
  );
  return {
    originalText: clause.originalText,
    originalRisk: clause.severity,
    alternativeText: out.alternativeText,
    whatChanged: out.whatChanged,
    assessment: out.assessment,
    alternativeRisk: out.alternativeRisk,
    benefits: out.benefits,
    remainingConcerns: out.remainingConcerns,
    userProposed: Boolean(proposedText?.trim()),
    mode: "live",
  };
}
