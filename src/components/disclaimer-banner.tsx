import { Info } from "lucide-react";
import { AI_DISCLAIMER_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DisclaimerBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{AI_DISCLAIMER_SHORT}</span>
    </div>
  );
}
