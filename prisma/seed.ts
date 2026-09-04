// Seed script: exercise library + food library + starter plan templates.
// Run with: npm run db:seed  (idempotent — uses upsert by unique name)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import {
  PrismaClient,
  type Equipment,
  type Experience,
  type FitnessGoal,
  type MuscleGroup,
} from "../src/generated/prisma/client";
import { FOODS } from "./seed-data/foods";
import { FOODS2 } from "./seed-data/foods-2";
import { EXERCISES2 } from "./seed-data/exercises-2";

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

type Ex = [
  name: string,
  muscle: MuscleGroup,
  equipment: Equipment,
  difficulty: Experience,
  met: number,
  instructions: string,
];

const exercises: Ex[] = [
  // Chest
  ["Push-Up", "CHEST", "BODYWEIGHT", "BEGINNER", 3.8, "Hands under shoulders, body straight; lower chest to floor, press back up."],
  ["Incline Push-Up", "CHEST", "BODYWEIGHT", "BEGINNER", 3.5, "Hands on a bench or step; perform a push-up with a straight body."],
  ["Dumbbell Bench Press", "CHEST", "DUMBBELLS", "INTERMEDIATE", 5.0, "Lie on a bench, press dumbbells from chest to lockout, lower with control."],
  ["Barbell Bench Press", "CHEST", "BARBELL", "INTERMEDIATE", 5.0, "Grip slightly wider than shoulders, lower bar to mid-chest, press up."],
  ["Dumbbell Fly", "CHEST", "DUMBBELLS", "INTERMEDIATE", 3.5, "Arms slightly bent, open wide until a chest stretch, squeeze back together."],
  ["Chest Press Machine", "CHEST", "MACHINE", "BEGINNER", 4.0, "Adjust seat so handles are at chest height; press forward and return slowly."],
  // Back
  ["Bodyweight Row", "BACK", "BODYWEIGHT", "BEGINNER", 4.0, "Hang under a bar or table edge, pull chest to the bar, lower slowly."],
  ["Dumbbell Row", "BACK", "DUMBBELLS", "BEGINNER", 4.5, "One hand on bench, pull dumbbell to hip, keep back flat."],
  ["Lat Pulldown", "BACK", "MACHINE", "BEGINNER", 4.0, "Pull the bar to the upper chest, elbows down and back, control the return."],
  ["Pull-Up", "BACK", "BODYWEIGHT", "ADVANCED", 8.0, "Overhand grip, pull chin above the bar, lower fully."],
  ["Barbell Deadlift", "BACK", "BARBELL", "ADVANCED", 6.0, "Hinge at hips, flat back, drive through the floor to stand tall."],
  ["Seated Cable Row", "BACK", "MACHINE", "BEGINNER", 4.0, "Sit tall, pull handle to stomach, squeeze shoulder blades."],
  ["Band Pull-Apart", "BACK", "BANDS", "BEGINNER", 3.0, "Hold band at shoulder height, pull apart until arms are wide."],
  // Shoulders
  ["Dumbbell Shoulder Press", "SHOULDERS", "DUMBBELLS", "BEGINNER", 4.5, "Press dumbbells overhead from shoulder height, avoid arching back."],
  ["Lateral Raise", "SHOULDERS", "DUMBBELLS", "BEGINNER", 3.0, "Raise arms out to the side to shoulder height, lower slowly."],
  ["Pike Push-Up", "SHOULDERS", "BODYWEIGHT", "INTERMEDIATE", 4.0, "Hips high in an inverted V, lower head toward floor, press back up."],
  ["Face Pull", "SHOULDERS", "BANDS", "BEGINNER", 3.0, "Pull band toward face with elbows high, squeeze rear delts."],
  ["Overhead Press", "SHOULDERS", "BARBELL", "INTERMEDIATE", 5.0, "Bar at collarbone, press overhead to lockout, lower under control."],
  // Arms
  ["Dumbbell Bicep Curl", "ARMS", "DUMBBELLS", "BEGINNER", 3.0, "Curl dumbbells with elbows pinned to sides, lower slowly."],
  ["Tricep Dip", "ARMS", "BODYWEIGHT", "INTERMEDIATE", 4.0, "Hands on a bench behind you, lower until elbows at 90°, press up."],
  ["Hammer Curl", "ARMS", "DUMBBELLS", "BEGINNER", 3.0, "Neutral grip curl, keep wrists straight."],
  ["Overhead Tricep Extension", "ARMS", "DUMBBELLS", "BEGINNER", 3.0, "Hold one dumbbell overhead, lower behind head, extend."],
  ["Band Curl", "ARMS", "BANDS", "BEGINNER", 3.0, "Stand on band, curl handles up with elbows fixed."],
  // Legs / glutes
  ["Bodyweight Squat", "LEGS", "BODYWEIGHT", "BEGINNER", 5.0, "Feet shoulder-width, sit hips back and down, chest up, drive up."],
  ["Goblet Squat", "LEGS", "DUMBBELLS", "BEGINNER", 5.5, "Hold a dumbbell at chest, squat deep keeping elbows inside knees."],
  ["Barbell Back Squat", "LEGS", "BARBELL", "INTERMEDIATE", 6.0, "Bar on upper back, squat to parallel or below, stand tall."],
  ["Walking Lunge", "LEGS", "BODYWEIGHT", "BEGINNER", 5.0, "Step forward, lower back knee toward floor, alternate legs."],
  ["Romanian Deadlift", "LEGS", "DUMBBELLS", "INTERMEDIATE", 5.0, "Soft knees, hinge at hips, lower weights along legs, squeeze glutes up."],
  ["Leg Press", "LEGS", "MACHINE", "BEGINNER", 5.0, "Feet shoulder-width on platform, lower to 90°, press without locking knees."],
  ["Glute Bridge", "GLUTES", "BODYWEIGHT", "BEGINNER", 3.5, "Lie on back, drive hips up squeezing glutes, lower slowly."],
  ["Hip Thrust", "GLUTES", "BARBELL", "INTERMEDIATE", 5.0, "Upper back on bench, bar across hips, thrust hips to full extension."],
  ["Kettlebell Swing", "GLUTES", "KETTLEBELL", "INTERMEDIATE", 9.0, "Hinge and swing the bell to chest height using hip drive."],
  ["Calf Raise", "LEGS", "BODYWEIGHT", "BEGINNER", 3.0, "Rise onto toes, pause, lower heels below step level."],
  ["Bulgarian Split Squat", "LEGS", "DUMBBELLS", "ADVANCED", 6.0, "Rear foot on bench, lower front knee to 90°, drive up."],
  // Core
  ["Plank", "CORE", "BODYWEIGHT", "BEGINNER", 3.0, "Forearms on floor, body straight from head to heels, brace."],
  ["Dead Bug", "CORE", "BODYWEIGHT", "BEGINNER", 3.0, "On back, extend opposite arm and leg while keeping lower back flat."],
  ["Bicycle Crunch", "CORE", "BODYWEIGHT", "BEGINNER", 4.0, "Alternate elbow to opposite knee with a slow twist."],
  ["Russian Twist", "CORE", "BODYWEIGHT", "INTERMEDIATE", 4.0, "Seated, lean back, rotate torso side to side."],
  ["Hanging Knee Raise", "CORE", "BODYWEIGHT", "ADVANCED", 5.0, "Hang from a bar, raise knees to chest with control."],
  ["Mountain Climber", "CORE", "BODYWEIGHT", "BEGINNER", 8.0, "In a plank, drive knees toward chest alternately at pace."],
  // Full body / cardio
  ["Burpee", "FULL_BODY", "BODYWEIGHT", "INTERMEDIATE", 8.0, "Squat, kick feet back, push-up, jump feet in, jump up."],
  ["Kettlebell Clean and Press", "FULL_BODY", "KETTLEBELL", "ADVANCED", 8.0, "Clean bell to rack position, press overhead, lower and repeat."],
  ["Jumping Jacks", "CARDIO", "BODYWEIGHT", "BEGINNER", 7.0, "Jump feet wide while raising arms overhead, return."],
  ["Brisk Walk", "CARDIO", "BODYWEIGHT", "BEGINNER", 4.3, "Walk at a pace where talking is possible but singing is not."],
  ["Jog / Run", "CARDIO", "BODYWEIGHT", "INTERMEDIATE", 9.8, "Steady-state running at a conversational to moderate pace."],
  ["Stationary Bike", "CARDIO", "CARDIO_MACHINE", "BEGINNER", 6.8, "Cycle at moderate resistance keeping a steady cadence."],
  ["Rowing Machine", "CARDIO", "CARDIO_MACHINE", "INTERMEDIATE", 7.0, "Drive with legs, then lean back, then pull; reverse on return."],
  ["Jump Rope", "CARDIO", "BODYWEIGHT", "INTERMEDIATE", 11.0, "Skip with small hops, elbows tucked, wrists turning the rope."],
];

