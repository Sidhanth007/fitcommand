import { z } from "zod";

const num = (msg = "Enter a number") => z.coerce.number({ error: msg });
const list = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const foodSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required").max(80),
  category: z.string().trim().min(2, "Category is required").max(40),
  tags: list,
  servingLabel: z.string().trim().min(1).max(40),
  servingGrams: num().min(1).max(2000),
  calories: num().min(0).max(5000),
  proteinG: num().min(0).max(500),
  carbsG: num().min(0).max(1000),
  fatG: num().min(0).max(500),
  fiberG: num().min(0).max(200).default(0),
  sugarG: num().min(0).max(500).default(0),
  healthScore: num().int().min(1).max(5).default(3),
  healthNote: z.string().trim().max(200).optional().transform((v) => v || null),
  swaps: list,
  isVegetarian: z.boolean().default(true),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(true),
});

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required").max(80),
  muscleGroup: z.enum(["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "GLUTES", "CORE", "FULL_BODY", "CARDIO"]),
  equipment: z.enum(["BODYWEIGHT", "DUMBBELLS", "BARBELL", "MACHINE", "BANDS", "KETTLEBELL", "CARDIO_MACHINE"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  metValue: num().min(1).max(20).default(5),
  instructions: z.string().trim().min(10, "Add short instructions").max(600),
});

export const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(300),
  goal: z.enum(["LOSE_WEIGHT", "MAINTAIN", "GAIN_MUSCLE", "IMPROVE_FITNESS"]),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  daysPerWeek: num().int().min(1).max(7),
  structure: z.string().transform((s, ctx) => {
    try {
      const parsed = JSON.parse(s) as unknown;
      const shape = z.array(z.object({ title: z.string().min(1), focus: z.enum(["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "GLUTES", "CORE", "FULL_BODY", "CARDIO"]), exerciseNames: z.array(z.string().min(1)).min(1) })).min(1);
      const r = shape.safeParse(parsed);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: "Structure must be a JSON array of { title, focus, exerciseNames[] }" });
        return z.NEVER;
      }
      return r.data;
    } catch {
      ctx.addIssue({ code: "custom", message: "Structure is not valid JSON" });
      return z.NEVER;
    }
  }),
});

export const articleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(120),
  excerpt: z.string().trim().min(10).max(300),
  body: z.string().trim().min(50, "Body should be at least 50 characters").max(20000),
  category: z.string().trim().min(2).max(40),
  isPublished: z.boolean().default(false),
});
