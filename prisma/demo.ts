/**
 * Demo data back-fill for showcase charts.
 * Usage: npm run db:demo -- --email=you@example.com [--days=14]
 * Adds workouts on planned days (with a couple of realistic misses), meals from the user's
 * diet-filtered library, water and weigh-ins for the last N days. Days that already have
 * meals or workouts are left untouched, so it is safe to re-run.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma/client";

neonConfig.webSocketConstructor = ws;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const email = String(args.email ?? "").toLowerCase();
const days = Math.min(60, Math.max(3, Number(args.days ?? 14)));
if (!email) {
  console.error("Usage: npm run db:demo -- --email=you@example.com [--days=14]");
  process.exit(1);
}

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const toKey = (d: Date) => keyFmt.format(d);
function tzOffsetMs(at: Date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(at.getTime() / 1000) * 1000;
}
function dayStart(key: string) {
  const naive = new Date(`${key}T00:00:00Z`);
  return new Date(naive.getTime() - tzOffsetMs(naive));
}
const shift = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const rnd = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 10) / 10;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;

async function main() {
  const user = await db.user.findUnique({ where: { email }, include: { profile: true, nutritionTarget: true } });
  if (!user?.profile) throw new Error("User not found or onboarding not completed.");
  const profile = user.profile;
  const target = user.nutritionTarget;
  const plan = await db.fitnessPlan.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" }, include: { workouts: { include: { exercises: { include: { exercise: true } } } } } });
  const foods = (await db.foodItem.findMany({ where: { isActive: true, healthScore: { gte: 3 } } })).filter((f) => (profile.dietaryPreference === "VEGAN" ? f.isVegan : profile.dietaryPreference === "VEGETARIAN" ? f.isVegetarian : true));
  const byCat = (c: string) => foods.filter((f) => f.category === c);
  const mains = byCat("Mains");
  const breads = [...byCat("Breads"), ...byCat("Grains")];
  const breakfast = byCat("Breakfast");
  const dairy = byCat("Dairy");
  const fruit = byCat("Fruits");
  const snacks = [...byCat("Snacks"), ...byCat("Nuts & Seeds")];

  const todayKey = toKey(new Date());
  const startWeight = profile.weightKg + (profile.goal === "LOSE_WEIGHT" ? 1.8 : profile.goal === "GAIN_MUSCLE" ? -0.9 : 0.4);
  const created = { workouts: 0, meals: 0, entries: 0, skips: 0 };

  for (let i = days; i >= 1; i--) {
    const key = shift(todayKey, -i);
    const start = dayStart(key);
    const end = new Date(start.getTime() + 86400000);
    const [hasMeals, hasWorkouts] = await Promise.all([db.mealLog.count({ where: { userId: user.id, eatenAt: { gte: start, lt: end } } }), db.workoutLog.count({ where: { userId: user.id, performedAt: { gte: start, lt: end } } })]);
    const noon = new Date(start.getTime() + 12 * 3600 * 1000);

    // Weigh-in + water most days.
    if (Math.random() < 0.8) {
      const progress = 1 - i / days;
      const weight = Math.round((startWeight + (profile.weightKg - startWeight) * progress + rnd(-0.3, 0.3)) * 10) / 10;
      await db.progressEntry.upsert({
        where: { userId_date: { userId: user.id, date: start } },
        update: { weightKg: weight, waterMl: Math.round(rnd(1500, 3000) / 250) * 250, steps: Math.round(rnd(4000, 11000)), sleepHours: rnd(5.5, 8.5), mood: Math.round(rnd(2, 5)) },
        create: { userId: user.id, date: start, weightKg: weight, waterMl: Math.round(rnd(1500, 3000) / 250) * 250, steps: Math.round(rnd(4000, 11000)), sleepHours: rnd(5.5, 8.5), mood: Math.round(rnd(2, 5)) },
      });
      created.entries++;
    }

    // Meals.
    if (!hasMeals && Math.random() < 0.9 && target) {
      const rows: { name: string; mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"; food: (typeof foods)[number]; servings: number }[] = [];
      const add = (mealType: (typeof rows)[number]["mealType"], food?: (typeof foods)[number], servings = 1) => food && rows.push({ name: food.name, mealType, food, servings });
      add("BREAKFAST", pick(breakfast.length ? breakfast : fruit), 1);
      add("BREAKFAST", pick(dairy.length ? dairy : fruit), 1);
      add("LUNCH", pick(mains), 1);
      add("LUNCH", pick(breads), 2);
      add("DINNER", pick(mains), 1);
      add("DINNER", pick(breads), Math.random() < 0.5 ? 1 : 2);
      if (Math.random() < 0.7) add("SNACK", pick(snacks), 1);
      if (Math.random() < 0.6) add("SNACK", pick(fruit), 1);
      await db.mealLog.createMany({
        data: rows.map((r) => ({
          userId: user.id,
          foodItemId: r.food.id,
          name: r.name,
          mealType: r.mealType,
          servings: r.servings,
          calories: Math.round(r.food.calories * r.servings * 10) / 10,
          proteinG: Math.round(r.food.proteinG * r.servings * 10) / 10,
          carbsG: Math.round(r.food.carbsG * r.servings * 10) / 10,
          fatG: Math.round(r.food.fatG * r.servings * 10) / 10,
          healthScore: r.food.healthScore,
          eatenAt: noon,
        })),
      });
      created.meals += rows.length;
    }

    // Workouts on planned days, with occasional misses.
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    const planned = plan?.workouts.find((w) => w.dayOfWeek === weekday);
    if (planned && !hasWorkouts) {
      const roll = Math.random();
      if (roll < 0.72) {
        const duration = Math.round(rnd(planned.estMinutes * 0.8, planned.estMinutes * 1.2));
        const mets = planned.exercises.map((e) => e.exercise.metValue);
        const avgMet = mets.reduce((a, b) => a + b, 0) / Math.max(1, mets.length);
        await db.workoutLog.create({
          data: {
            userId: user.id,
            planId: plan!.id,
            planWorkoutId: planned.id,
            title: planned.title,
            performedAt: new Date(start.getTime() + (7 + Math.floor(Math.random() * 12)) * 3600 * 1000),
            durationMin: duration,
            caloriesBurned: Math.round(avgMet * profile.weightKg * (duration / 60)),
            rating: Math.round(rnd(2, 5)),
            sets: {
              create: planned.exercises.flatMap((pe) =>
                Array.from({ length: pe.sets }, (_, s) => ({
                  exerciseId: pe.exerciseId,
                  setNumber: s + 1,
                  reps: /s$|min$/.test(pe.reps) ? null : Math.round(rnd(8, 12)),
                  durationSec: /s$|min$/.test(pe.reps) ? 45 : null,
                  weightKg: pe.exercise.equipment === "BODYWEIGHT" || pe.exercise.muscleGroup === "CARDIO" ? null : Math.round(rnd(10, 40) / 2.5) * 2.5,
                  completed: Math.random() < 0.95,
                })),
              ),
            },
          },
        });
        created.workouts++;
      } else if (roll < 0.9) {
        await db.workoutSkip.upsert({
          where: { userId_date: { userId: user.id, date: start } },
          update: {},
          create: { userId: user.id, date: start, planWorkoutId: planned.id, reason: pick(["BUSY", "TIRED", "NO_MOTIVATION", "TRAVEL"] as const), note: null },
        });
        created.skips++;
      }
    }
  }
  console.log(`Demo data for ${email} over ${days} days →`, created);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
