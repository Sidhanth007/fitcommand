import { z } from "zod";

const num = (msg: string) => z.coerce.number({ error: msg });

export const basicsSchema = z.object({
  age: num("Enter your age").int().min(13, "You must be at least 13").max(100, "Enter a realistic age"),
  sex: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Select an option" }),
  heightCm: num("Enter your height").min(100, "Height looks too low").max(250, "Height looks too high"),
  weightKg: num("Enter your weight").min(30, "Weight looks too low").max(300, "Weight looks too high"),
  targetWeightKg: z
    .union([z.literal(""), num("Enter a number").min(30, "Target looks too low").max(300, "Target looks too high")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export const goalSchema = z.object({
  goal: z.enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_MUSCLE", "IMPROVE_FITNESS"], { error: "Choose a goal" }),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"], { error: "Choose your activity level" }),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], { error: "Choose your experience level" }),
});

export const trainingSchema = z.object({
  daysPerWeek: num("Choose training days").int().min(1).max(7),
  sessionMinutes: num("Choose session length").int().min(15).max(120),
  equipment: z.array(z.enum(["BODYWEIGHT", "DUMBBELLS", "BARBELL", "KETTLEBELL", "BANDS", "MACHINE", "CARDIO_MACHINE"])).default([]),
  injuries: z.string().trim().max(500).optional().transform((v) => v || null),
});

const listField = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

export const dietSchema = z.object({
  dietaryPreference: z.enum(["NONE", "VEGETARIAN", "VEGAN", "PESCATARIAN", "KETO", "PALEO", "HALAL", "KOSHER", "GLUTEN_FREE"]).default("NONE"),
  allergies: listField,
  dislikedFoods: listField,
});

export const profileSchema = basicsSchema.extend(goalSchema.shape).extend(trainingSchema.shape).extend(dietSchema.shape);

export type ProfileInput = z.infer<typeof profileSchema>;

export const STEP_SCHEMAS = [basicsSchema, goalSchema, trainingSchema, dietSchema] as const;

/** Convert FormData into a plain object the schemas understand (multi-value for equipment). */
export function formDataToProfile(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "equipment") continue;
    if (typeof v === "string") obj[k] = v;
  }
  obj.equipment = formData.getAll("equipment").filter((v): v is string => typeof v === "string");
  return obj;
}
