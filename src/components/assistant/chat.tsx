"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, Loader2, RotateCcw, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearChatAction } from "@/app/(app)/assistant/actions";
import { AI_DISCLAIMER_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type UiMessage = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

const SUGGESTIONS = [
  "What should I eat for dinner tonight to hit my protein?",
  "Review what I've eaten today and suggest one swap.",
  "I only have 20 minutes — give me a quick version of today's workout.",
  "Explain my calorie and macro targets in simple words.",
  "How do I stop snacking on biscuits with chai?",
  "Suggest a high-protein vegetarian breakfast under 400 kcal.",
];

function renderMarkdownish(text: string) {
  // Lightweight rendering: paragraphs, bullets, **bold**. Keeps dependencies at zero.
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`} className="my-1.5 list-disc space-y-1 pl-5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const inline = (s: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) {
      list.push(m[1]!);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,3}\s+(.*)$/);
    out.push(
      h ? (
        <p key={`p${out.length}`} className="mt-2 font-semibold">
          {inline(h[1]!)}
        </p>
      ) : (
        <p key={`p${out.length}`} className="my-1.5">
          {inline(line)}
        </p>
      ),
    );
  }
  flush();
  return out;
}

/** Read a text stream, reporting the accumulated text after each chunk. */
async function readTextStream(body: ReadableStream<Uint8Array>, onText: (accumulated: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const state = { text: "" };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    state.text += decoder.decode(value, { stream: true });
    onText(state.text);
  }
  return state.text;
}

export function Chat({ initialMessages, initialPrompt, configured }: { initialMessages: UiMessage[]; initialPrompt?: string; configured: boolean }) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [clearing, startClear] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    counterRef.current += 1;
    const userMsg: UiMessage = { id: `u${counterRef.current}`, role: "user", content: message };
    const botId = `a${counterRef.current}`;
    setMessages((m) => [...m, userMsg, { id: botId, role: "assistant", content: "", pending: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const err = data.error ?? "The assistant is unavailable right now.";
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: err, pending: false } : x)));
        toast.error(err);
        return;
      }
      const finalText = await readTextStream(res.body, (acc) => setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: acc } : x))));
      setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: finalText || "(no response)", pending: false } : x)));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: "Connection problem — please try again.", pending: false } : x)));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function clear() {
    startClear(async () => {
      await clearChatAction();
      setMessages([]);
      toast.success("Conversation cleared.");
    });
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[32rem] flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot className="size-4 text-primary" /> FitCommand assistant
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">AI</span>
        </div>
        <Button variant="ghost" size="sm" onClick={clear} disabled={clearing || messages.length === 0}>
          <RotateCcw className="size-3.5" /> Clear
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg space-y-4 pt-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-6" />
            </div>
            <div>
              <p className="font-medium">Ask me anything about your training or food.</p>
              <p className="text-sm text-muted-foreground">I can see your profile, targets, plan and today&apos;s logs, so answers are personal.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={!configured || busy} className="rounded-full border px-3 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <div className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
              {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </div>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : m.pending && !m.content ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <div>{renderMarkdownish(m.content)}</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder={configured ? "Ask about meals, workouts, targets… (Enter to send, Shift+Enter for a new line)" : "AI provider not configured — add GEMINI_API_KEY or GROQ_API_KEY."}
            disabled={!configured || busy}
            className="min-h-11 resize-none"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={!configured || busy || !input.trim()} aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{AI_DISCLAIMER_SHORT} Conversations are stored in your account so you can continue later.</p>
      </form>
    </div>
  );
}
