"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialActionState, type ActionState } from "@/lib/validators/auth";

type Props = {
  title: string;
  description?: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  /** Render the fields; receives field errors from the last submit. */
  children: (fe: NonNullable<ActionState["fieldErrors"]>) => ReactNode;
  mode: "create" | "edit";
  triggerLabel?: string;
  wide?: boolean;
};

/** Reusable create/edit dialog wrapping a server action form. Closes itself on success. */
export function EntityDialog({ title, description, action, children, mode, triggerLabel, wide }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.success) {
      toast.success(r.success);
      setOpen(false);
    }
    return r;
  }, initialActionState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={mode === "create" ? <Button size="sm" /> : <Button size="xs" variant="ghost" aria-label={`Edit ${title}`} />}>
        {mode === "create" ? (
          <>
            <Plus className="size-4" /> {triggerLabel ?? "Add"}
          </>
        ) : (
          <Pencil className="size-3.5" />
        )}
      </DialogTrigger>
      <DialogContent className={wide ? "max-h-[90dvh] overflow-y-auto sm:max-w-2xl" : "max-h-[90dvh] overflow-y-auto sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={formAction} className="space-y-4" noValidate>
          <FormAlert error={state.error} />
          {children(state.fieldErrors ?? {})}
          <SubmitButton className="w-full" pendingText="Saving…">
            Save
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
