import { z } from "zod";

export const SeveritySchema = z.enum(["Low", "Medium", "High", "Critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

/* ---------- What the model is asked to return (validated with Zod) ---------- */

export const ModelClauseSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["risk", "important"]).default("risk"),
  severity: SeveritySchema,
  originalText: z.string().min(1),
  explanation: z.string().default(""),
  whyItMatters: z.string().default(""),
  questionsToAsk: z.array(z.string()).default([]),
  suggestedNextStep: z.string().default(""),
});

export const ModelObligationSchema = z.object({
  description: z.string().min(1),
  responsibleParty: z.string().default("Not specified"),
  originalText: z.string().min(1),
  explanation: z.string().default(""),
});

export const ModelDateSchema = z.object({
  event: z.string().min(1),
  kind: z.enum(["date", "deadline", "duration", "penalty"]).default("date"),
  dateOrPeriod: z.string().nullable().default(null),
  originalText: z.string().min(1),
  explanation: z.string().default(""),
});

export const ChunkResultSchema = z.object({
  clauses: z.array(ModelClauseSchema).default([]),
  obligations: z.array(ModelObligationSchema).default([]),
  importantDates: z.array(ModelDateSchema).default([]),
});

export const SynthesisSchema = z.object({
  contractType: z.string().min(1),
  summary: z.string().min(1),
  riskScore: z.number().min(0).max(100),
  questionsBeforeSigning: z.array(z.string()).default([]),
});

export const ModelChatSchema = z.object({
  answer: z.string().min(1),
  found: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  uncertainty: z.string().default(""),
  sources: z.array(z.object({ quote: z.string() })).default([]),
});

export const ModelSimulationSchema = z.object({
  alternativeText: z.string().min(1),
  whatChanged: z.array(z.string()).default([]),
  assessment: z.string().default(""),
  alternativeRisk: SeveritySchema,
  benefits: z.array(z.string()).default([]),
  remainingConcerns: z.array(z.string()).default([]),
});

export type ChunkResult = z.infer<typeof ChunkResultSchema>;

/* ---------- What the app stores and returns ---------- */

export type Segment = { id: number; page: number | null; text: string };
export type SourceRef = { page: number | null; segmentId: number | null };

export type Clause = z.infer<typeof ModelClauseSchema> & SourceRef & { id: string };
export type Obligation = z.infer<typeof ModelObligationSchema> & SourceRef & { id: string };
export type ImportantDate = z.infer<typeof ModelDateSchema> & SourceRef & { id: string };

export type Analysis = {
  contractType: string;
  overallRisk: Severity;
  riskScore: number;
  summary: string;
  questionsBeforeSigning: string[];
  clauses: Clause[];
  obligations: Obligation[];
  importantDates: ImportantDate[];
  disclaimer: string;
  mode: "live" | "demo";
  modelId: string | null;
  generatedAt: string;
  chunksAnalyzed: number;
  /** AI findings discarded because their quotation could not be found in the document. */
  droppedUnverified: number;
};

export type ContractStatus = "uploaded" | "analyzing" | "analyzed" | "error";

export type ContractRecord = {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: "pdf" | "docx" | "sample";
  sizeBytes: number;
  uploadedAt: string;
  status: ContractStatus;
  mode: "live" | "demo";
  pageCount: number | null;
  charCount: number;
  segments: Segment[];
  analysis?: Analysis;
  error?: string;
};

export type PublicContract = Omit<ContractRecord, "ownerId">;

export type ContractSummary = Omit<PublicContract, "segments" | "analysis"> & {
  contractType?: string;
  overallRisk?: Severity;
  riskScore?: number;
  findingsCount?: number;
};

export type ChatAnswer = {
  answer: string;
  found: boolean;
  confidence: "low" | "medium" | "high";
  uncertainty: string;
  sources: { quote: string; page: number | null; segmentId: number }[];
  mode: "live" | "demo";
};

export type Simulation = {
  originalText: string;
  originalRisk: Severity;
  alternativeText: string;
  whatChanged: string[];
  assessment: string;
  alternativeRisk: Severity;
  benefits: string[];
  remainingConcerns: string[];
  userProposed: boolean;
  mode: "live" | "demo";
};

export const DISCLAIMER =
  "LexiGuard AI provides informational assistance and does not replace advice from a qualified lawyer.";
