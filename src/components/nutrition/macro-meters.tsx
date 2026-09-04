import { cn } from "@/lib/utils";

type Meter = { key: string; label: string; value: number; target: number; unit: string; color: string };

function Bar({ m }: { m: Meter }) {
  const pct = m.target > 0 ? Math.min(100, (m.value / m.target) * 100) : 0;
  const over = m.target > 0 && m.value > m.target * 1.05;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ background: m.color }} aria-hidden />
          {m.label}
        </span>
        <span className="tabular-nums">
          <span className={cn("font-semibold", over && "text-destructive")}>{Math.round(m.value)}</span>
          <span className="text-muted-foreground"> / {Math.round(m.target)} {m.unit}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(m.target)} aria-valuenow={Math.round(m.value)} aria-label={m.label}>
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: over ? "var(--destructive)" : m.color }} />
      </div>
    </div>
  );
}

type Props = {
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number };
  target: { calories: number; proteinG: number; carbsG: number; fatG: number };
  compact?: boolean;
};

export function MacroMeters({ consumed, target, compact = false }: Props) {
  const meters: Meter[] = [
    { key: "cal", label: "Calories", value: consumed.calories, target: target.calories, unit: "kcal", color: "var(--foreground)" },
    { key: "p", label: "Protein", value: consumed.proteinG, target: target.proteinG, unit: "g", color: "var(--chart-1)" },
    { key: "c", label: "Carbs", value: consumed.carbsG, target: target.carbsG, unit: "g", color: "var(--chart-2)" },
    { key: "f", label: "Fat", value: consumed.fatG, target: target.fatG, unit: "g", color: "var(--chart-3)" },
  ];
  return (
    <div className={cn("grid gap-3", compact ? "" : "sm:grid-cols-2")}>
      {meters.map((m) => (
        <Bar key={m.key} m={m} />
      ))}
    </div>
  );
}
