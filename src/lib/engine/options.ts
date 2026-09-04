import type {
  ActivityLevel,
  DietaryPreference,
  Equipment,
  Experience,
  FitnessGoal,
  MuscleGroup,
  Sex,
} from "@/generated/prisma/enums";

export type Option<T extends string> = { value: T; label: string; description?: string };

export const SEX_OPTIONS: Option<Sex>[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other / prefer not to say" },
];

export const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { value: "LOSE_WEIGHT", label: "Lose weight", description: "Moderate calorie deficit, preserve muscle" },
  { value: "MAINTAIN", label: "Maintain", description: "Hold weight, stay fit and strong" },
  { value: "GAIN_MUSCLE", label: "Gain muscle", description: "Slight surplus, progressive strength training" },
  { value: "IMPROVE_FITNESS", label: "Improve fitness", description: "Better conditioning and energy" },
];

export const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: "SEDENTARY", label: "Sedentary", description: "Desk job, little exercise" },
  { value: "LIGHT", label: "Lightly active", description: "Light exercise 1–3 days/week" },
  { value: "MODERATE", label: "Moderately active", description: "Exercise 3–5 days/week" },
  { value: "ACTIVE", label: "Very active", description: "Hard exercise 6–7 days/week" },
  { value: "VERY_ACTIVE", label: "Extremely active", description: "Physical job or twice-daily training" },
];

export const EXPERIENCE_OPTIONS: Option<Experience>[] = [
  { value: "BEGINNER", label: "Beginner", description: "New or returning after a long break" },
  { value: "INTERMEDIATE", label: "Intermediate", description: "Training consistently for 6+ months" },
  { value: "ADVANCED", label: "Advanced", description: "Several years of structured training" },
];

export const DIET_OPTIONS: Option<DietaryPreference>[] = [
  { value: "NONE", label: "No restrictions" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PESCATARIAN", label: "Pescatarian" },
  { value: "KETO", label: "Keto / low-carb" },
  { value: "PALEO", label: "Paleo" },
  { value: "HALAL", label: "Halal" },
  { value: "KOSHER", label: "Kosher" },
  { value: "GLUTEN_FREE", label: "Gluten-free" },
];

export const EQUIPMENT_OPTIONS: Option<Equipment>[] = [
  { value: "BODYWEIGHT", label: "Bodyweight only" },
  { value: "DUMBBELLS", label: "Dumbbells" },
  { value: "BARBELL", label: "Barbell & plates" },
  { value: "KETTLEBELL", label: "Kettlebell" },
  { value: "BANDS", label: "Resistance bands" },
  { value: "MACHINE", label: "Gym machines / cables" },
  { value: "CARDIO_MACHINE", label: "Cardio machines" },
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  LEGS: "Legs",
  GLUTES: "Glutes",
  CORE: "Core",
  FULL_BODY: "Full body",
  CARDIO: "Cardio",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Equipment, string>;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function labelOf<T extends string>(options: Option<T>[], value: T) {
  return options.find((o) => o.value === value)?.label ?? value;
}
