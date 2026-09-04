import { cn } from "@/lib/utils";

type Day = { dayKey: string; calories: number; proteinG: number };

/** Compact 7-day calories vs target bar strip (single series + target line). */
export function WeeklyCalories({ days, target, todayKey }: { days: Day[]; target: number; todayKey: string }) {
  const max = Math.max(target * 1.2, ...days.map((d) => d.calories), 1);
  return (
    <div>
      <div className="relative flex h-28 items-end gap-2" role="img" aria-label={`Calories per day for the last ${days.length} days against a ${target} kcal target`}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/50" style={{ bottom: `${(target / max) * 100}%` }} aria-hidden />
        {days.map((d) => {
          const h = (d.calories / max) * 100;
          const over = d.calories > target * 1.05;
          const label = new Date(`${d.dayKey}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
          return (
            <div key={d.dayKey} className="group relative flex flex-1 flex-col items-center justify-end gap-1" title={`${label}: ${Math.round(d.calories)} kcal · P ${Math.round(d.proteinG)} g`}>
              <div className={cn("w-full rounded-t-[4px] transition-colors", over ? "bg-destructive/80" : d.calories > 0 ? "bg-primary" : "bg-muted", d.dayKey === todayKey && "ring-2 ring-primary/40")} style={{ height: `${Math.max(h, d.calories > 0 ? 3 : 1)}%` }} />
              <span className={cn("text-[10px]", d.dayKey === todayKey ? "font-medium" : "text-muted-foreground")}>{label.slice(0, 2)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Dashed line = {target.toLocaleString()} kcal target. Hover a bar for details.</p>
    </div>
  );
}
