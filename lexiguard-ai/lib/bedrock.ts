import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { z } from "zod";
import { AppError } from "./errors";
import { parseModelJson } from "./validation";

let client: BedrockRuntimeClient | null = null;

export function bedrockConfig() {
  return { region: process.env.AWS_REGION || "", modelId: process.env.BEDROCK_MODEL_ID || "" };
}

export function isBedrockConfigured(): boolean {
  const c = bedrockConfig();
  return Boolean(c.region && c.modelId);
}

function getClient(): BedrockRuntimeClient {
  // Credentials come from the AWS default provider chain (env vars, shared config, SSO, IAM role...).
  if (!client) client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  return client;
}

type Msg = { role: "user" | "assistant"; content: string };

export function mapBedrockError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const err = e as { name?: string; message?: string; code?: string };
  const name = err?.name ?? "";
  const { modelId, region } = bedrockConfig();
  switch (name) {
    case "AccessDeniedException":
      return new AppError(403, "bedrock_access_denied", `AWS Bedrock denied access to model "${modelId}" in ${region}. Enable model access in the Bedrock console and make sure your IAM identity allows bedrock:InvokeModel.`);
    case "ResourceNotFoundException":
      return new AppError(400, "bedrock_model_not_found", `Model "${modelId}" was not found in ${region}. Check BEDROCK_MODEL_ID and AWS_REGION.`);
    case "ValidationException":
      return new AppError(400, "bedrock_validation", `Bedrock rejected the request. BEDROCK_MODEL_ID ("${modelId}") may be invalid, may need an inference-profile ID, or may not support the Converse API. Details: ${err.message ?? "none"}`);
    case "ThrottlingException":
    case "ServiceQuotaExceededException":
      return new AppError(429, "bedrock_throttled", "Bedrock is rate-limiting requests. Wait a moment and try again.");
    case "ModelNotReadyException":
    case "ServiceUnavailableException":
    case "ModelTimeoutException":
      return new AppError(503, "bedrock_unavailable", "The Bedrock model is temporarily unavailable. Try again shortly.");
    case "CredentialsProviderError":
    case "UnrecognizedClientException":
    case "InvalidSignatureException":
    case "ExpiredTokenException":
      return new AppError(401, "aws_credentials", "AWS credentials are missing, invalid, or expired. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or configure the AWS default credential chain.");
    case "TimeoutError":
    case "AbortError":
      return new AppError(504, "bedrock_timeout", "The AI request timed out. Try again, or use a smaller document.");
  }
  if (err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT" || /fetch failed|ENOTFOUND/i.test(err?.message ?? "")) {
    return new AppError(502, "network", "Could not reach AWS. Check your network connection.");
  }
  return new AppError(502, "bedrock_error", `Bedrock request failed (${name || "unknown error"}).`);
}

export async function converse(
  system: string,
  messages: Msg[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const { modelId } = bedrockConfig();
  if (!isBedrockConfigured()) {
    throw new AppError(503, "bedrock_not_configured", "AWS Bedrock is not configured. Set AWS_REGION and BEDROCK_MODEL_ID (see README), or use the sample contract in demo mode.");
  }
  try {
    const res = await getClient().send(
      new ConverseCommand({
        modelId,
        system: [{ text: system }],
        messages: messages.map((m) => ({ role: m.role, content: [{ text: m.content }] })),
        inferenceConfig: { maxTokens: opts.maxTokens ?? 4096, temperature: opts.temperature ?? 0.1 },
      }),
      { abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 90_000) }
    );
    const text = (res.output?.message?.content ?? []).map((b) => (b as { text?: string }).text ?? "").join("");
    if (!text.trim()) throw new AppError(502, "empty_response", "The model returned an empty response.");
    return text;
  } catch (e) {
    throw mapBedrockError(e);
  }
}

/** Calls the model, validates the JSON against a Zod schema, and retries once with a repair prompt. */
export async function callJson<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<T> {
  const first = await converse(system, [{ role: "user", content: user }], opts);
  try {
    return parseModelJson(schema, first);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid JSON";
    const second = await converse(
      system,
      [
        { role: "user", content: user },
        { role: "assistant", content: first.slice(0, 20000) },
        { role: "user", content: `Your previous reply was not valid for the required JSON schema (${reason}). Reply again with ONLY the corrected JSON object.` },
      ],
      opts
    );
    try {
      return parseModelJson(schema, second);
    } catch {
      throw new AppError(502, "invalid_ai_json", "The AI returned a response that could not be validated, twice. Please try again.");
    }
  }
}
