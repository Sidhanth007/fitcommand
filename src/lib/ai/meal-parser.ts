import "server-only";
import { z } from "zod";
import { AiError, completeChat } from "@/lib/ai/provider";
import type { FoodItem } from "@/generated/prisma/client";

export type ParsedItem = {
  foodItemId: string | null;
  name: string;
  servings: number;
  servingLabel: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  healthScore: number | null;
  matched: boolean;
};

const responseSchema = z.object({
  items: z
    .array(
      z.object({
        food: z.string().nullable().optional(),
        custom: z.string().nullable().optional(),
        servings: z.coerce.number().min(0.1).max(20).default(1),
        calories: z.coerce.number().min(0).max(5000).optional(),
        proteinG: z.coerce.number().min(0).max(500).optional(),
        carbsG: z.coerce.number().min(0).max(1000).optional(),
        fatG: z.coerce.number().min(0).max(500).optional(),
      }),
    )
    .max(15),
});

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Turn free text like "2 roti, dal, salad and a chai with sugar" into library items with servings,
 * using the AI to match names against the user's (diet-filtered) library. Unknown foods get estimated macros.
 */
export async function parseMealDescription(userId: string, text: string, foods: FoodItem[]): Promise<ParsedItem[]> {
  const byName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));
  const catalogue = foods.map((f) => `${f.name} | ${f.servingLabel}`).join("\n");
  const system = `You convert a person's plain-language meal description into structured items for a food diary.
You are given the app's food library as "name | one serving". Match each described food to the closest library name when a reasonable match exists (e.g. "roti" → "Roti (chapati)", "chai" → "Chai (milk & sugar)" unless they said no sugar, "dal" → "Dal Tadka" unless a specific dal is named). Convert quantities into servings of the library serving (e.g. "2 roti" → Roti (chapati) servings 2; "half katori rice" → 0.5; "a glass of milk" → 1).
If nothing in the library fits, return the item with "food": null, a short "custom" name, and estimated calories/proteinG/carbsG/fatG for the described amount.
Return ONLY JSON: {"items":[{"food":"<exact library name or null>","custom":"<name if food is null>","servings":<number>,"calories":<n>,"proteinG":<n>,"carbsG":<n>,"fatG":<n>}]}
Rules: max 15 items; servings between 0.25 and 10; never invent foods the user didn't mention; no prose.

FOOD LIBRARY:
${catalogue}`;

  let raw: unknown;
  try {
    const { text: out } = await completeChat({ feature: "meal", userId, maxOutputTokens: 900, system, messages: [{ role: "user", content: text }] });
    raw = extractJson(out);
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError("I couldn't understand that description — try listing the foods with quantities.", "bad_request");
  }
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.items.length === 0) throw new AiError("I couldn't turn that into foods — try “2 roti, 1 katori dal, salad”.", "bad_request");

  return parsed.data.items.map((it) => {
    const match = it.food ? byName.get(it.food.toLowerCase()) : undefined;
    const servings = Math.round(Math.min(10, Math.max(0.25, it.servings)) * 4) / 4;
    if (match) {
      return {
        foodItemId: match.id,
        name: match.name,
        servings,
        servingLabel: match.servingLabel,
        calories: Math.round(match.calories * servings),
        proteinG: Math.round(match.proteinG * servings * 10) / 10,
        carbsG: Math.round(match.carbsG * servings * 10) / 10,
        fatG: Math.round(match.fatG * servings * 10) / 10,
        healthScore: match.healthScore,
        matched: true,
      };
    }
    return {
      foodItemId: null,
      name: (it.custom || it.food || "Custom item").slice(0, 80),
      servings: 1,
      servingLabel: null,
      calories: Math.round(it.calories ?? 0),
      proteinG: Math.round((it.proteinG ?? 0) * 10) / 10,
      carbsG: Math.round((it.carbsG ?? 0) * 10) / 10,
      fatG: Math.round((it.fatG ?? 0) * 10) / 10,
      healthScore: null,
      matched: false,
    };
  });
}
