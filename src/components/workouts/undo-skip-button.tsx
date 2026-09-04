"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoSkipAction } from "@/app/(app)/workouts/skip-actions";

export function UndoSkipButton({ dayKey }: { dayKey: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await undoSkipAction(dayKey); if (r.ok) toast.success("Removed."); })}>
      <Undo2 className="size-3.5" /> Undo
    </Button>
  );
}
