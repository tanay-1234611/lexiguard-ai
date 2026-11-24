/**
 * DEMO MODE. Everything here is pre-written for a FICTIONAL sample contract.
 * It never calls AWS Bedrock and the UI labels it as demo data.
 * Quotations are located in the document with the same verifier used in live mode.
 */
import { buildPassages, search } from "./retrieval";
import { riskFromScore } from "./contract-analysis";
import { toSegments } from "./document-parser";
import { verifyQuote } from "./validation";
import {
  DISCLAIMER,
  type Analysis,
  type ChatAnswer,
  type Clause,
  type ContractRecord,
  type ImportantDate,
  type Obligation,
  type Segment,
  type Simulation,
} from "@/types/contract";

const HEADER = `FICTIONAL SAMPLE: EMPLOYMENT AGREEMENT
(Demo data created for LexiGuard AI. Not a real contract. Do not rely on it for any purpose.)`;
const PARTIES = `This Employment Agreement (the "Agreement") is made between Northwind Analytics Pvt. Ltd. (the "Company") and Jordan Rivera (the "Employee").`;
const P_START = `1. Position and Start Date. The Employee will join the Company as a Data Analyst. The Employee's employment begins on 1 March 2027 (the "Start Date") and the Employee must report to the Company's office at the address stated in Schedule A.`;
const P_TERM = `2. Minimum Service Period. The Employee agrees to remain in the Company's employment for a minimum period of three (3) years from the Start Date (the "Minimum Service Period").`;
const P_COMP = `3. Compensation. The Company will pay the Employee a gross annual salary of USD 60,000, payable in twelve equal monthly instalments. The Company may review the salary once every twelve months but is not obliged to increase it.`;
const P_HOURS = `4. Working Hours. The standard working week is 40 hours. The Employee may be required to work additional hours as the Company reasonably requires, and no overtime pay will be due for any additional hours worked.`;
const P_PROB = `5. Probation and Termination by the Company. The first ninety (90) days of employment are a probation period. During probation, the Company may terminate this Agreement at any time without notice and without giving reasons. After probation, the Company may terminate this Agreement on thirty (30) days' written notice, or immediately and without notice for any conduct the Company considers to be misconduct.`;
const P_NOTICE = `6. Resignation. The Employee may resign by giving the Company sixty (60) days' written notice. The Company may decline to release the Employee before the end of the notice period.`;
const P_EXIT = `7. Early Exit Repayment. If the Employee resigns or is terminated for misconduct before completing the Minimum Service Period, the Employee must repay the Company a retention and training fee of USD 18,000 within fifteen (15) days of the last working day, regardless of how many months the Employee has already served. The Company may deduct this amount from any final salary or other sums owed to the Employee.`;
const P_NONCOMP = `8. Non-Competition. For eighteen (18) months after employment ends for any reason, the Employee shall not work for, advise, or hold any interest in any business that the Company considers to be a competitor, anywhere in the world.`;
const P_IP = `9. Intellectual Property. All inventions, code, analyses, and other works created by the Employee during the term of employment, including work created outside working hours and without using Company resources, belong exclusively to the Company.`;
const P_CONF = `10. Confidentiality. The Employee must keep all Confidential Information secret during employment and for five (5) years after employment ends. Confidential Information means any information the Company designates as confidential, whether orally or in writing.`;
const P_DISP = `11. Dispute Resolution. Any dispute arising from this Agreement will be resolved by binding arbitration in the Company's home city before an arbitrator chosen by the Company. The Employee waives the right to bring claims in court.`;
const SIGN = `Signed by the parties on the dates written below.\n\nCompany: ____________________   Date: __________\nEmployee: ____________________   Date: __________`;

export const SAMPLE_PAGES: string[] = [
  [HEADER, PARTIES, P_START, P_TERM, P_COMP].join("\n\n"),
  [P_HOURS, P_PROB, P_NOTICE].join("\n\n"),
  [P_EXIT, P_NONCOMP, P_IP].join("\n\n"),
  [P_CONF, P_DISP, SIGN].join("\n\n"),
];

