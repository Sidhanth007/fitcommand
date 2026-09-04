import { describe, expect, it } from "vitest";
import { bmiCategory, calcBmi, calcBmr, calcNutrition } from "./nutrition";

describe("nutrition engine", () => {
  it("computes Mifflin-St Jeor BMR for men and women", () => {
    expect(calcBmr({ age: 30, sex: "MALE", heightCm: 178, weightKg: 82 })).toBe(1788);
    expect(calcBmr({ age: 26, sex: "FEMALE", heightCm: 165, weightKg: 58 })).toBe(1320);
  });

  it("applies a 20% deficit for weight loss but never below the safety floor", () => {
    const r = calcNutrition({ age: 30, sex: "MALE", heightCm: 178, weightKg: 82, activityLevel: "MODERATE", goal: "LOSE_WEIGHT" });
    expect(r.tdee).toBe(2771);
    expect(r.calories).toBe(2220);
    const tiny = calcNutrition({ age: 60, sex: "FEMALE", heightCm: 150, weightKg: 45, activityLevel: "SEDENTARY", goal: "LOSE_WEIGHT" });
    expect(tiny.calories).toBeGreaterThanOrEqual(1200);
  });

  it("gives a surplus for muscle gain and keeps macros consistent with calories", () => {
    const r = calcNutrition({ age: 26, sex: "FEMALE", heightCm: 165, weightKg: 58, activityLevel: "LIGHT", goal: "GAIN_MUSCLE" });
    expect(r.goalAdjustmentPct).toBe(10);
    expect(r.calories).toBeGreaterThan(r.tdee);
    const kcalFromMacros = r.proteinG * 4 + r.carbsG * 4 + r.fatG * 9;
    expect(Math.abs(kcalFromMacros - r.calories)).toBeLessThan(60);
  });

  it("caps protein at 35% of calories", () => {
    const r = calcNutrition({ age: 40, sex: "MALE", heightCm: 190, weightKg: 140, activityLevel: "SEDENTARY", goal: "LOSE_WEIGHT" });
    expect(r.proteinG * 4).toBeLessThanOrEqual(r.calories * 0.35 + 4);
  });

  it("classifies BMI", () => {
    expect(calcBmi(178, 82)).toBe(25.9);
    expect(bmiCategory(18)).toBe("Underweight");
    expect(bmiCategory(22)).toBe("Healthy range");
    expect(bmiCategory(27)).toBe("Overweight");
    expect(bmiCategory(31)).toBe("Obese range");
  });
});
