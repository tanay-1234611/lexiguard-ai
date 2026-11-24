import { BookOpenCheck, CalendarClock, FileSearch, MessagesSquare, Phone, Scale, Lock } from "lucide-react";
import { Card, Disclaimer, LinkButton } from "@/components/ui";

const features = [
  { icon: BookOpenCheck, title: "Plain-language summary", text: "What the agreement does, in a few sentences you can actually read." },
  { icon: FileSearch, title: "Risky clauses, with proof", text: "Every finding shows the original wording and its page. Quotes that can't be found in your document are discarded." },
  { icon: MessagesSquare, title: "Ask your contract", text: "Questions are answered from your document only, with the clause quoted. If it isn't there, it says so." },
  { icon: CalendarClock, title: "Dates and obligations", text: "Deadlines, notice periods and penalties pulled out of the text. Nothing is guessed." },
  { icon: Scale, title: "Risk simulator", text: "Compare a clause with alternative wording you could raise in a negotiation." },
  { icon: Phone, title: "Voice", text: "Speak your questions in the browser, or have a HeyKoala voice agent call you to talk it through." },
];

const steps = [
  ["Upload", "Drop in a PDF or Word contract. Text is extracted and page boundaries are kept."],
  ["Analyze", "The contract is read in sections by an AI model on AWS Bedrock and the results are validated."],
  ["Review", "Open the findings, check each against the highlighted original text."],
  ["Ask and negotiate", "Ask follow-up questions, try alternative wording, and bring your questions to the other party."],
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Understand before you sign.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            LexiGuard AI reads your contract and shows what it commits you to: the penalties, the deadlines, the clauses worth a second look. Every point links back to the exact words in your document.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/upload">Upload a contract</LinkButton>
            <LinkButton href="/upload?sample=1" variant="secondary">Try the fictional sample</LinkButton>
          </div>
          <p className="mt-4 text-sm text-ink-faint">For students, employees, freelancers and small businesses. Not a substitute for a lawyer.</p>
        </div>

        <figure aria-label="Example of a flagged clause from a fictional contract" className="relative">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <p className="text-xs text-ink-faint">Fictional sample employment agreement, page 3</p>
            <p className="mt-3 font-display text-[15px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">7. Early Exit Repayment.</span>{" "}
              <mark className="clause-mark">
                If the Employee resigns or is terminated for misconduct before completing the Minimum Service Period, the Employee must repay the Company a retention and training fee of USD 18,000
              </mark>{" "}
              within fifteen (15) days of the last working day, regardless of how many months the Employee has already served.
            </p>
          </div>
          <div className="relative -mt-3 ml-6 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm shadow-card sm:ml-12">
            <p className="font-semibold text-orange-950">High: leaving in month 35 could cost the same as leaving in month 2</p>
            <p className="mt-1 text-orange-950/80">The repayment doesn&apos;t shrink with time served. Ask whether it can be pro-rated.</p>
          </div>
        </figure>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="features">
        <h2 id="features" className="font-display text-3xl font-semibold">What you get</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <Icon className="h-5 w-5 text-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-white p-5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand-dark">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6" aria-labelledby="privacy">
        <h2 id="privacy" className="flex items-center gap-2 font-display text-3xl font-semibold"><Lock className="h-6 w-6 text-brand" aria-hidden />Privacy and limits</h2>
        <ul className="grid gap-3 text-sm text-ink-soft md:grid-cols-2">
          <li className="rounded-xl border border-line bg-white p-4">Uploaded files are not stored. Only extracted text is kept, in server memory by default, tied to your browser session, and you can delete it any time.</li>
          <li className="rounded-xl border border-line bg-white p-4">Text is sent to AWS Bedrock for analysis. If you request a voice call, a short summary (not the full contract) is passed to HeyKoala.</li>
          <li className="rounded-xl border border-line bg-white p-4">The AI can miss things or misread them. Findings describe what the wording appears to mean; they are not legal conclusions.</li>
          <li className="rounded-xl border border-line bg-white p-4">Scanned PDFs without a text layer can&apos;t be read. Export a text PDF or upload a DOCX.</li>
        </ul>
        <Disclaimer />
      </section>
    </>
  );
}
