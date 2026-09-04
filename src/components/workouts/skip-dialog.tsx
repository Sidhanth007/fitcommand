"use client";

import { useState, useTransition } from "react";
import { CalendarX2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markSkipAction } from "@/app/(app)/workouts/skip-actions";
import { cn } from "@/lib/utils";

export type SkipReasonOption = { value: string; label: string; emoji: string };
export type SkippableDay = { dayKey: string; label: string; title: string; planWorkoutId: string };

type Props = {
  reasons: SkipReasonOption[];
  /** Days that can be marked; the first is preselected. */
  days: SkippableDay[];
  triggerLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "xs";
};

export function SkipDialog({ reasons, days, triggerLabel = "I missed today", variant = "outline", size = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [dayKey, setDayKey] = useState(days[0]?.dayKey ?? "");
  const [reason, setReason] = useState(reasons[0]?.value ?? "OTHER");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  if (days.length === 0) return null;
  const chosen = days.find((d) => d.dayKey === dayKey) ?? days[0]!;

  const submit = () =>
    start(async () => {
      const r = await markSkipAction({ dayKey: chosen.dayKey, reason, note, planWorkoutId: chosen.planWorkoutId });
      if (r.ok) {
        toast.success(r.message);
        setOpen(false);
        setNote("");
      } else toast.error(r.message);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <CalendarX2 className="size-4" /> {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark a missed session</DialogTitle>
          <DialogDescription>Logging misses helps spot patterns — it&apos;s information, not a judgement.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {days.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="skip-day">Which day?</Label>
              <select id="skip-day" value={chosen.dayKey} onChange={(e) => setDayKey(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                {days.map((d) => (
                  <option key={d.dayKey} value={d.dayKey}>
                    {d.label} — {d.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm">
              <span className="font-medium">{chosen.label}</span> — {chosen.title}
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => (
                <button key={r.value} type="button" onClick={() => setReason(r.value)} aria-pressed={reason === r.value} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted", reason === r.value && "border-primary bg-primary/10")}>
                  <span aria-hidden>{r.emoji}</span> {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skip-note">Note (optional)</Label>
            <Textarea id="skip-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. late meeting, will walk in the evening" />
          </div>
          <Button className="w-full" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save missed session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
