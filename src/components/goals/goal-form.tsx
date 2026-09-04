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
import { createGoalAction } from "@/app/(app)/goals/actions";
import { initialActionState, type ActionState } from "@/lib/validators/auth";

type TypeMeta = { value: string; label: string; unit: string; hint: string; suggested: number };

export function GoalForm({ types }: { types: TypeMeta[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(types[0]!.value);
  const meta = types.find((t) => t.value === type)!;
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await createGoalAction(prev, fd);
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
        <Plus className="size-4" /> New goal
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>Most goals track themselves from your logs.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" noValidate>
          <FormAlert error={state.error} />
          <div className="space-y-1.5">
            <Label htmlFor="type">Goal type</Label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{meta.hint}</p>
          </div>
          <FormField key={`title-${type}`} label="Title" name="title" defaultValue={meta.value === "CUSTOM" ? "" : meta.label} errors={fe.title} required />
          <div className="grid grid-cols-2 gap-3">
            <FormField key={`target-${type}`} label={`Target${meta.unit ? ` (${meta.unit})` : ""}`} name="targetValue" type="number" step="any" inputMode="decimal" defaultValue={meta.suggested ? String(meta.suggested) : ""} errors={fe.targetValue} required />
            <FormField key={`unit-${type}`} label="Unit" name="unit" defaultValue={meta.unit || "units"} errors={fe.unit} readOnly={meta.value !== "CUSTOM"} />
          </div>
          <FormField label="Deadline (optional)" name="deadline" type="date" errors={fe.deadline} />
          <SubmitButton className="w-full" pendingText="Saving…">
            Add goal
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
