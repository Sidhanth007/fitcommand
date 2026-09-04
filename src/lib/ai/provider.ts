import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Minimal, provider-agnostic chat layer over free-tier APIs.
 *  - Gemini via the Interactions API (stateless multi-turn, SSE streaming)
 *  - Groq via its OpenAI-compatible chat completions endpoint
 * Falls back from the primary provider to the other one on quota/server errors.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Provider = "gemini" | "groq";

export type ChatOptions = {
  system: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  /** Which feature is calling, for usage analytics. */
  feature: "chat" | "plan" | "meal";
  userId?: string;
};

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: "quota" | "auth" | "unavailable" | "bad_request" | "not_configured",
    public readonly provider?: Provider,
  ) {
    super(message);
  }
}

export type StreamResult = {
  provider: Provider;
  model: string;
  /** Async iterator of text chunks. */
  chunks: AsyncIterable<string>;
};

function providerOrder(): Provider[] {
  const primary = env.aiProvider;
  const other: Provider = primary === "gemini" ? "groq" : "gemini";
  return [primary, other].filter((p) => (p === "gemini" ? env.geminiApiKey : env.groqApiKey));
}

export function isAiConfigured() {
  return providerOrder().length > 0;
}

function classify(status: number, provider: Provider, body: string): AiError {
  if (status === 429) return new AiError("The assistant is at its free-tier limit right now. Please try again in a minute.", "quota", provider);
  if (status === 401 || status === 403) return new AiError("The AI provider rejected the API key.", "auth", provider);
  if (status >= 500) return new AiError("The AI provider is temporarily unavailable.", "unavailable", provider);
  return new AiError(`AI request failed (${status}): ${body.slice(0, 200)}`, "bad_request", provider);
}

/** Parse an SSE byte stream into `data:` JSON payloads. */
async function* sseJson(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of block.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          /* ignore partial/non-JSON lines */
        }
      }
    }
  }
}

// ───────────────────────────── Gemini (Interactions API) ─────────────────────────────

function geminiSteps(messages: ChatMessage[]) {
  return messages.map((m) => ({
    type: m.role === "user" ? "user_input" : "model_output",
    content: [{ type: "text", text: m.content }],
  }));
}

async function geminiStream(opts: ChatOptions): Promise<StreamResult> {
  const model = env.geminiModel;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse", {
    method: "POST",
    headers: { "x-goog-api-key": env.geminiApiKey, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      system_instruction: opts.system,
      input: geminiSteps(opts.messages),
      stream: true,
      store: false,
      generation_config: { max_output_tokens: opts.maxOutputTokens ?? 1024, thinking_level: "low" },
    }),
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw classify(res.status, "gemini", await res.text().catch(() => ""));
  const body = res.body;
  async function* chunks() {
    for await (const evt of sseJson(body)) {
      const type = evt.event_type as string | undefined;
      if (type === "step.delta") {
        const delta = evt.delta as { type?: string; text?: string } | undefined;
        if (delta?.type === "text" && delta.text) yield delta.text;
      } else if (type === "error") {
        const err = evt.error as { message?: string } | undefined;
        throw new AiError(err?.message ?? "Gemini stream error", "unavailable", "gemini");
      }
    }
  }
  return { provider: "gemini", model, chunks: chunks() };
}

// ───────────────────────────── Groq (OpenAI-compatible) ─────────────────────────────

async function groqStream(opts: ChatOptions): Promise<StreamResult> {
  const model = env.groqModel;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.groqApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: opts.maxOutputTokens ?? 1024,
      temperature: 0.6,
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw classify(res.status, "groq", await res.text().catch(() => ""));
  const body = res.body;
  async function* chunks() {
    for await (const evt of sseJson(body)) {
      const choices = evt.choices as { delta?: { content?: string } }[] | undefined;
      const text = choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  }
  return { provider: "groq", model, chunks: chunks() };
}

// ───────────────────────────── Public API ─────────────────────────────

/** Open a streaming chat; tries the primary provider, then falls back on quota/availability errors. */
export async function streamChat(opts: ChatOptions): Promise<StreamResult> {
  const order = providerOrder();
  if (order.length === 0) throw new AiError("No AI provider is configured. Add GEMINI_API_KEY or GROQ_API_KEY.", "not_configured");
  let lastError: AiError | null = null;
  for (const p of order) {
    try {
      return p === "gemini" ? await geminiStream(opts) : await groqStream(opts);
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError(String(e), "unavailable", p);
      lastError = err;
      if (err.kind === "bad_request") throw err; // our fault — don't retry elsewhere
    }
  }
  throw lastError ?? new AiError("AI request failed.", "unavailable");
}

/** Convenience: run a chat to completion and return the full text. */
export async function completeChat(opts: ChatOptions): Promise<{ text: string; provider: Provider; model: string; latencyMs: number }> {
  const started = Date.now();
  const result = await streamChat(opts);
  let text = "";
  for await (const c of result.chunks) text += c;
  const latencyMs = Date.now() - started;
  await logUsage({ ...opts, provider: result.provider, model: result.model, latencyMs, outputChars: text.length, success: true });
  return { text, provider: result.provider, model: result.model, latencyMs };
}

export async function logUsage(input: { userId?: string; feature: ChatOptions["feature"]; provider: Provider; model: string; latencyMs: number; outputChars: number; success: boolean; inputChars?: number }) {
  try {
    await db.aiUsage.create({
      data: {
        userId: input.userId ?? null,
        provider: input.provider,
        model: input.model,
        feature: input.feature,
        // Rough token estimate (~4 chars/token) — enough for demo analytics.
        inputTokens: Math.round((input.inputChars ?? 0) / 4),
        outputTokens: Math.round(input.outputChars / 4),
        latencyMs: input.latencyMs,
        success: input.success,
      },
    });
  } catch (e) {
    console.error("[ai] usage log failed", e);
  }
}