export const SAMPLE_FILE_NAME = "Sample employment agreement (fictional).pdf";

export function sampleSegments(): Segment[] {
  return toSegments(SAMPLE_PAGES.map((text, i) => ({ page: i + 1, text })));
}

export function createSampleRecord(ownerId: string, demo: boolean): ContractRecord {
  const segments = sampleSegments();
  return {
    id: crypto.randomUUID(),
    ownerId,
    fileName: SAMPLE_FILE_NAME,
    fileType: "sample",
    sizeBytes: SAMPLE_PAGES.join("").length,
    uploadedAt: new Date().toISOString(),
    status: "uploaded",
    mode: demo ? "demo" : "live",
    pageCount: SAMPLE_PAGES.length,
    charCount: segments.reduce((n, s) => n + s.text.length, 0),
    segments,
  };
}

type RawClause = Omit<Clause, "id" | "page" | "segmentId">;

const RAW_CLAUSES: RawClause[] = [
  {
    title: "Early Exit Repayment", kind: "risk", severity: "High", originalText: P_EXIT,
    explanation: "If you resign (or are dismissed for misconduct) before three years, you would owe USD 18,000, and the amount does not shrink the longer you stay. The company may take it out of your final pay.",
    whyItMatters: "Leaving after 35 months could cost the same as leaving after 2 months. 'Misconduct' is judged by the company (see Section 5), so the repayment could be triggered by a dismissal you disagree with.",
    questionsToAsk: ["Can the repayment be pro-rated for each month I complete?", "Does the fee apply if I am made redundant or resign for a reason like unpaid salary?", "What exactly counts as 'training and retention' costs?"],
    suggestedNextStep: "Ask for the fee to reduce month by month and to apply only to resignation without cause. Consider getting a lawyer's view on whether deductions from final pay are allowed where you live.",
  },
  {
    title: "Termination Without Notice", kind: "risk", severity: "High", originalText: P_PROB,
    explanation: "During the first 90 days the company can end your job at any time with no notice or reason. After that, it needs 30 days' notice, except for anything it considers misconduct, which it can act on immediately.",
    whyItMatters: "The contract gives the company, not a neutral party, the power to decide what counts as misconduct. Combined with Section 7, an immediate dismissal could also trigger the repayment.",
    questionsToAsk: ["Can 'misconduct' be defined or listed?", "Will I get a chance to respond before an immediate dismissal?", "Is the 90-day no-notice rule negotiable?"],
    suggestedNextStep: "Ask for a written definition of misconduct and a short notice period during probation.",
  },
  {
    title: "Worldwide Non-Competition", kind: "risk", severity: "High", originalText: P_NONCOMP,
    explanation: "For 18 months after you leave, for any reason, you could not work for or hold any interest in a business the company considers a competitor, anywhere in the world.",
    whyItMatters: "The company decides who counts as a competitor, and the restriction applies even if you are dismissed. It could limit your next job. Whether such terms are enforceable varies by location, so this is a question for a lawyer.",
    questionsToAsk: ["Can the restriction be limited to named competitors, a region, or 6 months?", "Does it apply if the company dismisses me?"],
    suggestedNextStep: "Ask for a narrower scope and consider checking local rules on non-compete clauses.",
  },
  {
    title: "Ownership of Work Outside Hours", kind: "risk", severity: "Medium", originalText: P_IP,
    explanation: "The company would own everything you create during employment, including side projects made in your own time with your own equipment.",
    whyItMatters: "Personal projects, open-source contributions or a side business could belong to the company, even if unrelated to your job.",
    questionsToAsk: ["Can work unrelated to the company's business and made on my own time be excluded?"],
    suggestedNextStep: "List any existing side projects and ask for them to be excluded in writing.",
  },
  {
    title: "Unpaid Additional Hours", kind: "risk", severity: "Medium", originalText: P_HOURS,
    explanation: "You may be asked to work beyond 40 hours a week and the contract says no overtime pay is due.",
    whyItMatters: "There is no stated limit on extra hours, so workload could grow without extra pay. Local labour rules may affect this.",
    questionsToAsk: ["Is there a cap on additional hours?", "Is time off in lieu offered?"],
    suggestedNextStep: "Ask what 'reasonably requires' means in practice and whether there is a weekly limit.",
  },
  {
    title: "Arbitrator Chosen by the Company", kind: "risk", severity: "Medium", originalText: P_DISP,
    explanation: "Disputes go to binding arbitration in the company's home city, with an arbitrator the company chooses, and you give up the right to go to court.",
    whyItMatters: "A one-sided choice of decision-maker and location can make disputes harder and costlier for you.",
    questionsToAsk: ["Can the arbitrator be chosen jointly?", "Who pays the arbitration costs?"],
    suggestedNextStep: "Ask for a jointly selected arbitrator and a neutral or remote venue.",
  },
  {
    title: "Three-Year Minimum Service Period", kind: "important", severity: "Medium", originalText: P_TERM,
    explanation: "You commit to staying three years. The contract does not say what happens to the company's side of this commitment.",
    whyItMatters: "Notice that this is a commitment from you, while the company can still end the job under Section 5.",
    questionsToAsk: ["Is the company also committed to employing me for three years?"],
    suggestedNextStep: "Ask whether the commitment is mutual.",
  },
  {
    title: "Sixty-Day Resignation Notice", kind: "important", severity: "Low", originalText: P_NOTICE,
    explanation: "You must give 60 days' written notice, and the company may decline to release you before the notice period ends.",
    whyItMatters: "Starting a new job could be delayed; the company needs only 30 days' notice to end your job after probation.",
    questionsToAsk: ["Can the notice period be shortened by agreement?"],
    suggestedNextStep: "Ask for equal notice periods for both sides.",
  },
];

