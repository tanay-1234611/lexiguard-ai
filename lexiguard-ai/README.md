# LexiGuard AI: Understand before you sign

Upload a contract (PDF or DOCX). LexiGuard summarizes it in plain English, flags risky clauses **with the exact original wording and page**, extracts dates and obligations, answers questions grounded in the document, lets you compare alternative wording, and supports voice.

> LexiGuard AI provides informational assistance and does not replace advice from a qualified lawyer. AI analysis may be incomplete or inaccurate.

## What uses what

| Feature | Powered by |
|---|---|
| Contract type, summary, risk score, risky clauses, obligations, dates, questions to ask | **AWS Bedrock** (Converse API) |
| Contract Q&A (text) and the browser voice Q&A | **AWS Bedrock**, after local keyword retrieval (BM25) over your document |
| Risk simulator (alternative wording and assessment) | **AWS Bedrock** |
| Browser microphone and spoken answers | Your **browser's Web Speech API** (not HeyKoala) |
| "Call me" voice agent about your contract | **HeyKoala Voice API** (outbound phone call) |
| Demo mode (fictional sample only) | Pre-written data, clearly labelled, no API calls |

### Important: what the HeyKoala API can and cannot do
I read the official docs at https://voice.heykoala.ai/docs. The documented API is a **REST API for placing and managing phone calls**: create a contact, dispatch an outbound call, receive webhooks. It says explicitly that it does *not* carry audio, and I found no browser widget, WebRTC session, or speech-to-text endpoint. So:

* A user **cannot** speak into the browser and have HeyKoala answer. That part uses the browser's built-in speech APIs plus Bedrock.
* HeyKoala is used for what it documents: `POST /contacts/` then `POST /calls/dispatch/`, authenticated with `Authorization: Bearer hk_api_...`. A short **contract brief** (summary + top findings, never the full text) is passed as the call's `variables`, which the docs say are "available to the agent's prompt".
* This app does **not** receive HeyKoala webhooks, so call outcomes aren't displayed. (`HEYKOALA_EVENT_WEBHOOK_URL` can be set if you build a receiver.)

## Quick start (local)

Requirements: Node.js 18.18+ (20 recommended).

```bash
npm install
cp .env.example .env.local     # then fill in values (see below)
npm run dev                    # http://localhost:3000
```

With **no** credentials you can still click **Try the fictional sample**; it runs in clearly-labelled **demo mode**. Live analysis of your own files needs Bedrock.

Other commands: `npm test`, `npm run typecheck`, `npm run build && npm start`.

## AWS Bedrock setup

1. **Pick a region** where Bedrock is available and set `AWS_REGION`.
2. **Enable model access**: AWS Console → Amazon Bedrock → *Model access* → request access to a text model (for example an Anthropic Claude, Amazon Nova, or Meta Llama model). Some require a short use-case form.
3. **Choose a model ID that your account can invoke** and put it in `BEDROCK_MODEL_ID`. Find candidates with:
   ```bash
   aws bedrock list-foundation-models --region <region> --by-inference-type ON_DEMAND --query "modelSummaries[].modelId"
   aws bedrock list-inference-profiles --region <region> --query "inferenceProfileSummaries[].inferenceProfileId"
   ```
   Many newer models can only be called through an **inference profile** (IDs that start with a region prefix such as `us.` or `eu.`). If you get a `ValidationException` about on-demand throughput, use the inference-profile ID instead. Pick a model that supports the Converse API and follows JSON instructions well. The app does not hardcode any model.
4. **Credentials**: either set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env.local`, or leave them empty and use the default chain (`aws configure`, `aws sso login`, an IAM role). Credentials are only read on the server.
5. **Minimum IAM permissions** for the identity you use:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
       "Resource": "*"
     }]
   }
   ```
   (Tighten `Resource` to your model / inference-profile ARNs for anything beyond a demo. Inference profiles may need access to the underlying foundation-model ARNs in each region they route to.)

Typical errors the app explains in the UI: missing credentials, `AccessDeniedException` (model access or IAM), `ValidationException` (bad model ID), throttling, timeouts.

## HeyKoala setup

