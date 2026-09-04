"use client";

import { useTransition } from "react";
import { BookmarkPlus, Copy, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyMealsAction, deleteMealTemplateAction, logMealTemplateAction, saveMealTemplateAction } from "@/app/(app)/nutrition/actions";
import type { MealType } from "@/generated/prisma/enums";

function useAct() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Done");
      else toast.error(r.message ?? "Something went wrong");
    });
  return { pending, run };
}

export function SaveTemplateButton({ dayKey, mealType, disabled }: { dayKey: string; mealType: MealType; disabled?: boolean }) {
  const { pending, run } = useAct();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending || disabled}
      title="Save this meal as a reusable template"
      onClick={() => {
        const name = prompt("Name this meal template (e.g. My usual breakfast):");
        if (name) run(() => saveMealTemplateAction(dayKey, mealType, name));
      }}
    >
      <BookmarkPlus className="size-3.5" /> Save as template
    </Button>
  );
}

export function CopyYesterdayButton({ fromDayKey, toDayKey, mealType }: { fromDayKey: string; toDayKey: string; mealType?: MealType }) {
  const { pending, run } = useAct();
  return (
    <Button variant="ghost" size="xs" disabled={pending} title="Copy yesterday's items" onClick={() => run(() => copyMealsAction(fromDayKey, toDayKey, mealType))}>
      <Copy className="size-3.5" /> Copy yesterday
    </Button>
  );
}

export type TemplateSummary = { id: string; name: string; mealType: MealType; itemCount: number; calories: number; proteinG: number; names: string[] };

export function MealTemplates({ templates, dayKey }: { templates: TemplateSummary[]; dayKey: string }) {
  const { pending, run } = useAct();
  if (templates.length === 0) {
    return <p className="text-sm text-muted-foreground">Save a logged meal as a template (button next to each meal) to re-log it in one click.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {templates.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">
              <Utensils className="size-3.5 text-primary" /> <span className="truncate">{t.name}</span>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {t.mealType.charAt(0) + t.mealType.slice(1).toLowerCase()} · {t.names.join(", ")} · {Math.round(t.calories)} kcal · P {Math.round(t.proteinG)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="xs" disabled={pending} onClick={() => run(() => logMealTemplateAction(t.id, dayKey))}>
              Log
            </Button>
            <Button size="icon" variant="ghost" className="size-7" aria-label={`Delete template ${t.name}`} disabled={pending} onClick={() => run(() => deleteMealTemplateAction(t.id).then((r) => ({ ok: r.ok, message: r.ok ? "Template deleted." : "Not found." })))}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
