import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
};

export function StatTile({ label, value, unit, hint, icon: Icon }: Props) {
  return (
    <Card className="gap-1 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