1. Ask your HeyKoala contact to enable **API access** (until then every request returns 401).
2. In HeyKoala: **Settings → API Keys → Create key** with scopes `calls: write` and `contacts: write`. Copy the key (shown once; starts with `hk_api_`).
3. Put it in `.env.local` as `HEYKOALA_API_KEY`. `HEYKOALA_BASE_URL` defaults to the **development** base URL (`https://dvoice.heykoala.ai/api/v1/ext`); use `https://voice.heykoala.ai/api/v1/ext` for production. Per the docs, calls on development are still **real calls that use credits**.
4. Optional: set `HEYKOALA_AGENT_ID`, `HEYKOALA_FROM_NUMBER`, `HEYKOALA_KNOWLEDGE_BASE_ID`, `HEYKOALA_CALL_FLOW_ID`. If empty, HeyKoala uses your first active agent/number.
5. **Configure your HeyKoala agent's prompt** so it uses the variables this app sends: `contract_name`, `contract_type`, `contract_risk`, `contract_brief`. Use the variable syntax HeyKoala's dashboard specifies (I could not verify the placeholder syntax from the docs). Tell the agent to answer only from the brief, say when it doesn't know, and not give legal advice.
6. In the app: open an analyzed contract → **Voice** → *Check HeyKoala connection* (calls `GET /ext/` to show the key's scopes) → enter your name and number (E.164, e.g. `+14155550123`) → tick consent → **Call me**.

## Using the demo

1. Dashboard or Upload → **Try the fictional sample** → **Analyze contract**.
2. Overview: summary, 72/100 risk, and the **Early Exit Repayment** clause with its quote and page 3. Click **Show in document**.
3. **Ask LexiGuard** → "What happens if I leave before three years?" → grounded answer, source quote, page.
4. **Voice** → microphone, ask the same question aloud.
5. **Risk simulator** → pick the early-exit clause → compare original and alternative wording.

If Bedrock is configured, the sample button runs a **live** analysis of the fictional contract; "Sample with pre-written demo analysis" forces demo mode. You can also download the sample (`/api/sample`, text) and print it to PDF to test real uploads.

## How the analysis stays honest

* Text is extracted per page (PDF via `unpdf`) or per section (DOCX via `mammoth`, which has no page numbers; findings then say "Section N").
* Long contracts are split into ~12,000-character chunks (never truncated); a hard cap of 40 chunks returns a clear error rather than silently dropping text.
* The model must return JSON, validated with **Zod** (one automatic repair retry).
* **Every quote is verified against the extracted text** (whitespace/case-insensitive). Findings whose quote can't be found are **dropped**, and the UI says how many. Page numbers come from where the quote was found, never from the model.
* Q&A retrieves the top passages first (BM25 + small synonym list). If nothing matches, it answers "not found" without calling the model.
* The risk category is derived from the numeric score in code, so the two can't disagree.

## Privacy

* Uploaded files are parsed in memory; **only extracted text** is kept, in server memory by default (`PERSIST_CONTRACTS=true` writes JSON to `.data/`, which is git-ignored).
* Contracts are tied to an anonymous httpOnly cookie. This stops casual cross-visitor access in a demo; it is **not** real authentication.
* Delete a contract from the dashboard or contract page (removes memory and disk copies).
* Extracted text is sent to AWS Bedrock; a short brief is sent to HeyKoala only if you request a call. Browser speech recognition may send audio to your browser vendor.
* Secrets stay server-side; `.env*` is git-ignored. Review AWS and HeyKoala data-handling terms before using real contracts. This app doesn't train models on your data, but I can't make claims about your providers' policies.

## Deployment

The app is a standard Next.js app (`npm run build && npm start`). **Contract state lives in server memory** (or local disk), so deploy to something long-running: a container or VM (EC2, ECS/Fargate, Render, Railway, Fly.io), with `PERSIST_CONTRACTS=true` on a persistent volume if you want data to survive restarts. Serverless platforms (e.g. Vercel) can run multiple isolated instances, so a contract uploaded in one request may not be found in the next; to deploy there you'd replace `lib/storage.ts` with a database or object store. Set the same environment variables in your host, use an IAM role instead of access keys on AWS, and put the app behind HTTPS (required for microphone access off localhost). Long analyses can take over a minute; make sure your host's request timeout is generous (the analyze route sets `maxDuration = 300`).

## Project layout

```
app/                 pages + API routes (upload, analyze, chat, simulate, contracts, status, sample, voice/status, voice/call)
components/          layout, dashboard, upload, analysis, chat, voice, simulator, shared ui
lib/bedrock.ts       Bedrock Converse client, error mapping, validated JSON calls
lib/heykoala.ts      HeyKoala client (contacts, dispatch, capabilities) + contract brief
lib/contract-analysis.ts  chunked analysis, quote verification, Q&A, simulator
lib/retrieval.ts     BM25 passage search      lib/document-parser.ts  PDF/DOCX extraction
lib/validation.ts    file checks, quote verifier, JSON parsing      lib/demo.ts  fictional sample + demo data
types/contract.ts    Zod schemas and shared types       tests/  Vitest tests
```

## Verification status (please read)

I wrote this in an environment with **no network access**, so I could not run `npm install`, `next build`, the Vitest suite, or any call to AWS or HeyKoala. What I *did* do: type-parse every file with `tsc` (no syntax errors; remaining diagnostics came only from packages that couldn't be installed) and run the retrieval, quote-verification, chunking and file-validation logic against the fictional sample with `tsx`.

Expect to fix small things on first run. Specifically **unverified**:

* `npm install` / `next build` / `npm test` results, and Tailwind/Next font loading.
* Bedrock calls: I used `ConverseCommand` as I know the AWS SDK for JavaScript v3; I did not re-fetch the AWS docs in this session. Whether your chosen model accepts the `temperature` setting and Converse-style prompts is up to the model.
* `unpdf` (`extractText(..., { mergePages: false })`) and `mammoth.extractRawText` usage is from memory of their APIs.
* HeyKoala: endpoints, auth, and the dispatch/contact request bodies follow the *Getting started* and *Placing a call* pages. I did **not** read the Webhooks, Scopes or full API reference pages. The exact error shapes, the contact payload beyond `phone`/`name`, and agent-side variable syntax are unconfirmed, and no call has been placed.
* Browser voice depends on browser support (Chrome/Edge/Safari) and needs HTTPS or localhost.

## Limitations

Scanned PDFs need OCR (not included). DOCX has no page numbers. Retrieval is keyword-based and can miss paraphrased wording. Tables and multi-column PDFs may extract in a jumbled order. Max 10 MB / 200 pages.
