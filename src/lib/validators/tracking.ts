import { z } from "zod";

export const setInputSchema = z.object({
  reps: z.number().int().min(0).max(1000).nullable(),
  weightKg: z.number().min(0).max(1000).nullable(),
  durationSec: z.number().int().min(0).max(7200).nullable(),
  completed: z.boolean(),
});

export const workoutLogSchema = z.object({
  title: z.string().trim().min(1, "Give the workout a name").max(80),
  performedDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  planId: z.string().optional().nullable(),
  planWorkoutId: z.string().optional().nullable(),
  durationMin: z.number().int().min(1, "Duration must be at least 1 minute").max(600),
  rating: z.number().int().min(1).max(5).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z.array(setInputSchema).min(1),
      }),
    )
    .min(1, "Add at least one exercise"),
});
export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
export const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

export const logFoodSchema = z.object({
  dayKey,
  mealType: mealTypeSchema,
  foodItemId: z.string().min(1),
  servings: z.coerce.number().min(0.1, "Servings must be at least 0.1").max(20),
});

export const quickAddSchema = z.object({
  dayKey,
  mealType: mealTypeSchema,
  name: z.string().trim().min(1, "Enter a name").max(80),
  calories: z.coerce.number().min(0).max(5000),
  proteinG: z.coerce.number().min(0).max(500).default(0),
  carbsG: z.coerce.number().min(0).max(1000).default(0),
  fatG: z.coerce.number().min(0).max(500).default(0),
});

export const waterSchema = z.object({
  dayKey,
  deltaMl: z.coerce.number().int().min(-2000).max(2000),
});
