import { z } from "zod";

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const optNum = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const checkInSchema = z.object({
  dayKey,
  weightKg: optNum(30, 300),
  bodyFatPct: optNum(3, 70),
  waistCm: optNum(40, 200),
  chestCm: optNum(50, 200),
  hipsCm: optNum(50, 200),
  armCm: optNum(15, 80),
  thighCm: optNum(25, 120),
  steps: optNum(0, 100000),
  sleepHours: optNum(0, 24),
  mood: optNum(1, 5),
  note: z.string().trim().max(300).optional().transform((v) => v || null),
});

export const GOAL_TYPES = ["TARGET_WEIGHT", "WORKOUTS_PER_WEEK", "DAILY_CALORIES", "DAILY_PROTEIN", "DAILY_WATER_ML", "DAILY_STEPS", "CUSTOM"] as const;

export const goalSchema = z.object({
  type: z.enum(GOAL_TYPES),
  title: z.string().trim().min(2, "Give the goal a short title").max(80),
  targetValue: z.coerce.number({ error: "Enter a target" }).positive("Target must be positive").max(1000000),
  unit: z.string().trim().min(1).max(20),
  deadline: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00Z`) : null)),
});

export const REMINDER_TYPES = ["WORKOUT", "MEAL", "WATER", "WEIGH_IN", "CUSTOM"] as const;

export const reminderSchema = z.object({
  type: z.enum(REMINDER_TYPES),
  title: z.string().trim().min(2, "Give the reminder a title").max(80),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time"),
  daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one day"),
  emailDigest: z.boolean().default(false),
});
