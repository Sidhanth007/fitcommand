"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteGoalAction, setGoalStatusAction, updateCustomProgressAction } from "@/app/(app)/goals/actions";
import { cn } from "@/lib/utils";

export type GoalView = {
  id: string;
  type: string;
  title: string;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string | null;
  percent: number;
  detail: string;
  reached: boolean;
  daily: boolean;
};

export function GoalCard({ g }: { g: GoalView }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(String(g.currentValue));
  const run = (fn: () => Promise<{ ok: boolean }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(msg);
      else toast.error("Something went wrong.");
    });
  const done = g.status === "COMPLETED";

  return (
    <Card className={cn(done && "border-primary/40 bg-primary/5", g.status === "ABANDONED" && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {done && <Trophy className="size-4 text-primary" />}
              {g.title}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{g.detail}</p>
          </div>
          <Badge variant={done ? "default" : "secondary"}>{done ? "Completed" : g.status === "ABANDONED" ? "Abandoned" : g.reached && g.daily ? "Hit today" : "Active"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.percent} aria-label={`${g.title} progress`}>
          <div className={cn("h-full rounded-full transition-[width]", done || g.reached ? "bg-primary" : "bg-chart-2")} style={{ width: `${g.percent}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{g.percent}%</span>
          {g.deadline && <span>by {new Date(g.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
        </div>

        {g.type === "CUSTOM" && g.status === "ACTIVE" && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateCustomProgressAction(g.id, Number(value)), "Progress updated.");
            }}
          >
            <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-28" aria-label="Current progress" />
            <span className="text-xs text-muted-foreground">/ {g.targetValue} {g.unit}</span>
            <Button size="sm" type="submit" disabled={pending}>
              Update
            </Button>
          </form>
        )}

        <div className="flex flex-wrap gap-1.5">
          {g.status === "ACTIVE" && (
            <>
              <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => setGoalStatusAction(g.id, "COMPLETED"), "Marked complete 🎉")}>
                <Check className="size-3.5" /> Mark complete
              </Button>
              <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => setGoalStatusAction(g.id, "ABANDONED"), "Goal abandoned.")}>
                <X className="size-3.5" /> Abandon
              </Button>
            </>
          )}
          {g.status !== "ACTIVE" && (
            <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => setGoalStatusAction(g.id, "ACTIVE"), "Goal reactivated.")}>
              <RotateCcw className="size-3.5" /> Reactivate
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            disabled={pending}
            onClick={() => {
              if (confirm("Delete this goal?")) run(() => deleteGoalAction(g.id), "Goal deleted.");
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
