import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BookMarked, Bot, ChevronLeft, ChevronRight, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { MacroMeters } from "@/components/nutrition/macro-meters";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { LogMealDialog, type FoodOption } from "@/components/nutrition/log-meal-dialog";
import { DeleteMealButton } from "@/components/nutrition/delete-meal-button";
import { QuickLogButton } from "@/components/nutrition/quick-log-button";
import { HealthBadge } from "@/components/nutrition/health-badge";
import { InsightsCard } from "@/components/nutrition/insights-card";
import { WeeklyCalories } from "@/components/nutrition/weekly-calories";
import { CopyYesterdayButton, MealTemplates, SaveTemplateButton, type TemplateSummary } from "@/components/nutrition/meal-tools";
import { requireOnboarded } from "@/lib/auth/onboarding";
import {
  buildInsights,
  buildRecommendations,
  filterFoodsForProfile,
  getAllFoods,
  getCaloriesByDay,
  getDayNutrition,
  getFavoriteFoodIds,
  getMealTemplates,
  getRecentAndFrequent,
  MEAL_TYPES,
  type TemplateItem,
} from "@/lib/tracking/nutrition";
import { formatDayKey, isValidDayKey, shiftDayKey, toDayKey } from "@/lib/dates";
import { DIET_OPTIONS, labelOf } from "@/lib/engine/options";

export const metadata: Metadata = { title: "Nutrition" };