type Template = {
  name: string;
  description: string;
  goal: FitnessGoal;
  experience: Experience;
  daysPerWeek: number;
  structure: { title: string; focus: MuscleGroup; exerciseNames: string[] }[];
};

const templates: Template[] = [
  {
    name: "Beginner Full Body (3-day)",
    description: "Three full-body sessions per week to build a base of strength and movement quality.",
    goal: "IMPROVE_FITNESS",
    experience: "BEGINNER",
    daysPerWeek: 3,
    structure: [
      { title: "Full Body A", focus: "FULL_BODY", exerciseNames: ["Bodyweight Squat", "Push-Up", "Bodyweight Row", "Glute Bridge", "Plank"] },
      { title: "Full Body B", focus: "FULL_BODY", exerciseNames: ["Walking Lunge", "Incline Push-Up", "Dumbbell Row", "Dead Bug", "Brisk Walk"] },
      { title: "Full Body C", focus: "FULL_BODY", exerciseNames: ["Goblet Squat", "Dumbbell Shoulder Press", "Band Pull-Apart", "Bicycle Crunch", "Jumping Jacks"] },
    ],
  },
  {
    name: "Fat Loss Circuit (4-day)",
    description: "Alternating strength circuits and cardio to maximise calorie burn while preserving muscle.",
    goal: "LOSE_WEIGHT",
    experience: "BEGINNER",
    daysPerWeek: 4,
    structure: [
      { title: "Lower Body Circuit", focus: "LEGS", exerciseNames: ["Goblet Squat", "Walking Lunge", "Glute Bridge", "Calf Raise", "Mountain Climber"] },
      { title: "Cardio Intervals", focus: "CARDIO", exerciseNames: ["Jumping Jacks", "Jog / Run", "Jump Rope"] },
      { title: "Upper Body Circuit", focus: "FULL_BODY", exerciseNames: ["Push-Up", "Dumbbell Row", "Lateral Raise", "Dumbbell Bicep Curl", "Plank"] },
      { title: "Steady Cardio + Core", focus: "CARDIO", exerciseNames: ["Brisk Walk", "Bicycle Crunch", "Dead Bug", "Russian Twist"] },
    ],
  },
  {
    name: "Muscle Building Upper/Lower (4-day)",
    description: "Classic upper/lower split with progressive overload for hypertrophy.",
    goal: "GAIN_MUSCLE",
    experience: "INTERMEDIATE",
    daysPerWeek: 4,
    structure: [
      { title: "Upper Strength", focus: "CHEST", exerciseNames: ["Barbell Bench Press", "Dumbbell Row", "Overhead Press", "Lat Pulldown", "Hammer Curl"] },
      { title: "Lower Strength", focus: "LEGS", exerciseNames: ["Barbell Back Squat", "Romanian Deadlift", "Leg Press", "Calf Raise", "Plank"] },
      { title: "Upper Hypertrophy", focus: "BACK", exerciseNames: ["Dumbbell Bench Press", "Seated Cable Row", "Lateral Raise", "Dumbbell Fly", "Overhead Tricep Extension"] },
      { title: "Lower Hypertrophy", focus: "GLUTES", exerciseNames: ["Hip Thrust", "Bulgarian Split Squat", "Goblet Squat", "Kettlebell Swing", "Hanging Knee Raise"] },
    ],
  },
  {
    name: "Push / Pull / Legs (6-day)",
    description: "High-frequency split for experienced lifters who train most days.",
    goal: "GAIN_MUSCLE",
    experience: "ADVANCED",
    daysPerWeek: 6,
    structure: [
      { title: "Push A", focus: "CHEST", exerciseNames: ["Barbell Bench Press", "Overhead Press", "Dumbbell Fly", "Lateral Raise", "Tricep Dip"] },
      { title: "Pull A", focus: "BACK", exerciseNames: ["Barbell Deadlift", "Pull-Up", "Seated Cable Row", "Face Pull", "Dumbbell Bicep Curl"] },
      { title: "Legs A", focus: "LEGS", exerciseNames: ["Barbell Back Squat", "Romanian Deadlift", "Walking Lunge", "Calf Raise", "Plank"] },
      { title: "Push B", focus: "SHOULDERS", exerciseNames: ["Dumbbell Shoulder Press", "Dumbbell Bench Press", "Pike Push-Up", "Lateral Raise", "Overhead Tricep Extension"] },
      { title: "Pull B", focus: "BACK", exerciseNames: ["Lat Pulldown", "Dumbbell Row", "Band Pull-Apart", "Hammer Curl", "Hanging Knee Raise"] },
      { title: "Legs B", focus: "GLUTES", exerciseNames: ["Hip Thrust", "Bulgarian Split Squat", "Leg Press", "Kettlebell Swing", "Bicycle Crunch"] },
    ],
  },
  {
    name: "Maintenance Mix (3-day)",
    description: "Balanced strength and cardio to maintain weight and fitness with minimal time.",
    goal: "MAINTAIN",
    experience: "INTERMEDIATE",
    daysPerWeek: 3,
    structure: [
      { title: "Strength Day", focus: "FULL_BODY", exerciseNames: ["Goblet Squat", "Dumbbell Bench Press", "Dumbbell Row", "Romanian Deadlift", "Plank"] },
      { title: "Cardio Day", focus: "CARDIO", exerciseNames: ["Jog / Run", "Rowing Machine", "Jump Rope"] },
      { title: "Conditioning Day", focus: "FULL_BODY", exerciseNames: ["Kettlebell Swing", "Burpee", "Walking Lunge", "Push-Up", "Russian Twist"] },
    ],
  },
];

