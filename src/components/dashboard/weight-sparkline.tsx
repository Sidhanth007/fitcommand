/** Tiny inline SVG sparkline for the dashboard (server-renderable, theme-aware). */
export function WeightSparkline({ values, width = 160, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 4 - ((v - min) / span) * (height - 8)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts.at(-1)!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Weight trend from ${values[0]} to ${values.at(-1)} kg`} className="overflow-visible">
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--chart-1)" />
    </svg>
  );
}
