"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HealthBadge } from "@/components/nutrition/health-badge";
import { logParsedItemsAction, parseMealDescriptionAction } from "@/app/(app)/nutrition/actions";
import type { ParsedItem } from "@/lib/ai/meal-parser";

const EXAMPLES = ["2 roti, 1 katori dal tadka, salad and a chai with sugar", "masala dosa with sambar and filter coffee", "3 egg omelette, 2 toast with butter, orange juice", "rajma chawal, dahi, 1 gulab jamun"];

export function DescribeMeal({ dayKey, mealType, onLogged }: { dayKey: string; mealType: string; onLogged: () => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [parsing, startParse] = useTransition();
  const [logging, startLog] = useTransition();

  const parse = () =>
    startParse(async () => {
      const r = await parseMealDescriptionAction(text);
      if (r.ok) setItems(r.items);
      else toast.error(r.error);
    });

  const update = (i: number, servings: number) =>
    setItems((list) =>
      list?.map((it, idx) => {
        if (idx !== i || !it.matched) return it;
        const ratio = servings / (it.servings || 1);
        return { ...it, servings, calories: Math.round(it.calories * ratio), proteinG: Math.round(it.proteinG * ratio * 10) / 10, carbsG: Math.round(it.carbsG * ratio * 10) / 10, fatG: Math.round(it.fatG * ratio * 10) / 10 };
      }) ?? null,
    );

  const totals = items?.reduce((a, i) => ({ kcal: a.kcal + i.calories, p: a.p + i.proteinG }), { kcal: 0, p: 0 });

  const logAll = () =>
    startLog(async () => {
      if (!items?.length) return;
      const r = await logParsedItemsAction(dayKey, mealType as never, items);
      if (r.ok) {
        toast.success(r.message);
        setItems(null);
        setText("");
        onLogged();
      } else toast.error(r.message);
    });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="describe">Describe what you ate</Label>
        <Textarea id="describe" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 2 roti, 1 katori dal, some salad and a chai" disabled={parsing} />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
              {ex}
            </button>
          ))}
        </div>
      </div>
      <Button type="button" onClick={parse} disabled={parsing || text.trim().length < 3} className="w-full">
        {parsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {parsing ? "Reading your meal…" : "Find matching foods"}
      </Button>

      {items && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="size-3.5 text-primary" /> Check the matches and servings, then log.
          </div>
          <ul className="divide-y">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{it.name}</span>
                    {it.matched ? <HealthBadge score={it.healthScore} /> : <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">estimated</span>}
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {it.calories} kcal · P {it.proteinG} · C {it.carbsG} · F {it.fatG}
                    {it.servingLabel ? ` · per ${it.servingLabel}` : ""}
                  </div>
                </div>
                {it.matched && <Input type="number" step="any" min={0.25} value={it.servings} onChange={(e) => update(i, Number(e.target.value) || 0.25)} className="h-8 w-20" aria-label={`Servings of ${it.name}`} />}
                <Button type="button" size="icon" variant="ghost" className="size-7" aria-label={`Remove ${it.name}`} onClick={() => setItems((l) => l?.filter((_, idx) => idx !== i) ?? null)}>
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-muted-foreground">
              Total <span className="font-medium text-foreground tabular-nums">{Math.round(totals?.kcal ?? 0)} kcal</span> · P {Math.round(totals?.p ?? 0)} g
            </span>
            <Button type="button" size="sm" onClick={logAll} disabled={logging || items.length === 0}>
              {logging ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Log {items.length} item{items.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
