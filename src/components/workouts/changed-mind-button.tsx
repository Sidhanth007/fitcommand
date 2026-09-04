"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoSkipAction } from "@/app/(app)/workouts/skip-actions";

/** Removes today's "missed" mark and jumps straight into the planned session. */
export function ChangedMindButton({ dayKey, planWorkoutId, size = "default" }: { dayKey: string; planWorkoutId: string; size?: "default" | "sm" | "lg" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await undoSkipAction(dayKey);
          toast.success("Nice — miss removed. Let's go!");
          router.push(`/workouts/start?workout=${planWorkoutId}`);
        })
      }
    >
      <Play className="size-4" /> {pending ? "Opening…" : "Changed my mind — start session"}
    </Button>
  );
}
