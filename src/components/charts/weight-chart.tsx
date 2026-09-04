"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartLegend, ChartTooltip, chartTheme, shortDay } from "@/components/charts/chart-kit";

type Point = { dayKey: string; weightKg: number; avg7: number | null };

export function WeightChart({ data, targetKg }: { data: Point[]; targetKg: number | null }) {
  if (data.length < 2) return <ChartEmpty>Log your weight on at least two days to see the trend.</ChartEmpty>;
  const values = data.map((d) => d.weightKg).concat(targetKg ? [targetKg] : []);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const rows = data.map((d) => ({ ...d, label: shortDay(d.dayKey) }));

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={[min, max]} tick={chartTheme.tick} tickLine={false} axisLine={false} width={44} unit=" kg" />
            <Tooltip content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(1)} kg`} />} cursor={{ stroke: chartTheme.axis, strokeDasharray: "3 3" }} />
            {targetKg && <ReferenceLine y={targetKg} stroke={chartTheme.series[2]} strokeDasharray="4 4" label={{ value: `Target ${targetKg} kg`, position: "insideTopRight", fontSize: 11, fill: chartTheme.axis }} />}
            <Line type="monotone" dataKey="weightKg" name="Weight" stroke={chartTheme.series[0]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: chartTheme.series[0] }} activeDot={{ r: 5 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="avg7" name="7-day average" stroke={chartTheme.series[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Weight", color: chartTheme.series[0]! }, { label: "7-day average", color: chartTheme.series[1]!, dashed: true }, ...(targetKg ? [{ label: "Target", color: chartTheme.series[2]!, dashed: true }] : [])]} />
    </div>
  );
}
