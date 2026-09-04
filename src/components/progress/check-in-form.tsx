"use client";

import { useActionState } from "react";
import { saveCheckInAction } from "@/app/(app)/progress/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

type Entry = Partial<Record<"weightKg" | "bodyFatPct" | "waistCm" | "chestCm" | "hipsCm" | "armCm" | "thighCm" | "steps" | "sleepHours" | "mood", number | null>> & { note?: string | null };

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

export function CheckInForm({ dayKey, entry, dateLabel }: { dayKey: string; entry: Entry | null; dateLabel: string }) {
  const [state, action] = useActionState(saveCheckInAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const v = (k: keyof Entry) => (entry?.[k] != null ? String(entry[k]) : "");

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="dayKey" value={dayKey} />
      <FormAlert error={state.error} success={state.success} />
      <p className="text-sm text-muted-foreground">Check-in for <span className="font-medium text-foreground">{dateLabel}</span>. Fill in whatever you measured — everything is optional.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FormField label="Weight (kg)" name="weightKg" type="number" step="any" inputMode="decimal" defaultValue={v("weightKg")} errors={fe.weightKg} />
        <FormField label="Body fat (%)" name="bodyFatPct" type="number" step="any" inputMode="decimal" defaultValue={v("bodyFatPct")} errors={fe.bodyFatPct} />
        <FormField label="Steps" name="steps" type="number" step="1" inputMode="numeric" defaultValue={v("steps")} errors={fe.steps} />
        <FormField label="Waist (cm)" name="waistCm" type="number" step="any" inputMode="decimal" defaultValue={v("waistCm")} errors={fe.waistCm} />
        <FormField label="Chest (cm)" name="chestCm" type="number" step="any" inputMode="decimal" defaultValue={v("chestCm")} errors={fe.chestCm} />
        <FormField label="Hips (cm)" name="hipsCm" type="number" step="any" inputMode="decimal" defaultValue={v("hipsCm")} errors={fe.hipsCm} />
        <FormField label="Arm (cm)" name="armCm" type="number" step="any" inputMode="decimal" defaultValue={v("armCm")} errors={fe.armCm} />
        <FormField label="Thigh (cm)" name="thighCm" type="number" step="any" inputMode="decimal" defaultValue={v("thighCm")} errors={fe.thighCm} />
        <FormField label="Sleep (hours)" name="sleepHours" type="number" step="any" inputMode="decimal" defaultValue={v("sleepHours")} errors={fe.sleepHours} />
      </div>
      <div className="space-y-1.5">
        <Label>Mood</Label>
        <div className="flex gap-2" role="radiogroup" aria-label="Mood">
          {MOODS.map((m, i) => (
            <label key={m} className={cn("flex size-10 cursor-pointer items-center justify-center rounded-lg border text-lg has-checked:border-primary has-checked:bg-primary/10")}>
              <input type="radio" name="mood" value={i + 1} defaultChecked={entry?.mood === i + 1} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={2} defaultValue={entry?.note ?? ""} placeholder="Slept badly, felt strong, sore legs…" />
      </div>
      <SubmitButton pendingText="Saving…">Save check-in</SubmitButton>
    </form>
  );
}
