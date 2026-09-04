"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartTooltip, chartTheme, shortDay } from "@/components/charts/chart-kit";

export type MeasurementMetric = "waistCm" | "chestCm" | "hipsCm" | "armCm" | "thighCm" | "bodyFatPct" | "steps" | "sleepHours";

export const MEASUREMENT_META: Record<MeasurementMetric, { label: string; unit: string }> = {
  waistCm: { label: "Waist", unit: " cm" },
  chestCm: { label: "Chest", unit: " cm" },
  hipsCm: { label: "Hips", unit: " cm" },
  armCm: { label: "Arm", unit: " cm" },
  thighCm: { label: "Thigh", unit: " cm" },
  bodyFatPct: { label: "Body fat", unit: " %" },
  steps: { label: "Steps", unit: "" },
  sleepHours: { label: "Sleep", unit: " h" },
};

export function MeasurementsChart({ data, metric }: { data: { dayKey: string; value: number }[]; metric: MeasurementMetric }) {
  const meta = MEASUREMENT_META[metric];
  if (data.length < 2) return <ChartEmpty>Log {meta.label.toLowerCase()} on at least two days to see a trend.</ChartEmpty>;
  const rows = data.map((d) => ({ ...d, label: shortDay(d.dayKey) }));
  const vals = data.map((d) => d.value);
  const pad = Math.max(1, (Math.max(...vals) - Math.min(...vals)) * 0.2);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[Math.floor(Math.min(...vals) - pad), Math.ceil(Math.max(...vals) + pad)]} tick={chartTheme.tick} tickLine={false} axisLine={false} width={52} unit={meta.unit} />
          <Tooltip content={<ChartTooltip formatter={(v) => `${Number(v).toLocaleString()}${meta.unit}`} />} cursor={{ stroke: chartTheme.axis, strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="value" name={meta.label} stroke={chartTheme.series[4]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: chartTheme.series[4] }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