async function main() {
  console.log("Seeding exercises…");
  for (const [name, muscleGroup, equipment, difficulty, metValue, instructions] of [...exercises, ...(EXERCISES2 as unknown as Ex[])]) {
    await db.exercise.upsert({
      where: { name },
      update: { muscleGroup, equipment, difficulty, metValue, instructions },
      create: { name, muscleGroup, equipment, difficulty, metValue, instructions },
    });
  }

  console.log("Seeding foods…");
  for (const f of [...FOODS, ...FOODS2]) {
    const [name, category, tags, servingLabel, servingGrams, calories, proteinG, carbsG, fatG, fiberG, sugarG, healthScore, flags, healthNote, swaps] = f;
    const data = {
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      servingLabel,
      servingGrams,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      healthScore,
      healthNote: healthNote ?? null,
      swaps: swaps ? swaps.split(",").map((s) => s.trim()).filter(Boolean) : [],
      isVegetarian: flags.includes("V"),
      isVegan: flags.includes("v"),
      isGlutenFree: flags.includes("G"),
    };
    await db.foodItem.upsert({ where: { name }, update: data, create: { name, ...data } });
  }

  console.log("Seeding plan templates…");
  for (const t of templates) {
    const { name, ...rest } = t;
    await db.planTemplate.upsert({ where: { name }, update: rest, create: { name, ...rest } });
  }

  const [ex, fo, te] = await Promise.all([db.exercise.count(), db.foodItem.count(), db.planTemplate.count()]);
  console.log(`Done. Exercises: ${ex}, Foods: ${fo}, Templates: ${te}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
