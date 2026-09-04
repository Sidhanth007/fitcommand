import Link from "next/link";
import { AlertTriangle, Bot, CheckCircle2, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UndoSkipButton } from "@/components/workouts/undo-skip-button";
import type { Consistency } from "@/lib/tracking/consistency";
import { DAY_SHORT } from "@/lib/engine/options";
import { cn } from "@/lib/utils";

export function ConsistencyCard({ c, todayKey }: { c: Consistency; todayKey: string }) {
  const recent = c.days.slice(-16);
  const aiPrompt = `Here is my recent training consistency: ${c.summaryText} Give me a realistic comeback plan for the next 7 days that fits my current plan and schedule, and one habit change to reduce the misses.`;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" /> Consistency · last {c.windowDays} days
          </CardTitle>
          <CardDescription>Planned vs done, including the days you missed.</CardDescription>
        </div>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/assistant?q=${encodeURIComponent(aiPrompt)}`} />}>
          <Bot className="size-3.5" /> Comeback plan
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Adherence", `${c.adherencePct}%`, `${c.completed}/${c.planned} sessions`],
            ["Missed", String(c.missed), `${c.explicitSkips} with a reason`],
            ["Miss streak", String(c.currentMissStreak), c.currentMissStreak === 1 ? "planned session" : "planned sessions"],
            ["Since last workout", c.daysSinceLastWorkout == null ? "—" : String(c.daysSinceLastWorkout), c.daysSinceLastWorkout == null ? "no workouts yet" : c.daysSinceLastWorkout === 1 ? "day" : "days"],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-semibold tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground">{hint}</div>
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Planned sessions, oldest → newest</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-primary" /> done</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-amber-500" /> missed</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm border bg-muted" /> today</span>
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {recent.map((d) => (
                <li key={d.dayKey} title={`${d.dayKey} · ${d.title} · ${d.status}${d.reason ? ` (${d.reason.toLowerCase().replace("_", " ")})` : ""}`} className={cn("flex h-9 w-9 flex-col items-center justify-center rounded-md text-[10px] leading-none", d.status === "done" && "bg-primary text-primary-foreground", (d.status === "missed" || d.status === "skipped") && "bg-amber-500 text-white", d.status === "pending" && "border bg-muted text-muted-foreground", d.dayKey === todayKey && "ring-2 ring-primary/50")}>
                  <span>{DAY_SHORT[d.weekday]}</span>
                  <span className="mt-0.5 font-medium">{d.dayKey.slice(8)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(c.mostMissedWeekday || c.topReasons.length > 0 || c.longestGapDays) && (
          <p className="text-xs text-muted-foreground">
            {c.mostMissedWeekday && <>Most-missed day: <span className="font-medium text-foreground">{c.mostMissedWeekday}</span>. </>}
            {c.longestGapDays ? <>Longest gap: <span className="font-medium text-foreground">{c.longestGapDays} days</span>. </> : null}
            {c.topReasons.length > 0 && <>Top reasons: {c.topReasons.map((r) => `${r.label} ×${r.count}`).join(", ")}.</>}
          </p>
        )}

        <div className="space-y-2">
          {c.feedback.map((f, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", f.tone === "warn" && "border-amber-500/30 bg-amber-500/10", f.tone === "good" && "border-emerald-500/30 bg-emerald-500/10", f.tone === "info" && "bg-muted/40")}>
              {f.tone === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" /> : f.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <div>
                <div className="font-medium">{f.title}</div>
                <p className="text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        {c.days.some((d) => d.status === "skipped") && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Marked misses ({c.explicitSkips})</summary>
            <ul className="mt-2 divide-y rounded-lg border">
              {c.days
                .filter((d) => d.status === "skipped")
                .reverse()
                .map((d) => (
                  <li key={d.dayKey} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>
                      <span className="font-medium">{d.dayKey}</span> · {d.title} · {d.reason?.toLowerCase().replace("_", " ")}
                      {d.note ? <span className="text-muted-foreground"> — {d.note}</span> : null}
                    </span>
                    <UndoSkipButton dayKey={d.dayKey} />
                  </li>
                ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
