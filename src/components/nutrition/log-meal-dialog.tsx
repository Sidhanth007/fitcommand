"use client";

import { useActionState, useMemo, useOptimistic, useState, useTransition } from "react";
import { Lightbulb, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { HealthBadge } from "@/components/nutrition/health-badge";
import { DescribeMeal } from "@/components/nutrition/describe-meal";
import { logFoodAction, quickAddMealAction, toggleFavoriteAction } from "@/app/(app)/nutrition/actions";
import { initialActionState, type ActionState } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

export type FoodOption = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  servingLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  healthScore: number;
  healthNote: string | null;
  swaps: string[];
};

const MEALS = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

const CATEGORY_ORDER = ["Drinks", "Breakfast", "Mains", "Breads", "Grains", "Legumes", "Protein", "Dairy", "Vegetables", "Fruits", "Snacks", "Sweets", "Nuts & Seeds", "Fats", "Sides"];

type Props = {
  dayKey: string;
  foods: FoodOption[];
  favoriteIds: string[];
  recentIds: string[];
  frequentIds: string[];
  defaultMeal?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  presetFoodId?: string;
  presetServings?: number;
};

export function LogMealDialog({ dayKey, foods, favoriteIds, recentIds, frequentIds, defaultMeal = "LUNCH", triggerLabel = "Log meal", triggerVariant = "default", presetFoodId, presetServings }: Props) {
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState(defaultMeal);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodOption | null>(() => foods.find((f) => f.id === presetFoodId) ?? null);
  const [servings, setServings] = useState(String(presetServings ?? 1));
  const [tab, setTab] = useState<string>(presetFoodId ? "library" : recentIds.length ? "recent" : "library");
  const [favPending, startFav] = useTransition();
  const [favorites, setFavoritesOptimistic] = useOptimistic(new Set(favoriteIds), (cur: Set<string>, id: string) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const closeOnSuccess = (action: typeof logFoodAction) => async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.success) {
      toast.success(r.success, { duration: 5000 });
      setOpen(false);
    }
    return r;
  };
  const [libState, libAction] = useActionState(closeOnSuccess(logFoodAction), initialActionState);
  const [quickState, quickAction] = useActionState(closeOnSuccess(quickAddMealAction), initialActionState);

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const categories = useMemo(() => {
    const present = new Set(foods.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [foods]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = foods;
    if (category) list = list.filter((f) => f.category === category);
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)));
    return list.slice(0, 40);
  }, [query, category, foods]);

  const recent = recentIds.map((id) => byId.get(id)).filter((f): f is FoodOption => Boolean(f));
  const frequent = frequentIds.map((id) => byId.get(id)).filter((f): f is FoodOption => Boolean(f));
  const favList = foods.filter((f) => favorites.has(f.id));
  const mult = Number(servings) || 0;
  const swapOptions = selected?.swaps.map((n) => foods.find((f) => f.name === n)).filter((f): f is FoodOption => Boolean(f)) ?? [];

  const toggleFav = (id: string) =>
    startFav(async () => {
      setFavoritesOptimistic(id);
      await toggleFavoriteAction(id);
    });

  const renderFoodRow = (f: FoodOption) => (
    <li key={f.id} className={cn("flex items-center gap-1 pr-1", selected?.id === f.id && "bg-primary/10")}>
      <button type="button" onClick={() => setSelected(f)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium">{f.name}</span>
            <HealthBadge score={f.healthScore} />
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {f.servingLabel} · {f.category}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {Math.round(f.calories)} kcal · P{Math.round(f.proteinG)}
        </span>
      </button>
      <button type="button" onClick={() => toggleFav(f.id)} disabled={favPending} aria-label={favorites.has(f.id) ? "Remove from favorites" : "Add to favorites"} className="rounded-md p-1.5 text-muted-foreground hover:text-amber-500">
        <Star className={cn("size-4", favorites.has(f.id) && "fill-amber-400 text-amber-500")} />
      </button>
    </li>
  );

  const renderFoodList = (list: FoodOption[], empty: string) => (
    <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
      {list.length === 0 && <li className="p-3 text-sm text-muted-foreground">{empty}</li>}
      {list.map(renderFoodRow)}
    </ul>
  );

  const renderSelectedPanel = () =>
    selected ? (
      <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{selected.name}</span>
              <HealthBadge score={selected.healthScore} />
            </div>
            <div className="text-xs text-muted-foreground">per {selected.servingLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="servings" className="text-xs">
              Servings
            </Label>
            <Input id="servings" name="servings" type="number" min={0.1} max={20} step="any" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} className="w-20" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            ["kcal", selected.calories],
            ["protein", selected.proteinG],
            ["carbs", selected.carbsG],
            ["fat", selected.fatG],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-md bg-background p-1.5">
              <div className="font-semibold tabular-nums">{Math.round((v as number) * mult)}</div>
              <div className="text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
        {selected.healthScore <= 2 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-1.5">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p>{selected.healthNote ?? "Low nutrition for its calories — fine occasionally."}</p>
                {swapOptions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="self-center">Healthier swap:</span>
                    {swapOptions.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSelected(s)} className="rounded-full border border-amber-500/40 bg-background px-2 py-0.5 hover:bg-amber-500/10">
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>
        <Plus className="size-4" /> {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Log food</DialogTitle>
          <DialogDescription>Library is filtered to your diet. Foods carry a simple health score — treats are flagged with healthier swaps.</DialogDescription>
        </DialogHeader>

        {(() => {
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          if (dayKey === todayKey) return null;
          const label = new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
          return (
            <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs">
              📅 Logging to <span className="font-semibold">{label}</span> — use the arrows on the Nutrition page to change the day.
            </div>
          );
        })()}
        <div className="space-y-1.5">
          <Label htmlFor="mealType">Meal</Label>
          <select id="mealType" value={mealType} onChange={(e) => setMealType(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
            {MEALS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">
              Library
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1">
              Recent
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              Favorites
            </TabsTrigger>
            <TabsTrigger value="describe" className="flex-1">
              Describe ✨
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex-1">
              Quick add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="describe" className="pt-3">
            <DescribeMeal dayKey={dayKey} mealType={mealType} onLogged={() => setOpen(false)} />
          </TabsContent>

          {/* Shared library form wraps three tabs */}
          <form action={libAction}>
            <input type="hidden" name="dayKey" value={dayKey} />
            <input type="hidden" name="mealType" value={mealType} />
            <input type="hidden" name="foodItemId" value={selected?.id ?? ""} />

            <TabsContent value="library" className="space-y-3 pt-3">
              <FormAlert error={libState.error} />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search — chai, dal, biscuit, paneer…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                <button type="button" onClick={() => setCategory(null)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", category === null ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted")}>
                  All
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(category === c ? null : c)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", category === c ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted")}>
                    {c}
                  </button>
                ))}
              </div>
              {renderFoodList(results, "No matches in your filtered library.")}
            </TabsContent>

            <TabsContent value="recent" className="space-y-3 pt-3">
              <FormAlert error={libState.error} />
              <p className="text-xs font-medium text-muted-foreground">Recently logged</p>
              {renderFoodList(recent, "Nothing logged from the library yet.")}
              {frequent.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Most frequent</p>
                  {renderFoodList(frequent, "")}
                </>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-3 pt-3">
              <FormAlert error={libState.error} />
              {renderFoodList(favList, "Star foods in the library to see them here.")}
            </TabsContent>

            <div className="mt-3 space-y-3" hidden={tab === "quick" || tab === "describe"}>
              {renderSelectedPanel()}
              {selected && (
                <SubmitButton className="w-full" pendingText="Logging…">
                  Log {selected.name}
                </SubmitButton>
              )}
            </div>
          </form>

          <TabsContent value="quick" className="pt-3">
            <form action={quickAction} className="space-y-3">
              <input type="hidden" name="dayKey" value={dayKey} />
              <input type="hidden" name="mealType" value={mealType} />
              <FormAlert error={quickState.error} />
              <div className="space-y-1.5">
                <Label htmlFor="qname">Name</Label>
                <Input id="qname" name="name" placeholder="e.g. Mom's rajma chawal" required />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["calories", "Calories"],
                  ["proteinG", "Protein (g)"],
                  ["carbsG", "Carbs (g)"],
                  ["fatG", "Fat (g)"],
                ].map(([name, label]) => (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={`q-${name}`}>{label}</Label>
                    <Input id={`q-${name}`} name={name} type="number" min={0} step="0.1" defaultValue={0} />
                  </div>
                ))}
              </div>
              <SubmitButton className="w-full" pendingText="Logging…">
                Log custom food
              </SubmitButton>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
