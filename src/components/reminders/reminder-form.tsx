"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { createReminderAction } from "@/app/(app)/reminders/actions";
import { initialActionState, type ActionState } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function ReminderForm({ types }: { types: { value: string; label: string; emoji: string; defaultTitle: string }[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(types[0]!.value);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const meta = types.find((t) => t.value === type)!;
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await createReminderAction(prev, fd);
    if (r.success) {
      toast.success(r.success);
      setOpen(false);
    }
    return r;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> New reminder
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New reminder</DialogTitle>
          <DialogDescription>Shows on your dashboard at the chosen time; optionally included in the morning email digest.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" noValidate>
          <FormAlert error={state.error} />
          <div className="space-y-1.5">
            <Label htmlFor="rtype">Type</Label>
            <select id="rtype" name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </div>
          <FormField key={`title-${type}`} label="Title" name="title" defaultValue={meta.defaultTitle} placeholder="e.g. Evening walk" errors={fe.title} required />
          <FormField label="Time" name="timeOfDay" type="time" defaultValue="07:30" errors={fe.timeOfDay} required />
          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button key={i} type="button" aria-pressed={on} onClick={() => setDays((s) => (on ? s.filter((x) => x !== i) : [...s, i]))} className={cn("size-9 rounded-md border text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {d}
                  </button>
                );
              })}
            </div>
            {days.map((d) => (
              <input key={d} type="hidden" name="daysOfWeek" value={d} />
            ))}
            {fe.daysOfWeek?.[0] && <p className="text-xs text-destructive">{fe.daysOfWeek[0]}</p>}
          </div>
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" name="emailDigest" className="size-4 accent-primary" defaultChecked />
            Include in my morning email digest
          </label>
          <SubmitButton className="w-full" pendingText="Saving…">
            Add reminder
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
