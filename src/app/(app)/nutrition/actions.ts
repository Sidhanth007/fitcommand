"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { dayAnchor, dayRange } from "@/lib/dates";
import { logFoodSchema, mealTypeSchema, quickAddSchema, waterSchema } from "@/lib/validators/tracking";
import type { TemplateItem } from "@/lib/tracking/nutrition";
import type { ActionState } from "@/lib/validators/auth";
import type { MealType } from "@/generated/prisma/enums";

function revalidate() {
  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
}

const round = (n: number) => Math.round(n * 10) / 10;
const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function logFoodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = logFoodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { dayKey, mealType, foodItemId, servings } = parsed.data;

  const food = await db.foodItem.findUnique({ where: { id: foodItemId } });
  if (!food || !food.isActive) return { error: "That food is no longer available." };

  await db.mealLog.create({
    data: {
      userId: user.id,
      foodItemId: food.id,
      name: food.name,
      mealType,
      servings,
      calories: round(food.calories * servings),
      proteinG: round(food.proteinG * servings),
      carbsG: round(food.carbsG * servings),
      fatG: round(food.fatG * servings),
      healthScore: food.healthScore,
      eatenAt: dayAnchor(dayKey),
    },
  });
  revalidate();
  const note = food.healthScore <= 2 && food.swaps.length ? ` Heads-up: it's a ${food.healthScore === 1 ? "treat" : "sometimes"} food — see insights for swaps.` : "";
  return { success: `Logged ${servings} × ${food.name}.${note}` };
}

export async function quickAddMealAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = quickAddSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const d = parsed.data;
  await db.mealLog.create({
    data: { userId: user.id, name: d.name, mealType: d.mealType, servings: 1, calories: d.calories, proteinG: d.proteinG, carbsG: d.carbsG, fatG: d.fatG, eatenAt: dayAnchor(d.dayKey) },
  });
  revalidate();
  return { success: `Logged ${d.name}.` };
}

export async function deleteMealAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.mealLog.deleteMany({ where: { id, userId: user.id } });
  revalidate();
  return { ok: r.count > 0 };
}

export async function addWaterAction(dayKey: string, deltaMl: number): Promise<{ ok: boolean; waterMl: number }> {
  const user = await requireUser();
  const parsed = waterSchema.safeParse({ dayKey, deltaMl });
  if (!parsed.success) return { ok: false, waterMl: 0 };
  const { start } = dayRange(parsed.data.dayKey);
  const existing = await db.progressEntry.findUnique({ where: { userId_date: { userId: user.id, date: start } }, select: { waterMl: true } });
  const next = Math.max(0, (existing?.waterMl ?? 0) + parsed.data.deltaMl);
  await db.progressEntry.upsert({
    where: { userId_date: { userId: user.id, date: start } },
    update: { waterMl: next },
    create: { userId: user.id, date: start, waterMl: next },
  });
  revalidate();
  return { ok: true, waterMl: next };
}

// ───────────────────────────── Describe a meal (AI) ─────────────────────────────

export async function parseMealDescriptionAction(text: string): Promise<{ ok: true; items: import("@/lib/ai/meal-parser").ParsedItem[] } | { ok: false; error: string }> {
  const user = await requireUser();
  const t = z.string().trim().min(3, "Describe the meal in a few words.").max(600).safeParse(text);
  if (!t.success) return { ok: false, error: t.error.issues[0]?.message ?? "Invalid text." };
  const { rateLimit } = await import("@/lib/rate-limit");
  const limit = rateLimit(`ai:meal:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: `Up to 10 AI meal parses per hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, error: "Complete onboarding first." };
  const { getFoodsForProfile } = await import("@/lib/tracking/nutrition");
  const { parseMealDescription } = await import("@/lib/ai/meal-parser");
  const { AiError } = await import("@/lib/ai/provider");
  try {
    const items = await parseMealDescription(user.id, t.data, await getFoodsForProfile(profile));
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: e instanceof AiError ? e.message : "Couldn't parse that right now." };
  }
}

const parsedItemSchema = z.object({
  foodItemId: z.string().nullable(),
  name: z.string().trim().min(1).max(80),
  servings: z.coerce.number().min(0.1).max(20),
  calories: z.coerce.number().min(0).max(5000),
  proteinG: z.coerce.number().min(0).max(500),
  carbsG: z.coerce.number().min(0).max(1000),
  fatG: z.coerce.number().min(0).max(500),
});

