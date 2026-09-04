/** Pure progressive-overload helper: compares last performance against the planned prescription. */

export type PastSet = { reps: number | null; weightKg: number | null; durationSec: number | null; completed: boolean };

export type Progression = {
  lastTime: string; // e.g. "3×10 @ 20 kg"
  suggestion: string; // e.g. "Try 22.5 kg"
  suggestedWeightKg: number | null;
  suggestedReps: number | null;
  suggestedDurationSec: number | null;
};

function parseRange(reps: string): { low: number; high: number } | null {
  const m = reps.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  const single = reps.match(/^(\d+)$/);
  if (single) return { low: Number(single[1]), high: Number(single[1]) };
  return null;
}

export function roundToPlate(kg: number) {
  return Math.round(kg / 2.5) * 2.5;
}

export function suggestProgression(plannedReps: string, sets: PastSet[], isBodyweightOrCardio: boolean): Progression | null {
  const done = sets.filter((s) => s.completed);
  if (done.length === 0) return null;

  // Timed exercise (planks, cardio): nudge duration.
  if (done.every((s) => s.durationSec != null && s.reps == null)) {
    const secs = done.map((s) => s.durationSec!);
    const max = Math.max(...secs);
    const next = max >= 600 ? max + 60 : max + 5;
    return { lastTime: `${done.length}×${max >= 120 ? `${Math.round(max / 60)} min` : `${max}s`}`, suggestion: `Try ${next >= 120 ? `${Math.round(next / 60)} min` : `${next}s`} this time`, suggestedWeightKg: null, suggestedReps: null, suggestedDurationSec: next };
  }

  const repsList = done.map((s) => s.reps ?? 0);
  const minReps = Math.min(...repsList);
  const weights = done.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
  const topWeight = weights.length ? Math.max(...weights) : 0;
  const range = parseRange(plannedReps);
  const lastTime = `${done.length}×${minReps === Math.max(...repsList) ? minReps : `${minReps}-${Math.max(...repsList)}`}${topWeight ? ` @ ${topWeight} kg` : ""}`;

  if (isBodyweightOrCardio || topWeight === 0) {
    if (range && minReps >= range.high) return { lastTime, suggestion: `All sets hit ${range.high}+ — add 2 reps or an extra set`, suggestedWeightKg: null, suggestedReps: range.high + 2, suggestedDurationSec: null };
    if (range && minReps < range.low) return { lastTime, suggestion: `Aim for ${range.low}+ reps on every set`, suggestedWeightKg: null, suggestedReps: range.low, suggestedDurationSec: null };
    return { lastTime, suggestion: "Add one rep per set", suggestedWeightKg: null, suggestedReps: minReps + 1, suggestedDurationSec: null };
  }

  if (range && minReps >= range.high && done.length >= sets.length) {
    const bump = topWeight >= 40 ? roundToPlate(topWeight * 1.05) : topWeight + 2.5;
    const next = Math.max(topWeight + 2.5, bump);
    return { lastTime, suggestion: `Try ${next} kg (you hit the top of ${plannedReps} on every set)`, suggestedWeightKg: next, suggestedReps: range.low, suggestedDurationSec: null };
  }
  if (range && minReps < range.low) {
    const lighter = Math.max(2.5, roundToPlate(topWeight * 0.9));
    return { lastTime, suggestion: `Stay at ${topWeight} kg and aim for ${range.low}+ reps${lighter < topWeight ? ` (or drop to ${lighter} kg)` : ""}`, suggestedWeightKg: topWeight, suggestedReps: range.low, suggestedDurationSec: null };
  }
  return { lastTime, suggestion: `Same ${topWeight} kg — add a rep to each set`, suggestedWeightKg: topWeight, suggestedReps: minReps + 1, suggestedDurationSec: null };
}