const RAW_OBLIGATIONS: Omit<Obligation, "id" | "page" | "segmentId">[] = [
  { description: "Remain employed for at least three years", responsibleParty: "Employee", originalText: P_TERM, explanation: "Leaving earlier can trigger the repayment in Section 7." },
  { description: "Give 60 days' written notice to resign", responsibleParty: "Employee", originalText: P_NOTICE, explanation: "The company may refuse to release you earlier." },
  { description: "Repay USD 18,000 within 15 days of the last working day if exiting early", responsibleParty: "Employee", originalText: P_EXIT, explanation: "The company may deduct it from final pay." },
  { description: "Keep Confidential Information secret during employment and for five years after", responsibleParty: "Employee", originalText: P_CONF, explanation: "The company decides what it designates as confidential." },
  { description: "Pay a gross annual salary of USD 60,000 in twelve monthly instalments", responsibleParty: "Company", originalText: P_COMP, explanation: "A salary review happens at most once a year with no obligation to raise pay." },
];

const RAW_DATES: Omit<ImportantDate, "id" | "page" | "segmentId">[] = [
  { event: "Employment starts", kind: "date", dateOrPeriod: "1 March 2027", originalText: P_START, explanation: "Stated start date in the contract." },
  { event: "Probation period", kind: "duration", dateOrPeriod: "First ninety (90) days", originalText: P_PROB, explanation: "The company can end employment without notice during this time." },
  { event: "Minimum service period", kind: "duration", dateOrPeriod: "Three (3) years from the Start Date", originalText: P_TERM, explanation: "Leaving earlier triggers Section 7." },
  { event: "Resignation notice", kind: "deadline", dateOrPeriod: "Sixty (60) days' written notice", originalText: P_NOTICE, explanation: "Required to resign." },
  { event: "Early exit repayment due", kind: "penalty", dateOrPeriod: "Within fifteen (15) days of the last working day; USD 18,000", originalText: P_EXIT, explanation: "Amount does not decrease with time served." },
  { event: "Non-compete restriction", kind: "duration", dateOrPeriod: "Eighteen (18) months after employment ends", originalText: P_NONCOMP, explanation: "Applies worldwide, for any reason for leaving." },
  { event: "Confidentiality period", kind: "duration", dateOrPeriod: "Five (5) years after employment ends", originalText: P_CONF, explanation: "Applies to information the company designates as confidential." },
];

