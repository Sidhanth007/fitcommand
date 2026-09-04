import "server-only";
import { db } from "@/lib/db";
import { dayRange, shiftDayKey } from "@/lib/dates";
import type { FoodItem, MealLog, Profile } from "@/generated/prisma/client";
import type { MealType } from "@/generated/prisma/enums";

export const MEAL_TYPES: { value: MealType; label: string; share: number }[] = [
  { value: "BREAKFAST", label: "Breakfast", share: 0.25 },
  { value: "LUNCH", label: "Lunch", share: 0.35 },
  { value: "DINNER", label: "Dinner", share: 0.3 },
  { value: "SNACK", label: "Snacks", share: 0.1 },
];

export type DayTotals = { calories: number; proteinG: number; carbsG: number; fatG: number };
export type Targets = { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };

export async function getDayNutrition(userId: string, dayKey: string) {
  const { start, end } = dayRange(dayKey);
  const [meals, progress] = await Promise.all([
    db.mealLog.findMany({ where: { userId, eatenAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } }),
    db.progressEntry.findUnique({ where: { userId_date: { userId, date: start } }, select: { waterMl: true } }),
  ]);
  return { meals, totals: sumTotals(meals), waterMl: progress?.waterMl ?? 0 };
}

export function sumTotals(meals: Pick<MealLog, "calories" | "proteinG" | "carbsG" | "fatG">[]): DayTotals {
  return meals.reduce<DayTotals>(
    (a, m) => ({ calories: a.calories + m.calories, proteinG: a.proteinG + m.proteinG, carbsG: a.carbsG + m.carbsG, fatG: a.fatG + m.fatG }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Calories per day for the last `days` days ending at todayKey (inclusive). */
export async function getCaloriesByDay(userId: string, todayKey: string, days = 7) {
  const firstKey = shiftDayKey(todayKey, -(days - 1));
  const { start } = dayRange(firstKey);
  const { end } = dayRange(todayKey);
  const meals = await db.mealLog.findMany({ where: { userId, eatenAt: { gte: start, lt: end } }, select: { eatenAt: true, calories: true, proteinG: true } });
  const keys = Array.from({ length: days }, (_, i) => shiftDayKey(firstKey, i));
  const map = new Map(keys.map((k) => [k, { dayKey: k, calories: 0, proteinG: 0 }]));
  for (const m of meals) {
    // eatenAt is stored at local noon, so the UTC date string may differ; match by range instead.
    for (const k of keys) {
      const r = dayRange(k);
      if (m.eatenAt >= r.start && m.eatenAt < r.end) {
        const e = map.get(k)!;
        e.calories += m.calories;
        e.proteinG += m.proteinG;
        break;
      }
    }
  }
  return keys.map((k) => map.get(k)!);
}

// ───────────────────────────── Personal lists ─────────────────────────────

export async function getFavoriteFoodIds(userId: string) {
  const rows = await db.favoriteFood.findMany({ where: { userId }, select: { foodItemId: true } });
  return rows.map((r) => r.foodItemId);
}

/** Recently and frequently logged library foods (last 60 days). */
export async function getRecentAndFrequent(userId: string) {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const logs = await db.mealLog.findMany({
    where: { userId, foodItemId: { not: null }, eatenAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { foodItemId: true },
    take: 400,
  });
  const recent: string[] = [];
  const counts = new Map<string, number>();
  for (const l of logs) {
    const id = l.foodItemId!;
    if (!recent.includes(id) && recent.length < 12) recent.push(id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const frequent = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);
  return { recent, frequent };
}

export function getMealTemplates(userId: string) {
  return db.mealTemplate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export type TemplateItem = { foodItemId: string | null; name: string; servings: number; calories: number; proteinG: number; carbsG: number; fatG: number; healthScore: number | null };

// ───────────────────────────── Diet filtering ─────────────────────────────

const FISH = ["Salmon", "Tuna", "Shrimp", "Fish"];
const ALLERGY_MAP: Record<string, (f: FoodItem) => boolean> = {
  peanut: (f) => /peanut/i.test(f.name),
  nut: (f) => /almond|walnut|peanut|cashew/i.test(f.name),
  dairy: (f) => f.category === "Dairy" || /paneer|cheese|butter|whey|yogurt|milk|lassi|kheer|barfi|raita|dahi|curd|ghee/i.test(f.name),
  lactose: (f) => f.category === "Dairy" || /paneer|cheese|whey|yogurt|milk|lassi|kheer|raita|dahi|curd/i.test(f.name),
  milk: (f) => /milk|whey|yogurt|cheese|lassi|kheer|chai \(milk|bournvita/i.test(f.name),
  egg: (f) => /egg/i.test(f.name),
  shellfish: (f) => /shrimp/i.test(f.name),
  fish: (f) => new RegExp(FISH.join("|"), "i").test(f.name),
  soy: (f) => /soy|tofu|tempeh|edamame/i.test(f.name),
  gluten: (f) => !f.isGlutenFree,
  wheat: (f) => !f.isGlutenFree,
};

/** Apply dietary preference, allergies and dislikes to the food library. */
export function filterFoodsForProfile(foods: FoodItem[], profile: Pick<Profile, "dietaryPreference" | "allergies" | "dislikedFoods">) {
  const pref = profile.dietaryPreference;
  const allergies = profile.allergies.map((a) => a.toLowerCase());
  const dislikes = profile.dislikedFoods.map((d) => d.toLowerCase());

  return foods.filter((f) => {
    if (!f.isActive) return false;
    switch (pref) {
      case "VEGAN":
        if (!f.isVegan) return false;
        break;
      case "VEGETARIAN":
        if (!f.isVegetarian) return false;
        break;
      case "PESCATARIAN":
        if (!f.isVegetarian && !FISH.some((n) => f.name.includes(n))) return false;
        break;
      case "GLUTEN_FREE":
        if (!f.isGlutenFree) return false;
        break;
      case "KETO":
        if (["Grains", "Legumes", "Breads", "Sweets"].includes(f.category) || (f.carbsG / f.servingGrams) * 100 > 15) return false;
        break;
      case "PALEO":
        if (["Grains", "Legumes", "Dairy", "Breads", "Sweets"].includes(f.category) || /peanut|protein powder|protein bar|rice cake|biscuit|maggi/i.test(f.name)) return false;
        break;
      default:
        break;
    }
    for (const a of allergies) {
      const rule = Object.entries(ALLERGY_MAP).find(([k]) => a.includes(k))?.[1];
      if (rule ? rule(f) : f.name.toLowerCase().includes(a)) return false;
    }
    for (const d of dislikes) {
      if (d && f.name.toLowerCase().includes(d)) return false;
    }
    return true;
  });
}

export async function getAllFoods() {
  return db.foodItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getFoodsForProfile(profile: Pick<Profile, "dietaryPreference" | "allergies" | "dislikedFoods">) {
  return filterFoodsForProfile(await getAllFoods(), profile);
}

// ───────────────────────────── Health insights ─────────────────────────────

export type Insight = { tone: "warn" | "good" | "info"; title: string; text: string; swaps?: string[] };

export function healthLabel(score: number | null | undefined): { label: string; tone: "warn" | "ok" | "good" } | null {
  if (score == null) return null;
  if (score <= 2) return { label: score === 1 ? "Treat" : "Occasional", tone: "warn" };
  if (score >= 4) return { label: score === 5 ? "Great pick" : "Good", tone: "good" };
  return { label: "Okay", tone: "ok" };
}

/** Rule-based, plain-language feedback on what was logged for the day. */
export function buildInsights(meals: MealLog[], totals: DayTotals, target: Targets, foodsById: Map<string, FoodItem>): Insight[] {
  const out: Insight[] = [];
  if (meals.length === 0) {
    return [{ tone: "info", title: "Nothing logged yet", text: "Log your meals and I'll point out what's working and what could be swapped." }];
  }

  const flagged = new Map<string, { food: FoodItem; servings: number }>();
  let hasTea = false;
  let hasBiscuit = false;
  let sugarG = 0;
  let friedCount = 0;
  let goodCount = 0;

  for (const m of meals) {
    const food = m.foodItemId ? foodsById.get(m.foodItemId) : undefined;
    const score = m.healthScore ?? food?.healthScore ?? null;
    if (food) {
      sugarG += food.sugarG * m.servings;
      if (food.tags.includes("Tea") || food.tags.includes("Coffee")) hasTea = hasTea || (food.healthScore <= 2);
      if (food.tags.includes("Biscuits")) hasBiscuit = true;
      if (food.tags.includes("Fried")) friedCount += 1;
    }
    if (score != null && score <= 2 && food) {
      const e = flagged.get(food.id);
      flagged.set(food.id, { food, servings: (e?.servings ?? 0) + m.servings });
    }
    if (score != null && score >= 4) goodCount += 1;
  }

  if (hasTea && hasBiscuit) {
    out.push({
      tone: "warn",
      title: "Chai + biscuits pattern",
      text: "Sweet tea with biscuits is refined flour and sugar twice over. Keep the chai, skip the sugar, and pair it with something with protein or fibre.",
      swaps: ["Chai (no sugar)", "Roasted Chana", "Makhana (roasted)", "Peanuts (roasted)"],
    });
  }

  for (const { food, servings } of [...flagged.values()].slice(0, 4)) {
    if (hasTea && hasBiscuit && (food.tags.includes("Biscuits") || food.tags.includes("Tea"))) continue;
    out.push({
      tone: "warn",
      title: `${food.name}${servings !== 1 ? ` × ${servings}` : ""} — ${food.healthScore === 1 ? "treat food" : "occasional food"}`,
      text: food.healthNote ?? "Low nutrient density for its calories.",
      swaps: food.swaps,
    });
  }

  if (friedCount >= 2) {
    out.push({ tone: "warn", title: "Several fried items today", text: "Fried foods add a lot of calories for their size. Try to keep it to one fried item a day and go for steamed or roasted options otherwise." });
  }

  if (sugarG > 50) {
    out.push({ tone: "warn", title: `About ${Math.round(sugarG)} g of sugar so far`, text: "That's above the ~25–30 g a day most guidelines suggest for added sugar. Sweetened drinks and sweets are usually the biggest source." });
  }

  const proteinPct = target.proteinG ? totals.proteinG / target.proteinG : 0;
  if (proteinPct < 0.5 && totals.calories > target.calories * 0.5) {
    out.push({
      tone: "warn",
      title: "Protein is lagging behind calories",
      text: `You've had ${Math.round(totals.proteinG)} g of ${target.proteinG} g protein but over half your calories. Add a protein source to your next meal.`,
      swaps: ["Dal Tadka", "Paneer Bhurji", "Egg Bhurji", "Soya Chunks (cooked)", "Greek Yogurt (0%)", "Chicken Tikka"],
    });
  } else if (proteinPct >= 0.9) {
    out.push({ tone: "good", title: "Protein target hit", text: "Great — protein helps recovery and keeps you full." });
  }

  if (totals.calories > target.calories * 1.1) {
    out.push({ tone: "warn", title: "Over today's calorie target", text: `About ${Math.round(totals.calories - target.calories)} kcal over. One day won't undo progress — just don't let it become the pattern.` });
  }

  if (goodCount >= 3 && flagged.size === 0) {
    out.push({ tone: "good", title: "Solid choices today", text: `${goodCount} of your logged items are high-quality everyday foods. Keep it up.` });
  }

  if (out.length === 0) out.push({ tone: "info", title: "Looking balanced", text: "Nothing to flag so far. Keep logging through the day for a full picture." });
  return out;
}

// ───────────────────────────── Recommendations ─────────────────────────────

export type Recommendation = {
  mealType: MealType;
  label: string;
  title: string;
  items: { food: FoodItem; servings: number }[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type Combo = { title: string; items: [name: string, servings?: number][] };

const COMBOS: Record<MealType, Combo[]> = {
  BREAKFAST: [
    { title: "South Indian classic", items: [["Idli", 1.5], ["Sambar"], ["Coconut Chutney"]] },
    { title: "Poha & chaas", items: [["Poha"], ["Chaas (buttermilk)"]] },
    { title: "Egg bhurji & roti", items: [["Egg Bhurji"], ["Roti (chapati)", 2]] },
    { title: "Oats, milk & banana", items: [["Rolled Oats (dry)"], ["Skim Milk"], ["Banana"]] },
    { title: "Sprouts & unsweetened chai", items: [["Sprouts (moong, raw)", 1.5], ["Chai (no sugar)"]] },
    { title: "Upma & dahi", items: [["Upma"], ["Dahi (curd)"]] },
    { title: "Dhokla & mint chutney", items: [["Dhokla"], ["Mint Chutney"], ["Green Tea"]] },
    { title: "Daliya & curd", items: [["Daliya (broken wheat, cooked)"], ["Dahi (curd)"]] },
    { title: "Greek yogurt bowl", items: [["Greek Yogurt (0%)"], ["Blueberries"], ["Almonds"]] },
  ],
  LUNCH: [
    { title: "Dal, roti, sabzi & dahi", items: [["Dal Tadka"], ["Roti (chapati)", 2], ["Mixed Vegetable Sabzi"], ["Dahi (curd)"]] },
    { title: "Rajma chawal", items: [["Rajma (kidney bean curry)"], ["White Rice (cooked)"], ["Kachumber Salad"]] },
    { title: "Chicken curry & roti", items: [["Chicken Curry (home-style)"], ["Roti (chapati)", 2], ["Kachumber Salad"]] },
    { title: "Chole & jeera rice", items: [["Chole (chickpea curry)"], ["Jeera Rice"], ["Raita (cucumber)"]] },
    { title: "Khichdi & papad", items: [["Khichdi"], ["Dahi (curd)"], ["Papad (roasted)"]] },
    { title: "Fish curry & rice", items: [["Fish Curry"], ["White Rice (cooked)"], ["Kachumber Salad"]] },
    { title: "Grilled chicken salad", items: [["Chicken Breast (cooked)", 1.5], ["Mixed Salad Greens", 2], ["Olive Oil"]] },
    { title: "Tofu & quinoa bowl", items: [["Tofu (firm)", 1.5], ["Quinoa (cooked)", 1.5], ["Broccoli"]] },
  ],
  DINNER: [
    { title: "Palak paneer & roti", items: [["Palak Paneer"], ["Roti (chapati)", 2], ["Kachumber Salad"]] },
    { title: "Tandoori chicken & sabzi", items: [["Tandoori Chicken"], ["Mixed Vegetable Sabzi"], ["Roti (chapati)"]] },
    { title: "Light idli sambar", items: [["Idli", 1.5], ["Sambar", 1.5]] },
    { title: "Dal, jowar roti & bhindi", items: [["Dal Tadka"], ["Jowar Roti", 2], ["Bhindi Masala"]] },
    { title: "Egg curry & roti", items: [["Egg Curry"], ["Roti (chapati)", 2]] },
    { title: "Soya chunks & roti", items: [["Soya Chunks (cooked)"], ["Roti (chapati)", 2], ["Kachumber Salad"]] },
    { title: "Paneer bhurji & raita", items: [["Paneer Bhurji"], ["Roti (chapati)", 2], ["Raita (cucumber)"]] },
    { title: "Salmon & sweet potato", items: [["Salmon (cooked)", 1.5], ["Sweet Potato (baked)", 1.5], ["Broccoli"]] },
  ],
  SNACK: [
    { title: "Roasted chana & chai", items: [["Roasted Chana"], ["Chai (no sugar)"]] },
    { title: "Makhana & green tea", items: [["Makhana (roasted)"], ["Green Tea"]] },
    { title: "Fruit chaat", items: [["Fruit Chaat"]] },
    { title: "Peanuts & chaas", items: [["Peanuts (roasted)"], ["Chaas (buttermilk)"]] },
    { title: "Sprouts & nimbu pani", items: [["Sprouts (moong, raw)"], ["Nimbu Pani (no sugar)"]] },
    { title: "Apple & almonds", items: [["Apple"], ["Almonds"]] },
    { title: "Curd & guava", items: [["Dahi (curd)"], ["Guava"]] },
  ],
};

function hashKey(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Meal ideas built from wholesome combos (health score ≥ 3), sized to the remaining
 * calories and rotated daily. Only combos whose items all pass the user's diet filter are used.
 */
export function buildRecommendations(foods: FoodItem[], target: Targets, consumed: DayTotals, dayKey: string, loggedTypes: Set<MealType>): Recommendation[] {
  const remainingKcal = Math.max(0, target.calories - consumed.calories);
  if (remainingKcal < 120) return [];
  const byName = new Map(foods.filter((f) => f.healthScore >= 3).map((f) => [f.name, f]));
  const seed = hashKey(dayKey);
  const out: Recommendation[] = [];

  MEAL_TYPES.forEach((mt, idx) => {
    if (loggedTypes.has(mt.value) && mt.value !== "SNACK") return; // already eaten that meal
    const budget = Math.min(remainingKcal, Math.max(150, target.calories * mt.share));
    const eligible = COMBOS[mt.value].filter((c) => c.items.every(([n]) => byName.has(n)));
    if (eligible.length === 0) return;
    const combo = eligible[(seed + idx * 7) % eligible.length]!;
    const parts = combo.items.map(([n, s]) => ({ food: byName.get(n)!, servings: s ?? 1 }));

    let kcal = parts.reduce((a, x) => a + x.food.calories * x.servings, 0);
    if (kcal > budget * 1.15) {
      const factor = budget / kcal;
      for (const x of parts) x.servings = Math.max(0.5, Math.round(x.servings * factor * 2) / 2);
      kcal = parts.reduce((a, x) => a + x.food.calories * x.servings, 0);
    }
    out.push({
      mealType: mt.value,
      label: mt.label,
      title: combo.title,
      items: parts,
      calories: Math.round(kcal),
      proteinG: Math.round(parts.reduce((a, x) => a + x.food.proteinG * x.servings, 0)),
      carbsG: Math.round(parts.reduce((a, x) => a + x.food.carbsG * x.servings, 0)),
      fatG: Math.round(parts.reduce((a, x) => a + x.food.fatG * x.servings, 0)),
    });
  });
  return out;
}
