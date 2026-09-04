"use client";

import type { ReactNode } from "react";

/** Shared styling for Recharts so every chart reads as one system and works in both themes. */
export const chartTheme = {
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  series: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"],
  tick: { fontSize: 11, fill: "var(--muted-foreground)" } as const,
};

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number; unit?: string };

export function ChartTooltip({ active, label, payload, formatter }: { active?: boolean; label?: string | number; payload?: TooltipEntry[]; formatter?: (v: number | string, name: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-medium tabular-nums">{formatter ? formatter(p.value!, String(p.name)) : p.value}</span>
          </div>
        ))}
    </div>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{children}</div>;
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={it.dashed ? "h-0 w-4 border-t-2 border-dashed" : "h-0.5 w-4 rounded"} style={it.dashed ? { borderColor: it.color } : { background: it.color }} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export function shortDay(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