function locate<T extends { originalText: string }>(items: T[], segments: Segment[], prefix: string) {
  const out: (T & { id: string; page: number | null; segmentId: number | null })[] = [];
  for (const it of items) {
    const m = verifyQuote(it.originalText, segments);
    if (m.verified) out.push({ ...it, id: `${prefix}${out.length + 1}`, page: m.page, segmentId: m.segmentId });
  }
  return out;
}

export function demoAnalysis(segments: Segment[]): Analysis {
  const riskScore = 72;
  return {
    contractType: "Employment Agreement (fictional sample)",
    overallRisk: riskFromScore(riskScore),
    riskScore,
    summary:
      "DEMO DATA. This is a pre-written analysis of a fictional employment agreement, not an AI response. The agreement hires a Data Analyst for a three-year minimum commitment at USD 60,000 a year. The main things to look at are the USD 18,000 repayment if you leave early, the company's power to dismiss you without notice during probation or for 'misconduct' it defines, an 18-month worldwide non-compete, and company ownership of work you create outside working hours.",
    questionsBeforeSigning: [
      "Can the USD 18,000 early-exit fee be reduced for each month I complete?",
      "How is 'misconduct' defined, and can I respond before an immediate dismissal?",
      "Can the non-compete be limited to named competitors, a region and a shorter period?",
      "Can side projects unrelated to the company be excluded from the IP clause?",
      "Is there a cap on additional unpaid hours?",
      "Can the arbitrator be chosen jointly and the venue be neutral?",
    ],
    clauses: locate(RAW_CLAUSES, segments, "c"),
    obligations: locate(RAW_OBLIGATIONS, segments, "o"),
    importantDates: locate(RAW_DATES, segments, "d"),
    disclaimer: DISCLAIMER + " This is demo data for a fictional contract.",
    mode: "demo",
    modelId: null,
    generatedAt: new Date().toISOString(),
    chunksAnalyzed: 0,
    droppedUnverified: 0,
  };
}

function quoteSources(texts: string[], segments: Segment[]): ChatAnswer["sources"] {
  const out: ChatAnswer["sources"] = [];
  for (const t of texts) {
    const m = verifyQuote(t, segments);
    if (m.verified && m.segmentId !== null) out.push({ quote: t, page: m.page, segmentId: m.segmentId });
  }
  return out;
}

export function demoAnswer(segments: Segment[], question: string): ChatAnswer {
  const q = question.toLowerCase();
  if (/(leave|resign|quit|early|three years|3 years|penalt|repay)/.test(q)) {
    return {
      answer:
        "Demo answer (pre-written, not AI-generated). The contract says that if you resign, or are dismissed for misconduct, before completing three years, you must repay USD 18,000 within 15 days of your last working day, regardless of how many months you have served. It also allows the company to deduct this from your final pay. In plain terms, leaving in month 35 appears to cost the same as leaving in month 2.",
      found: true,
      confidence: "high",
      uncertainty: "The contract does not say whether the fee can be reduced or waived, or what counts as 'training and retention' costs. Whether deductions from final pay are allowed depends on local law, so ask a lawyer.",
      sources: quoteSources([P_EXIT, P_TERM], segments),
      mode: "demo",
    };
  }
  if (/(terminat|fire|dismiss|notice|without notice)/.test(q)) {
    return {
      answer:
        "Demo answer (pre-written, not AI-generated). Yes, in two situations. During the first 90 days of probation, the company can end your employment at any time without notice or reasons. After probation, it needs 30 days' notice, except for conduct it considers misconduct, where it may act immediately. Note that you must give 60 days' notice if you resign.",
      found: true,
      confidence: "high",
      uncertainty: "The contract leaves 'misconduct' for the company to decide and does not list examples.",
      sources: quoteSources([P_PROB, P_NOTICE], segments),
      mode: "demo",
    };
  }
  const hits = search(buildPassages(segments), question, 2);
  if (hits.length === 0) {
    return { answer: "Demo mode: I couldn't find anything in the document related to that question.", found: false, confidence: "high", uncertainty: "", sources: [], mode: "demo" };
  }
  return {
    answer: "Demo mode (no AI model was called). These are the passages from the document that best match your question by keyword search. Connect AWS Bedrock for a plain-English explanation.",
    found: true,
    confidence: "low",
    uncertainty: "Keyword matching can miss relevant clauses.",
    sources: hits.map((h) => ({ quote: h.text, page: h.page, segmentId: h.segmentId })),
    mode: "demo",
  };
}

