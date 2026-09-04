import type { ActivityLevel, FitnessGoal, Sex } from "@/generated/prisma/enums";

export type NutritionInput = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
};

export type NutritionResult = {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  bmi: number;
  bmiCategory: string;
  goalAdjustmentPct: number;
};

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_ADJUSTMENT: Record<FitnessGoal, number> = {
  LOSE_WEIGHT: -0.2,
  MAINTAIN: 0,
  GAIN_MUSCLE: 0.1,
  IMPROVE_FITNESS: 0,
};

const PROTEIN_G_PER_KG: Record<FitnessGoal, number> = {
  LOSE_WEIGHT: 2.0,
  MAINTAIN: 1.6,
  GAIN_MUSCLE: 1.8,
  IMPROVE_FITNESS: 1.6,
};

const FAT_RATIO = 0.28; // share of calories from fat

/** Mifflin-St Jeor basal metabolic rate. */
export function calcBmr({ age, sex, heightCm, weightKg }: Pick<NutritionInput, "age" | "sex" | "heightCm" | "weightKg">) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const offset = sex === "MALE" ? 5 : sex === "FEMALE" ? -161 : -78;
  return Math.round(base + offset);
}

export function calcBmi(heightCm: number, weightKg: number) {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obese range";
}

export function calcNutrition(input: NutritionInput): NutritionResult {
  const bmr = calcBmr(input);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[input.activityLevel]);
  const adj = GOAL_ADJUSTMENT[input.goal];

  // Safety floors for a deficit: never prescribe below commonly cited minimums.
  const floor = input.sex === "MALE" ? 1500 : 1200;
  let calories = Math.round(tdee * (1 + adj));
  if (adj < 0) calories = Math.max(calories, floor);
  calories = Math.round(calories / 10) * 10;

  // Protein by body weight, capped at 35% of calories.
  let proteinG = Math.round(input.weightKg * PROTEIN_G_PER_KG[input.goal]);
  proteinG = Math.min(proteinG, Math.round((calories * 0.35) / 4));

  const fatG = Math.round((calories * FAT_RATIO) / 9);
  const carbsG = Math.max(50, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  const waterMl = Math.round((input.weightKg * 35) / 50) * 50;
  const bmi = calcBmi(input.heightCm, input.weightKg);

  return {
    bmr,
    tdee,
    calories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
    bmi,
    bmiCategory: bmiCategory(bmi),
    goalAdjustmentPct: Math.round(adj * 100),
  };
}
