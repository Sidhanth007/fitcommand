import { cn } from "@/lib/utils";

export function HealthBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null;
  const tone = score <= 2 ? "warn" : score >= 4 ? "good" : "ok";
  const label = score === 1 ? "Treat" : score === 2 ? "Occasional" : score === 3 ? "Okay" : score === 4 ? "Good" : "Great pick";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        tone === "warn" && "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        tone === "good" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        tone === "ok" && "border-border bg-muted text-muted-foreground",
        className,
      )}
      title={`Health score ${score}/5`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