export function demoSimulation(clause: Clause, proposedText?: string): Simulation {
  const t = clause.title.toLowerCase();
  const base = { originalText: clause.originalText, originalRisk: clause.severity, mode: "demo" as const, userProposed: false };
  if (proposedText?.trim()) {
    return { ...base, alternativeText: proposedText.trim(), whatChanged: ["Demo mode cannot compare your custom wording."], assessment: "Demo mode does not call an AI model, so your own wording was not assessed. Connect AWS Bedrock to get an assessment.", alternativeRisk: clause.severity, benefits: [], remainingConcerns: ["Not assessed in demo mode."], userProposed: true };
  }
  if (t.includes("early exit")) {
    return { ...base, alternativeText: "If the Employee resigns before completing the Minimum Service Period, the Employee will repay a pro-rated portion of the USD 18,000 retention and training fee, equal to USD 18,000 multiplied by the number of full months remaining in the Minimum Service Period divided by 36. No repayment is due after month 24. The Company will not deduct this amount from final salary without the Employee's written consent, except where applicable law permits.", whatChanged: ["Fee shrinks each month instead of staying fixed", "No fee after month 24", "Dismissal for alleged misconduct no longer triggers the fee", "Deduction from final pay needs consent"], assessment: "This spreads the cost over the commitment period and removes the cliff effect. It would still leave a financial penalty for early resignation.", alternativeRisk: "Medium", benefits: ["Cost of leaving falls over time", "Less exposure to a disputed 'misconduct' finding"], remainingConcerns: ["The company may resist pro-rating", "The 'retention and training' purpose is still undefined"] };
  }
  if (t.includes("non-compet")) {
    return { ...base, alternativeText: "For six (6) months after employment ends, the Employee shall not work for a business listed in Schedule B that directly competes with the Company's data analytics products within the same country. This restriction does not apply if the Company terminates the Employee without cause.", whatChanged: ["18 months reduced to 6", "Worldwide reduced to one country", "'Company considers' replaced by a named list", "Does not apply after dismissal without cause"], assessment: "A narrower, objective restriction is easier to understand and plan around.", alternativeRisk: "Low", benefits: ["Clear who counts as a competitor", "Shorter limit on future job options"], remainingConcerns: ["The Schedule B list must be agreed", "Enforceability rules vary by location"] };
  }
  if (t.includes("termination")) {
    return { ...base, alternativeText: "During probation either party may end this Agreement on seven (7) days' written notice. After probation the Company may end this Agreement on thirty (30) days' written notice. Immediate termination is allowed only for serious misconduct as listed in Schedule C, after the Employee has been given a written statement of the allegation and a reasonable chance to respond.", whatChanged: ["Short notice added during probation", "'Misconduct' limited to a written list", "Right to respond before immediate dismissal"], assessment: "Adds predictability and process while still giving the company a way to act on serious issues.", alternativeRisk: "Medium", benefits: ["Reduced risk of sudden dismissal", "Objective standard for misconduct"], remainingConcerns: ["Schedule C must be drafted", "Probation notice is still short"] };
  }
  return { ...base, alternativeText: "Demo mode includes pre-written alternatives only for the early exit repayment, termination, and non-compete clauses of the sample contract. Connect AWS Bedrock to generate alternatives for any clause.", whatChanged: [], assessment: "No demo alternative is available for this clause.", alternativeRisk: clause.severity, benefits: [], remainingConcerns: [] };
}