export default async function NutritionPage(props: PageProps<"/nutrition">) {
  const [{ user, profile, targets }, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const todayKey = toDayKey();
  const dayKey = isValidDayKey(sp.date) ? sp.date : todayKey;
  const isToday = dayKey === todayKey;
  const yesterdayKey = shiftDayKey(dayKey, -1);

  const [day, allFoods, favoriteIds, { recent, frequent }, templates, week] = await Promise.all([
    getDayNutrition(user.id, dayKey),
    getAllFoods(),
    getFavoriteFoodIds(user.id),
    getRecentAndFrequent(user.id),
    getMealTemplates(user.id),
    getCaloriesByDay(user.id, todayKey, 7),
  ]);
  const foods = filterFoodsForProfile(allFoods, profile);
  const foodsById = new Map(allFoods.map((f) => [f.id, f]));
  const target = targets ?? { calories: 2000, proteinG: 120, carbsG: 220, fatG: 65, waterMl: 2500 };
  const loggedTypes = new Set(day.meals.map((m) => m.mealType));
  const recs = isToday ? buildRecommendations(foods, target, day.totals, dayKey, loggedTypes) : [];
  const insights = buildInsights(day.meals, day.totals, target, foodsById);
  const foodOptions: FoodOption[] = foods.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    tags: f.tags,
    servingLabel: f.servingLabel,
    calories: f.calories,
    proteinG: f.proteinG,
    carbsG: f.carbsG,
    fatG: f.fatG,
    healthScore: f.healthScore,
    healthNote: f.healthNote,
    swaps: f.swaps,
  }));
  const templateSummaries: TemplateSummary[] = templates.map((t) => {
    const items = t.items as TemplateItem[];
    return {
      id: t.id,
      name: t.name,
      mealType: t.mealType,
      itemCount: items.length,
      calories: items.reduce((a, i) => a + i.calories, 0),
      proteinG: items.reduce((a, i) => a + i.proteinG, 0),
      names: items.map((i) => i.name),
    };
  });
  const remaining = Math.round(target.calories - day.totals.calories);
  const dialogProps = { dayKey, foods: foodOptions, favoriteIds, recentIds: recent, frequentIds: frequent };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutrition</h1>
          <p className="text-muted-foreground">
            {labelOf(DIET_OPTIONS, profile.dietaryPreference)} · {foods.length} of {allFoods.length} foods match your preferences
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" nativeButton={false} render={<Link href={`/nutrition?date=${yesterdayKey}`} aria-label="Previous day" />}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/nutrition" />} className="min-w-44">
            {isToday ? "Today" : formatDayKey(dayKey, { weekday: "short", day: "numeric", month: "short" })}
          </Button>
          <Button variant="outline" size="icon" disabled={isToday} nativeButton={false} render={<Link href={`/nutrition?date=${shiftDayKey(dayKey, 1)}`} aria-label="Next day" />}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <DisclaimerBanner />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardDescription>{formatDayKey(dayKey)}</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-base">
                {remaining >= 0 ? (
                  <>
                    <span className="text-2xl tabular-nums">{remaining.toLocaleString()}</span> kcal remaining
                  </>
                ) : (
                  <>
                    <span className="text-2xl tabular-nums text-destructive">{Math.abs(remaining).toLocaleString()}</span> kcal over target
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MacroMeters consumed={day.totals} target={target} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UtensilsCrossed className="size-4 text-primary" /> Meals
                </CardTitle>
                <CardDescription>{day.meals.length} item{day.meals.length === 1 ? "" : "s"} logged</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <CopyYesterdayButton fromDayKey={yesterdayKey} toDayKey={dayKey} />
                <LogMealDialog {...dialogProps} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TYPES.map((mt) => {
                const items = day.meals.filter((m) => m.mealType === mt.value);
                const kcal = Math.round(items.reduce((a, m) => a + m.calories, 0));
                const p = Math.round(items.reduce((a, m) => a + m.proteinG, 0));
                const c = Math.round(items.reduce((a, m) => a + m.carbsG, 0));
                const f = Math.round(items.reduce((a, m) => a + m.fatG, 0));
                return (
                  <div key={mt.value}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{mt.label}</span>
                        {items.length > 0 && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {kcal} kcal · P {p} · C {c} · F {f}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        {items.length > 0 && <SaveTemplateButton dayKey={dayKey} mealType={mt.value} />}
                        <LogMealDialog {...dialogProps} defaultMeal={mt.value} triggerLabel="Add" triggerVariant="ghost" />
                      </div>
                    </div>
                    {items.length === 0 ? (
                      <p className="py-1.5 text-xs text-muted-foreground">Nothing logged.</p>
                    ) : (
                      <ul className="mt-1 divide-y rounded-lg border">
                        {items.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{m.name}</span>
                                {m.servings !== 1 && <span className="text-xs text-muted-foreground">× {m.servings}</span>}
                                <HealthBadge score={m.healthScore} />
                              </div>
                              <div className="text-xs tabular-nums text-muted-foreground">
                                P {Math.round(m.proteinG)} · C {Math.round(m.carbsG)} · F {Math.round(m.fatG)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm tabular-nums">{Math.round(m.calories)}</span>
                              <DeleteMealButton id={m.id} name={m.name} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <InsightsCard insights={insights} />
          <div className="flex flex-wrap gap-2">
            {[
              ["Ask AI: what should I eat next?", `Based on what I've eaten today (${Math.round(day.totals.calories)} kcal, ${Math.round(day.totals.proteinG)} g protein), what should my next meal be?`],
              ["Ask AI: review today's food", "Review everything I've eaten today and suggest the single most useful swap."],
              ["Ask AI: healthier chai-time snack", "What are 3 healthier Indian snacks I can have with evening chai instead of biscuits?"],
            ].map(([label, q]) => (
              <Link key={label} href={`/assistant?q=${encodeURIComponent(q!)}`} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
                <Bot className="size-3.5 text-primary" /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <WaterTracker dayKey={dayKey} waterMl={day.waterMl} targetMl={target.waterMl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" /> Last 7 days
              </CardTitle>
              <CardDescription>Calories eaten per day vs your target.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyCalories days={week} target={target.calories} todayKey={todayKey} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> Meal ideas
              </CardTitle>
              <CardDescription>
                {isToday ? "Wholesome combos sized to what's left today, matching your diet, allergies and dislikes." : "Suggestions are shown for today only."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isToday && recs.length === 0 && <p className="text-sm text-muted-foreground">Nothing more to suggest — you&apos;ve logged your main meals or reached your target.</p>}
              {recs.map((r) => (
                <div key={r.mealType} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                      <div className="text-sm font-medium">{r.title}</div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {r.calories} kcal · P {r.proteinG}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {r.items.map((it) => (
                      <li key={it.food.id} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {it.servings !== 1 ? `${it.servings} × ` : ""}
                          {it.food.name}
                        </span>
                        <QuickLogButton dayKey={dayKey} mealType={r.mealType} foodItemId={it.food.id} servings={it.servings} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookMarked className="size-4 text-primary" /> My meal templates
              </CardTitle>
              <CardDescription>Your usual meals, logged in one click.</CardDescription>
            </CardHeader>
            <CardContent>
              <MealTemplates templates={templateSummaries} dayKey={dayKey} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
