"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteWorkoutLogAction } from "@/app/(app)/workouts/actions";

export function DeleteWorkoutButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this workout log? This cannot be undone.")) return;
        startTransition(async () => {
          const r = await deleteWorkoutLogAction(id);
          if (r.ok) {
            toast.success("Workout deleted.");
            router.push("/workouts");
          } else toast.error(r.error ?? "Could not delete.");
        });
      }}
    >
      <Trash2 className="size-4" /> Delete
    </Button>
  );
}
