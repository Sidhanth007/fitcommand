"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, Timer, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveWorkoutLogAction } from "@/app/(app)/workouts/actions";
import { MUSCLE_LABELS } from "@/lib/engine/options";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type LibraryExercise = { id: string; name: string; muscleGroup: MuscleGroup; equipment: string };

type SetRow = { reps: string; weightKg: string; durationSec: string; completed: boolean };
type ExerciseRow = { exerciseId: string; name: string; muscleGroup: MuscleGroup; timed: boolean; prescription?: string; restSeconds: number; sets: SetRow[]; lastTime?: string; suggestion?: string };

export type LoggerPreset = {
  title: string;
  planId?: string;
  planWorkoutId?: string;
  exercises: {
    exerciseId: string;
    name: string;
    muscleGroup: MuscleGroup;
    sets: number;
    reps: string;
    restSeconds: number;
    lastTime?: string;
    suggestion?: string;
    suggestedWeightKg?: number | null;
    suggestedReps?: number | null;
    suggestedDurationSec?: number | null;
  }[];
};

export type DayOption = { dayKey: string; label: string };

type Props = { library: LibraryExercise[]; preset?: LoggerPreset; dayOptions?: DayOption[]; initialDayKey?: string };

const TIMED_RE = /s$|min$/;

function presetToRows(preset?: LoggerPreset): ExerciseRow[] {
  if (!preset) return [];
  return preset.exercises.map((e) => {
    const timed = TIMED_RE.test(e.reps);
    const repsDefault = timed ? "" : String(e.suggestedReps ?? (e.reps.match(/^\d+/)?.[0] ?? ""));
    const durDefault = timed ? String(e.suggestedDurationSec ?? (e.reps.includes("min") ? Number(e.reps.match(/^\d+/)?.[0] ?? 10) * 60 : Number(e.reps.match(/^\d+/)?.[0] ?? 30))) : "";
    const weightDefault = !timed && e.suggestedWeightKg ? String(e.suggestedWeightKg) : "";
    return {
      exerciseId: e.exerciseId,
      name: e.name,
      muscleGroup: e.muscleGroup,
      timed,
      prescription: `${e.sets} × ${e.reps}`,
      restSeconds: e.restSeconds,
      lastTime: e.lastTime,
      suggestion: e.suggestion,
      sets: Array.from({ length: e.sets }, () => ({ reps: repsDefault, weightKg: weightDefault, durationSec: durDefault, completed: false })),
    };
  });
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg">
      <Timer className="size-4 text-primary" />
      <span className="font-mono text-sm tabular-nums">Rest {left}s</span>
      <Button size="xs" variant="ghost" onClick={onDone} aria-label="Skip rest">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

export function WorkoutLogger({ library, preset, dayOptions = [], initialDayKey }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(preset?.title ?? "Custom workout");
  const [dayKey, setDayKey] = useState<string>(initialDayKey ?? dayOptions[0]?.dayKey ?? "");
  const isBackdated = dayOptions.length > 0 && dayKey !== dayOptions[0]?.dayKey;
  const [rows, setRows] = useState<ExerciseRow[]>(() => presetToRows(preset));
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [rest, setRest] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [durationOverride, setDurationOverride] = useState("");

  useEffect(() => {
    startedAt.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return library.filter((e) => e.name.toLowerCase().includes(q) || MUSCLE_LABELS[e.muscleGroup].toLowerCase().includes(q)).slice(0, 8);
  }, [query, library]);

  const addExercise = (e: LibraryExercise) => {
    setRows((r) => [
      ...r,
      { exerciseId: e.id, name: e.name, muscleGroup: e.muscleGroup, timed: e.muscleGroup === "CARDIO", restSeconds: 60, sets: [{ reps: "", weightKg: "", durationSec: "", completed: false }] },
    ]);
    setQuery("");
  };

  const updateSet = (ri: number, si: number, patch: Partial<SetRow>) =>
    setRows((r) => r.map((row, i) => (i !== ri ? row : { ...row, sets: row.sets.map((s, j) => (j !== si ? s : { ...s, ...patch })) })));

  const toggleDone = (ri: number, si: number) => {
    const row = rows[ri]!;
    const set = row.sets[si]!;
    const nowDone = !set.completed;
    updateSet(ri, si, { completed: nowDone });
    if (nowDone && row.restSeconds > 0) setRest(row.restSeconds);
  };

  const addSet = (ri: number) =>
    setRows((r) => r.map((row, i) => (i !== ri ? row : { ...row, sets: [...row.sets, { ...(row.sets.at(-1) ?? { reps: "", weightKg: "", durationSec: "" }), completed: false }] })));
  const removeSet = (ri: number, si: number) => setRows((r) => r.map((row, i) => (i !== ri ? row : { ...row, sets: row.sets.filter((_, j) => j !== si) })).filter((row) => row.sets.length > 0));
  const removeExercise = (ri: number) => setRows((r) => r.filter((_, i) => i !== ri));

  const completedCount = rows.reduce((a, r) => a + r.sets.filter((s) => s.completed).length, 0);
  const totalSets = rows.reduce((a, r) => a + r.sets.length, 0);
  const minutes = durationOverride ? Number(durationOverride) : Math.max(1, Math.round(elapsed / 60));

  function finish() {
    startTransition(async () => {
      const res = await saveWorkoutLogAction({
        title,
        performedDayKey: dayKey || null,
        planId: preset?.planId ?? null,
        planWorkoutId: preset?.planWorkoutId ?? null,
        durationMin: minutes,
        rating,
        notes: notes || null,
        exercises: rows.map((r) => ({
          exerciseId: r.exerciseId,
          sets: r.sets.map((s) => ({
            reps: s.reps === "" ? null : Number(s.reps),
            weightKg: s.weightKg === "" ? null : Number(s.weightKg),
            durationSec: s.durationSec === "" ? null : Number(s.durationSec),
            completed: s.completed,
          })),
        })),
      });
      if (res.ok) {
        toast.success("Workout saved. Nice work!");
        router.push(`/workouts/${res.id}`);
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {rest !== null && <RestTimer seconds={rest} onDone={() => setRest(null)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="title">Workout name</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <Badge variant="secondary">
            {completedCount}/{totalSets} sets
          </Badge>
        </div>
      </div>

      {rows.map((row, ri) => (
        <Card key={`${row.exerciseId}-${ri}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{row.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {MUSCLE_LABELS[row.muscleGroup]}
                  {row.prescription ? ` · plan: ${row.prescription}` : ""} · rest {row.restSeconds}s
                </p>
                {row.lastTime && <p className="mt-0.5 text-xs text-muted-foreground">Last time: {row.lastTime}</p>}
                {row.suggestion && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <TrendingUp className="size-3" /> {row.suggestion}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove exercise" onClick={() => removeExercise(ri)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={cn("grid items-center gap-2 text-xs text-muted-foreground", row.timed ? "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]" : "grid-cols-[2rem_1fr_1fr_2.5rem_2rem]")}>
              <span>Set</span>
              <span>{row.timed ? "Seconds" : "Reps"}</span>
              <span>{row.timed ? "Distance/notes" : "Weight (kg)"}</span>
              <span className="text-center">Done</span>
              <span />
            </div>
            {row.sets.map((s, si) => (
              <div key={si} className={cn("grid items-center gap-2 grid-cols-[2rem_1fr_1fr_2.5rem_2rem]", s.completed && "opacity-70")}>
                <span className="text-sm tabular-nums text-muted-foreground">{si + 1}</span>
                {row.timed ? (
                  <Input type="number" inputMode="numeric" min={0} value={s.durationSec} onChange={(e) => updateSet(ri, si, { durationSec: e.target.value })} aria-label={`Set ${si + 1} seconds`} />
                ) : (
                  <Input type="number" inputMode="numeric" min={0} value={s.reps} onChange={(e) => updateSet(ri, si, { reps: e.target.value })} aria-label={`Set ${si + 1} reps`} />
                )}
                {row.timed ? (
                  <Input value={s.weightKg} onChange={(e) => updateSet(ri, si, { weightKg: e.target.value.replace(/[^\d.]/g, "") })} placeholder="optional" aria-label={`Set ${si + 1} notes`} />
                ) : (
                  <Input type="number" inputMode="decimal" min={0} step="0.5" value={s.weightKg} onChange={(e) => updateSet(ri, si, { weightKg: e.target.value })} placeholder="0" aria-label={`Set ${si + 1} weight`} />
                )}
                <button
                  type="button"
                  onClick={() => toggleDone(ri, si)}
                  aria-pressed={s.completed}
                  aria-label={`Mark set ${si + 1} ${s.completed ? "incomplete" : "complete"}`}
                  className={cn("mx-auto flex size-8 items-center justify-center rounded-md border transition-colors", s.completed ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  <Check className="size-4" />
                </button>
                <Button variant="ghost" size="icon" aria-label="Remove set" onClick={() => removeSet(ri, si)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addSet(ri)}>
              <Plus className="size-3.5" /> Add set
            </Button>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label htmlFor="search">Add an exercise</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="search" className="pl-9" placeholder="Search by name or muscle (e.g. squat, back)" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {results.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {results.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => addExercise(e)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60">
                    <span>{e.name}</span>
                    <span className="text-xs text-muted-foreground">{MUSCLE_LABELS[e.muscleGroup]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Finish workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dayOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="performed-day">When did you do this?</Label>
              <select id="performed-day" value={dayKey} onChange={(e) => setDayKey(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm sm:w-64">
                {dayOptions.map((d) => (
                  <option key={d.dayKey} value={d.dayKey}>
                    {d.label}
                  </option>
                ))}
              </select>
              {isBackdated && <p className="text-xs text-muted-foreground">Backfilling a past day — it counts for that day&apos;s consistency and clears any &ldquo;missed&rdquo; mark. Enter the duration manually below.</p>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" min={1} max={600} value={durationOverride} onChange={(e) => setDurationOverride(e.target.value)} placeholder={`auto: ${Math.max(1, Math.round(elapsed / 60))}`} />
            </div>
            <div className="space-y-1.5">
              <Label>Perceived effort</Label>
              <div className="flex gap-1.5" role="radiogroup" aria-label="Perceived effort 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className={cn("size-9 rounded-md border text-sm font-medium", rating === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any PRs?" />
          </div>
          <Button className="w-full" size="lg" disabled={pending || rows.length === 0} onClick={finish}>
            {pending ? "Saving…" : `Save workout (${completedCount} sets done)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
