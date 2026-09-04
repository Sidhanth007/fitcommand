"use client";

import { useTransition } from "react";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePlanNotesAction } from "@/app/(app)/plan/ai-actions";

export function AiPlanNotes({ notes, configured }: { notes: string | null; configured: boolean }) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const r = await generatePlanNotesAction();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-primary" /> AI coaching notes
          </CardTitle>
          <CardDescription>Generated from your plan, profile and targets. AI guidance, not medical advice.</CardDescription>
        </div>
        <Button size="sm" variant={notes ? "outline" : "default"} onClick={run} disabled={pending || !configured}>
          <Sparkles className="size-3.5" /> {pending ? "Thinking…" : notes ? "Refresh" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {notes ? (
          <ul className="space-y-1.5 text-sm">
            {notes
              .split("\n")
              .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
              .filter(Boolean)
              .map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{l}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{configured ? "Get five short, personal coaching notes about this week's plan." : "AI provider not configured."}</p>
        )}
      </CardContent>
    </Card>
  );
}