export async function logParsedItemsAction(dayKey: string, mealType: MealType, items: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const key = dayKeySchema.safeParse(dayKey);
  const mt = mealTypeSchema.safeParse(mealType);
  const list = z.array(parsedItemSchema).min(1).max(15).safeParse(items);
  if (!key.success || !mt.success || !list.success) return { ok: false, message: "Invalid items." };

  const ids = list.data.map((i) => i.foodItemId).filter((v): v is string => Boolean(v));
  const foods = ids.length ? await db.foodItem.findMany({ where: { id: { in: ids } } }) : [];
  const byId = new Map(foods.map((f) => [f.id, f]));

  await db.mealLog.createMany({
    data: list.data.map((i) => {
      const f = i.foodItemId ? byId.get(i.foodItemId) : undefined;
      // Recompute from the library when matched so client-side numbers can't drift.
      return {
        userId: user.id,
        foodItemId: f?.id ?? null,
        name: f?.name ?? i.name,
        mealType: mt.data,
        servings: i.servings,
        calories: f ? round(f.calories * i.servings) : round(i.calories),
        proteinG: f ? round(f.proteinG * i.servings) : round(i.proteinG),
        carbsG: f ? round(f.carbsG * i.servings) : round(i.carbsG),
        fatG: f ? round(f.fatG * i.servings) : round(i.fatG),
        healthScore: f?.healthScore ?? null,
        eatenAt: dayAnchor(key.data),
      };
    }),
  });
  revalidate();
  return { ok: true, message: `Logged ${list.data.length} item${list.data.length === 1 ? "" : "s"}.` };
}

// ───────────────────────────── Favorites ─────────────────────────────

export async function toggleFavoriteAction(foodItemId: string): Promise<{ favorite: boolean }> {
  const user = await requireUser();
  const existing = await db.favoriteFood.findUnique({ where: { userId_foodItemId: { userId: user.id, foodItemId } } });
  if (existing) {
    await db.favoriteFood.delete({ where: { id: existing.id } });
    revalidatePath("/nutrition");
    return { favorite: false };
  }
  await db.favoriteFood.create({ data: { userId: user.id, foodItemId } });
  revalidatePath("/nutrition");
  return { favorite: true };
}

// ───────────────────────────── Templates ─────────────────────────────

export async function saveMealTemplateAction(dayKey: string, mealType: MealType, name: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const key = dayKeySchema.safeParse(dayKey);
  const mt = mealTypeSchema.safeParse(mealType);
  const nm = z.string().trim().min(1).max(60).safeParse(name);
  if (!key.success || !mt.success || !nm.success) return { ok: false, message: "Invalid template details." };

  const { start, end } = dayRange(key.data);
  const meals = await db.mealLog.findMany({ where: { userId: user.id, mealType: mt.data, eatenAt: { gte: start, lt: end } } });
  if (meals.length === 0) return { ok: false, message: "Nothing logged for that meal yet." };

  const items: TemplateItem[] = meals.map((m) => ({ foodItemId: m.foodItemId, name: m.name, servings: m.servings, calories: m.calories, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, healthScore: m.healthScore }));
  await db.mealTemplate.create({ data: { userId: user.id, name: nm.data, mealType: mt.data, items } });
  revalidatePath("/nutrition");
  return { ok: true, message: `Saved "${nm.data}" with ${items.length} item${items.length === 1 ? "" : "s"}.` };
}

export async function logMealTemplateAction(templateId: string, dayKey: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const key = dayKeySchema.safeParse(dayKey);
  if (!key.success) return { ok: false, message: "Invalid date." };
  const tpl = await db.mealTemplate.findFirst({ where: { id: templateId, userId: user.id } });
  if (!tpl) return { ok: false, message: "Template not found." };
  const items = tpl.items as TemplateItem[];
  await db.mealLog.createMany({
    data: items.map((it) => ({
      userId: user.id,
      foodItemId: it.foodItemId,
      name: it.name,
      mealType: tpl.mealType,
      servings: it.servings,
      calories: it.calories,
      proteinG: it.proteinG,
      carbsG: it.carbsG,
      fatG: it.fatG,
      healthScore: it.healthScore,
      eatenAt: dayAnchor(key.data),
    })),
  });
  revalidate();
  return { ok: true, message: `Logged "${tpl.name}".` };
}

export async function deleteMealTemplateAction(templateId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.mealTemplate.deleteMany({ where: { id: templateId, userId: user.id } });
  revalidatePath("/nutrition");
  return { ok: r.count > 0 };
}

/** Copy all meals (or one meal type) from one day to another. */
export async function copyMealsAction(fromDayKey: string, toDayKey: string, mealType?: MealType): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const from = dayKeySchema.safeParse(fromDayKey);
  const to = dayKeySchema.safeParse(toDayKey);
  if (!from.success || !to.success) return { ok: false, message: "Invalid date." };
  const { start, end } = dayRange(from.data);
  const meals = await db.mealLog.findMany({ where: { userId: user.id, eatenAt: { gte: start, lt: end }, ...(mealType ? { mealType } : {}) } });
  if (meals.length === 0) return { ok: false, message: "Nothing to copy from that day." };
  await db.mealLog.createMany({
    data: meals.map((m) => ({
      userId: user.id,
      foodItemId: m.foodItemId,
      name: m.name,
      mealType: m.mealType,
      servings: m.servings,
      calories: m.calories,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      healthScore: m.healthScore,
      eatenAt: dayAnchor(to.data),
    })),
  });
  revalidate();
  return { ok: true, message: `Copied ${meals.length} item${meals.length === 1 ? "" : "s"}.` };
}
