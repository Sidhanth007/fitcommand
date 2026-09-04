import type { Equipment, Experience, FitnessGoal, MuscleGroup } from "@/generated/prisma/enums";

/** Minimal exercise shape the engine needs (matches the Exercise model). */
export type EngineExercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  difficulty: Experience;
};

export type TemplateSession = { title: string; focus: MuscleGroup; exerciseNames: string[] };

export type EngineTemplate = {
  id: string;
  name: string;
  description: string;
  goal: FitnessGoal;
  experience: Experience;
  daysPerWeek: number;
  structure: TemplateSession[];
};

export type PlanInput = {
  goal: FitnessGoal;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
};

export type PlannedExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  substitutedFor?: string;
};

export type PlannedWorkout = {
  dayOfWeek: number;
  title: string;
  focus: MuscleGroup;
  estMinutes: number;
  exercises: PlannedExercise[];
};

export type GeneratedPlan = {
  templateId: string;
  title: string;
  summary: string;
  workouts: PlannedWorkout[];
};

const EXP_RANK: Record<Experience, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

// Which weekdays to train for a given frequency (0 = Sunday).
const DAY_PATTERNS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

type Prescription = { sets: number; reps: string; restSeconds: number };

const PRESCRIPTION: Record<FitnessGoal, Prescription> = {
  GAIN_MUSCLE: { sets: 4, reps: "8-12", restSeconds: 90 },
  LOSE_WEIGHT: { sets: 3, reps: "12-15", restSeconds: 45 },
  MAINTAIN: { sets: 3, reps: "10-12", restSeconds: 60 },
  IMPROVE_FITNESS: { sets: 3, reps: "10-15", restSeconds: 60 },
};

const TIMED_EXERCISES = new Set(["Plank", "Mountain Climber", "Jumping Jacks", "Jump Rope", "Dead Bug"]);

/** Score and choose the most suitable template. */
export function selectTemplate(templates: EngineTemplate[], input: PlanInput): EngineTemplate | null {
  if (templates.length === 0) return null;
  const scored = templates.map((t) => {
    let score = 0;
    if (t.goal === input.goal) score += 3;
    else if ((t.goal === "MAINTAIN" || t.goal === "IMPROVE_FITNESS") && (input.goal === "MAINTAIN" || input.goal === "IMPROVE_FITNESS")) score += 2;
    const expGap = Math.abs(EXP_RANK[t.experience] - EXP_RANK[input.experience]);
    score += expGap === 0 ? 2 : expGap === 1 ? 1 : -1;
    score -= Math.abs(t.daysPerWeek - input.daysPerWeek) * 0.75;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.t;
}

function prescriptionFor(exercise: EngineExercise, input: PlanInput): Prescription {
  const base = PRESCRIPTION[input.goal];
  if (exercise.muscleGroup === "CARDIO") {
    const minutes = input.goal === "LOSE_WEIGHT" ? "12-15 min" : "8-10 min";
    return { sets: 1, reps: minutes, restSeconds: 60 };
  }
  if (TIMED_EXERCISES.has(exercise.name)) {
    return { sets: Math.max(2, base.sets - 1), reps: input.experience === "BEGINNER" ? "30s" : "45s", restSeconds: 45 };
  }
  const sets = input.experience === "BEGINNER" ? Math.max(2, base.sets - 1) : base.sets;
  return { ...base, sets };
}

/** Find a replacement exercise for the same muscle group using available equipment. */
function findSubstitute(
  original: EngineExercise,
  library: EngineExercise[],
  available: Set<Equipment>,
  used: Set<string>,
  experience: Experience,
): EngineExercise | null {
  const candidates = library
    .filter(
      (e) =>
        e.id !== original.id &&
        e.muscleGroup === original.muscleGroup &&
        available.has(e.equipment) &&
        EXP_RANK[e.difficulty] <= EXP_RANK[experience] &&
        !used.has(e.id),
    )
    .sort((a, b) => EXP_RANK[b.difficulty] - EXP_RANK[a.difficulty]); // prefer most challenging allowed
  return candidates[0] ?? null;
}

export function generatePlan(templates: EngineTemplate[], library: EngineExercise[], input: PlanInput): GeneratedPlan | null {
  const template = selectTemplate(templates, input);
  if (!template) return null;

  const available = new Set<Equipment>(["BODYWEIGHT", ...input.equipment]);
  const byName = new Map(library.map((e) => [e.name, e]));
  const days = Math.min(7, Math.max(1, input.daysPerWeek));
  const pattern = DAY_PATTERNS[days]!;
  const maxExercises = Math.min(7, Math.max(3, Math.round(input.sessionMinutes / 9)));

  const workouts: PlannedWorkout[] = pattern.map((dayOfWeek, i) => {
    const session = template.structure[i % template.structure.length]!;
    const used = new Set<string>();
    const exercises: PlannedExercise[] = [];

    for (const name of session.exerciseNames) {
      if (exercises.length >= maxExercises) break;
      const original = byName.get(name);
      if (!original) continue;

      let chosen: EngineExercise | null = original;
      let substitutedFor: string | undefined;
      const tooHard = EXP_RANK[original.difficulty] > EXP_RANK[input.experience];
      if (!available.has(original.equipment) || tooHard) {
        chosen = findSubstitute(original, library, available, used, input.experience);
        substitutedFor = chosen ? original.name : undefined;
      }
      if (!chosen || used.has(chosen.id)) continue;

      used.add(chosen.id);
      const rx = prescriptionFor(chosen, input);
      exercises.push({
        exerciseId: chosen.id,
        name: chosen.name,
        ...rx,
        substitutedFor,
        notes: substitutedFor ? `Swapped in for ${substitutedFor} based on your equipment/level.` : undefined,
      });
    }

    const title = template.structure.length < days && i >= template.structure.length ? `${session.title} (repeat)` : session.title;
    return {
      dayOfWeek,
      title,
      focus: session.focus,
      estMinutes: Math.min(input.sessionMinutes, 5 + exercises.length * 8),
      exercises,
    };
  });

  const summary = `${template.description} Scheduled ${days} day${days === 1 ? "" : "s"} per week, about ${input.sessionMinutes} minutes per session, using ${
    input.equipment.length ? "your available equipment" : "bodyweight only"
  }.`;

  return { templateId: template.id, title: template.name, summary, workouts };
}
