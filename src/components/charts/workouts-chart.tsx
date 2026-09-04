"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartLegend, ChartTooltip, chartTheme } from "@/components/charts/chart-kit";

type Week = { label: string; sessions: number; minutes: number; volume: number; calories: number };

export function WorkoutsChart({ data, targetPerWeek, metric }: { data: Week[]; targetPerWeek: number; metric: "sessions" | "minutes" | "volume" }) {
  if (!data.some((d) => d.sessions > 0)) return <ChartEmpty>Log workouts to see weekly training here.</ChartEmpty>;
  const unit = metric === "sessions" ? "" : metric === "minutes" ? " min" : " kg";
  const name = metric === "sessions" ? "Sessions" : metric === "minutes" ? "Minutes" : "Volume";
  const rows = data.map((d) => ({ ...d, value: d[metric] }));

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} barCategoryGap={6}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} />
            <YAxis tick={chartTheme.tick} tickLine={false} axisLine={false} width={48} unit={unit} allowDecimals={false} />
            <Tooltip content={<ChartTooltip formatter={(v) => `${Number(v).toLocaleString()}${unit}`} />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            {metric === "sessions" && <ReferenceLine y={targetPerWeek} stroke={chartTheme.series[2]} strokeDasharray="4 4" label={{ value: `Plan: ${targetPerWeek}/week`, position: "insideTopRight", fontSize: 11, fill: chartTheme.axis }} />}
            <Bar dataKey="value" name={name} fill={chartTheme.series[3]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: `${name} per week`, color: chartTheme.series[3]! }, ...(metric === "sessions" ? [{ label: "Planned", color: chartTheme.series[2]!, dashed: true }] : [])]} />
    </div>
  );
}
