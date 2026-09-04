"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/auth/submit-button";
import { logFoodAction } from "@/app/(app)/nutrition/actions";
import { initialActionState, type ActionState } from "@/lib/validators/auth";

type Props = { dayKey: string; mealType: string; foodItemId: string; servings: number; label?: string };

/** One-click log of a library food with preset servings (used by meal ideas). */
export function QuickLogButton({ dayKey, mealType, foodItemId, servings, label = "Log" }: Props) {
  const [, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await logFoodAction(prev, fd);
    if (r.success) toast.success(r.success);
    if (r.error) toast.error(r.error);
    return r;
  }, initialActionState);

  return (
    <form action={action}>
      <input type="hidden" name="dayKey" value={dayKey} />
      <input type="hidden" name="mealType" value={mealType} />
      <input type="hidden" name="foodItemId" value={foodItemId} />
      <input type="hidden" name="servings" value={servings} />
      <SubmitButton size="xs" variant="ghost" pendingText="…">
        <Plus className="size-3.5" /> {label}
      </SubmitButton>
    </form>
  );
}
