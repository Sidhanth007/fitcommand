"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regeneratePlanAction } from "@/app/(app)/profile-actions";
import type { ComponentProps } from "react";

export function RegenerateButton(props: Omit<ComponentProps<typeof Button>, "onClick">) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      {...props}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await regeneratePlanAction();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      {pending ? "Regenerating…" : "Regenerate plan"}
    </Button>
  );
}
