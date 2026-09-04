import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { AiError, logUsage, streamChat, type ChatMessage } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/context";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ message: z.string().trim().min(1, "Say something first.").max(2000, "Keep messages under 2,000 characters.") });
const HISTORY_TURNS = 16;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.emailVerified) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });

  const perMinute = rateLimit(`ai:min:${user.id}`, 8, 60 * 1000);
  const perDay = rateLimit(`ai:day:${user.id}`, 150, 24 * 60 * 60 * 1000);
  if (!perMinute.ok || !perDay.ok) {
    return NextResponse.json({ error: `You're sending messages quickly — try again in ${Math.max(perMinute.retryAfterSeconds, perDay.retryAfterSeconds)}s.` }, { status: 429 });
  }

  const message = parsed.data.message;
  const [history, system] = await Promise.all([
    db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: HISTORY_TURNS, select: { role: true, content: true } }),
    buildSystemPrompt(user.id),
  ]);
  const messages: ChatMessage[] = [
    ...history.reverse().map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content })),
    { role: "user", content: message },
  ];

  await db.chatMessage.create({ data: { userId: user.id, role: "USER", content: message } });

  let stream;
  const started = Date.now();
  try {
    stream = await streamChat({ system, messages, feature: "chat", userId: user.id, maxOutputTokens: 1200 });
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("The assistant is unavailable right now.", "unavailable");
    const status = err.kind === "quota" ? 429 : err.kind === "not_configured" ? 503 : err.kind === "auth" ? 502 : 503;
    return NextResponse.json({ error: err.message }, { status });
  }

  const { provider, model, chunks } = stream;
  const encoder = new TextEncoder();
  let full = "";
  const inputChars = system.length + messages.reduce((a, m) => a + m.content.length, 0);

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        if (full.trim()) await db.chatMessage.create({ data: { userId: user.id, role: "ASSISTANT", content: full } });
        await logUsage({ userId: user.id, feature: "chat", provider, model, latencyMs: Date.now() - started, outputChars: full.length, inputChars, success: true });
        controller.close();
      } catch (e) {
        console.error("[assistant] stream failed", e);
        await logUsage({ userId: user.id, feature: "chat", provider, model, latencyMs: Date.now() - started, outputChars: full.length, inputChars, success: false });
        controller.enqueue(encoder.encode("\n\n_(The response was cut short — please try again.)_"));
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": provider, "x-ai-model": model },
  });
}
