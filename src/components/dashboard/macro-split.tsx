type Props = { proteinG: number; carbsG: number; fatG: number; calories: number };

const SERIES = [
  { key: "protein", label: "Protein", color: "var(--chart-1)", kcalPerG: 4 },
  { key: "carbs", label: "Carbs", color: "var(--chart-2)", kcalPerG: 4 },
  { key: "fat", label: "Fat", color: "var(--chart-3)", kcalPerG: 9 },
] as const;

/** Single stacked bar of daily calories by macronutrient, with legend + direct labels. */
export function MacroSplit({ proteinG, carbsG, fatG, calories }: Props) {
  const grams = { protein: proteinG, carbs: carbsG, fat: fatG };
  const kcal = SERIES.map((s) => ({ ...s, grams: grams[s.key], kcal: grams[s.key] * s.kcalPerG }));
  const total = kcal.reduce((a, b) => a + b.kcal, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Macro split of ${calories} kcal: ${kcal.map((k) => `${k.label} ${Math.round((k.kcal / total) * 100)}%`).join(", ")}`}>
        {kcal.map((k) => (
          <div key={k.key} style={{ width: `${(k.kcal / total) * 100}%`, background: k.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2 text-sm">
        {kcal.map((k) => (
          <li key={k.key} className="rounded-lg border p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ background: k.color }} aria-hidden />
              {k.label}
            </div>
            <div className="font-semibold tabular-nums">{k.grams} g</div>
            <div className="text-xs text-muted-foreground tabular-nums">{Math.round((k.kcal / total) * 100)}% · {k.kcal} kcal</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
