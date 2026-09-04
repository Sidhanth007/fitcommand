"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartLegend, ChartTooltip, chartTheme, shortDay } from "@/components/charts/chart-kit";

type Day = { dayKey: string; calories: number; proteinG: number };

export function CaloriesChart({ data, targetCalories, targetProtein, metric }: { data: Day[]; targetCalories: number; targetProtein: number; metric: "calories" | "protein" }) {
  const hasData = data.some((d) => d.calories > 0);
  if (!hasData) return <ChartEmpty>Log meals to see daily intake here.</ChartEmpty>;
  const key = metric === "calories" ? "calories" : "proteinG";
  const target = metric === "calories" ? targetCalories : targetProtein;
  const unit = metric === "calories" ? " kcal" : " g";
  const rows = data.map((d) => ({ ...d, label: shortDay(d.dayKey), value: Math.round(d[key]) }));
  const over = (v: number) => (metric === "calories" ? v > target * 1.05 : false);

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} barCategoryGap={rows.length > 30 ? 1 : 4}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.tick} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={chartTheme.tick} tickLine={false} axisLine={false} width={48} unit={unit} />
            <Tooltip content={<ChartTooltip formatter={(v) => `${v}${unit}`} />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <ReferenceLine y={target} stroke={chartTheme.series[2]} strokeDasharray="4 4" label={{ value: `Target ${target}${unit}`, position: "insideTopRight", fontSize: 11, fill: chartTheme.axis }} />
            <Bar dataKey="value" name={metric === "calories" ? "Calories" : "Protein"} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.dayKey} fill={over(r.value) ? "var(--destructive)" : chartTheme.series[metric === "calories" ? 0 : 1]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: metric === "calories" ? "Calories eaten" : "Protein eaten", color: chartTheme.series[metric === "calories" ? 0 : 1]! }, { label: "Target", color: chartTheme.series[2]!, dashed: true }, ...(metric === "calories" ? [{ label: "Over target", color: "var(--destructive)" }] : [])]} />
    </div>
  );
}
