"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartLegend, ChartTooltip, chartTheme, shortDay } from "@/components/charts/chart-kit";

export function SignupsChart({ data }: { data: { dayKey: string; count: number }[] }) {
  if (!data.some((d) => d.count > 0)) return <ChartEmpty>No signups in the last 30 days.</ChartEmpty>;
  const rows = data.map((d) => ({ ...d, label: shortDay(d.dayKey) }));
  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={chartTheme.tick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar dataKey="count" name="Signups" fill={chartTheme.series[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Signups per day", color: chartTheme.series[0]! }]} />
    </div>
  );
}

export function AiCallsChart({ data }: { data: { dayKey: string; count: number; failed: number }[] }) {
  if (!data.some((d) => d.count > 0)) return <ChartEmpty>No AI calls in the last 14 days.</ChartEmpty>;
  const rows = data.map((d) => ({ ...d, label: shortDay(d.dayKey), ok: d.count - d.failed }));
  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis tick={chartTheme.tick} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar dataKey="ok" name="Successful" stackId="a" fill={chartTheme.series[1]} isAnimationActive={false} />
            <Bar dataKey="failed" name="Failed" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.dayKey} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Successful", color: chartTheme.series[1]! }, { label: "Failed", color: "var(--destructive)" }]} />
    </div>
  );
}
