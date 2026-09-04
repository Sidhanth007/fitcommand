"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMealAction } from "@/app/(app)/nutrition/actions";

export function DeleteMealButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="ghost" size="icon" aria-label={`Remove ${name}`} disabled={pending} onClick={() => startTransition(() => deleteMealAction(id).then(() => undefined))}>
      <X className="size-3.5" />
    </Button>
  );
}
