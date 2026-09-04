"use client";

import { useOptimistic, useTransition } from "react";
import { Droplets, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addWaterAction } from "@/app/(app)/nutrition/actions";

export function WaterTracker({ dayKey, waterMl, targetMl }: { dayKey: string; waterMl: number; targetMl: number }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(waterMl, (cur: number, delta: number) => Math.max(0, cur + delta));
  const pct = Math.min(100, (optimistic / targetMl) * 100);
  const glasses = Math.round(optimistic / 250);

  const change = (delta: number) =>
    startTransition(async () => {
      setOptimistic(delta);
      await addWaterAction(dayKey, delta);
    });

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Droplets className="size-4 text-sky-500" /> Water
        </span>
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{(optimistic / 1000).toFixed(2)}</span>
          <span className="text-muted-foreground"> / {(targetMl / 1000).toFixed(1)} L</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={targetMl} aria-valuenow={optimistic} aria-label="Water intake">
        <div className="h-full rounded-full bg-sky-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={pending || optimistic === 0} onClick={() => change(-250)} aria-label="Remove 250 ml">
          <Minus className="size-3.5" />
        </Button>
        <Button size="sm" onClick={() => change(250)} disabled={pending}>
          <Plus className="size-3.5" /> 250 ml
        </Button>
        <Button size="sm" variant="outline" onClick={() => change(500)} disabled={pending}>
          <Plus className="size-3.5" /> 500 ml
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{glasses} glass{glasses === 1 ? "" : "es"}</span>
      </div>
    </div>
  );
}
