import { describe, expect, it } from "vitest";
import { generatePlan, selectTemplate, type EngineExercise, type EngineTemplate } from "./workout";

const lib: EngineExercise[] = [
  { id: "sq", name: "Bodyweight Squat", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER" },
  { id: "gs", name: "Goblet Squat", muscleGroup: "LEGS", equipment: "DUMBBELLS", difficulty: "BEGINNER" },
  { id: "bs", name: "Barbell Back Squat", muscleGroup: "LEGS", equipment: "BARBELL", difficulty: "INTERMEDIATE" },
  { id: "pu", name: "Push-Up", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "BEGINNER" },
  { id: "bp", name: "Barbell Bench Press", muscleGroup: "CHEST", equipment: "BARBELL", difficulty: "INTERMEDIATE" },
  { id: "pl", name: "Plank", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "BEGINNER" },
  { id: "run", name: "Jog / Run", muscleGroup: "CARDIO", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE" },
  { id: "walk", name: "Brisk Walk", muscleGroup: "CARDIO", equipment: "BODYWEIGHT", difficulty: "BEGINNER" },
];

const templates: EngineTemplate[] = [
  { id: "t3", name: "Beginner 3", description: "d", goal: "IMPROVE_FITNESS", experience: "BEGINNER", daysPerWeek: 3, structure: [
    { title: "A", focus: "FULL_BODY", exerciseNames: ["Barbell Back Squat", "Push-Up", "Plank"] },
    { title: "B", focus: "CARDIO", exerciseNames: ["Jog / Run"] },
    { title: "C", focus: "FULL_BODY", exerciseNames: ["Goblet Squat", "Barbell Bench Press"] },
  ] },
  { id: "t5", name: "Muscle 5", description: "d", goal: "GAIN_MUSCLE", experience: "INTERMEDIATE", daysPerWeek: 5, structure: [
    { title: "Upper", focus: "CHEST", exerciseNames: ["Barbell Bench Press", "Push-Up"] },
    { title: "Lower", focus: "LEGS", exerciseNames: ["Barbell Back Squat"] },
  ] },
];

describe("workout plan engine", () => {
  it("selects the template matching goal and experience", () => {
    expect(selectTemplate(templates, { goal: "GAIN_MUSCLE", experience: "INTERMEDIATE", daysPerWeek: 5, sessionMinutes: 60, equipment: ["BARBELL"] })?.id).toBe("t5");
    expect(selectTemplate(templates, { goal: "IMPROVE_FITNESS", experience: "BEGINNER", daysPerWeek: 3, sessionMinutes: 45, equipment: [] })?.id).toBe("t3");
  });

  it("substitutes exercises the user lacks equipment or level for", () => {
    const plan = generatePlan(templates, lib, { goal: "IMPROVE_FITNESS", experience: "BEGINNER", daysPerWeek: 3, sessionMinutes: 45, equipment: [] })!;
    const names = plan.workouts.flatMap((w) => w.exercises.map((e) => e.name));
    expect(names).not.toContain("Barbell Back Squat");
    expect(names).not.toContain("Barbell Bench Press");
    expect(names).toContain("Bodyweight Squat");
    // Intermediate-only cardio swapped for a beginner alternative
    expect(names).toContain("Brisk Walk");
    const swapped = plan.workouts.flatMap((w) => w.exercises).find((e) => e.substitutedFor === "Barbell Back Squat");
    expect(swapped?.name).toBe("Bodyweight Squat");
  });

  it("maps sessions onto the requested number of days and cycles when needed", () => {
    const plan = generatePlan(templates, lib, { goal: "GAIN_MUSCLE", experience: "INTERMEDIATE", daysPerWeek: 4, sessionMinutes: 60, equipment: ["BARBELL"] })!;
    expect(plan.workouts).toHaveLength(4);
    expect(new Set(plan.workouts.map((w) => w.dayOfWeek)).size).toBe(4);
    expect(plan.workouts[2]!.title).toContain("(repeat)");
  });

  it("uses goal-specific set/rep prescriptions and reduces sets for beginners", () => {
    const gain = generatePlan(templates, lib, { goal: "GAIN_MUSCLE", experience: "INTERMEDIATE", daysPerWeek: 2, sessionMinutes: 60, equipment: ["BARBELL"] })!;
    const bench = gain.workouts[0]!.exercises.find((e) => e.name === "Barbell Bench Press")!;
    expect(bench.sets).toBe(4);
    expect(bench.reps).toBe("8-12");
    const beginner = generatePlan(templates, lib, { goal: "IMPROVE_FITNESS", experience: "BEGINNER", daysPerWeek: 3, sessionMinutes: 45, equipment: [] })!;
    const squat = beginner.workouts[0]!.exercises.find((e) => e.name === "Bodyweight Squat")!;
    expect(squat.sets).toBe(2);
  });

  it("returns null when there are no templates", () => {
    expect(generatePlan([], lib, { goal: "MAINTAIN", experience: "BEGINNER", daysPerWeek: 3, sessionMinutes: 30, equipment: [] })).toBeNull();
  });
});
