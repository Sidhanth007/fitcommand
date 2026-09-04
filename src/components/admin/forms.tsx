"use client";

import { FormField } from "@/components/auth/form-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntityDialog } from "@/components/admin/entity-dialog";
import { upsertArticleAction, upsertExerciseAction, upsertFoodAction, upsertTemplateAction } from "@/app/(app)/admin/actions";
import type { ActionState } from "@/lib/validators/auth";

type FE = NonNullable<ActionState["fieldErrors"]>;

function Select({ name, label, value, options, errors }: { name: string; label: string; value?: string; options: { value: string; label: string }[]; errors?: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={value ?? options[0]?.value} className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-primary" /> {label}
    </label>
  );
}

// ───────────────────────────── Food ─────────────────────────────

export type FoodValues = {
  id?: string;
  name?: string;
  category?: string;
  tags?: string[];
  servingLabel?: string;
  servingGrams?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  healthScore?: number;
  healthNote?: string | null;
  swaps?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
};

export function FoodDialog({ v, categories }: { v?: FoodValues; categories: string[] }) {
  const edit = Boolean(v?.id);
  const s = (n?: number) => (n == null ? "" : String(n));
  return (
    <EntityDialog title={edit ? "Edit food" : "Add food"} description="Values are per serving." action={upsertFoodAction} mode={edit ? "edit" : "create"} triggerLabel="Add food" wide>
      {(fe: FE) => (
        <>
          {v?.id && <input type="hidden" name="id" value={v.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" name="name" defaultValue={v?.name} errors={fe.name} required />
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <input id="category" name="category" list="food-categories" defaultValue={v?.category} className="h-9 w-full rounded-lg border bg-background px-3 text-sm" />
              <datalist id="food-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {fe.category?.[0] && <p className="text-xs text-destructive">{fe.category[0]}</p>}
            </div>
            <FormField label="Serving label" name="servingLabel" defaultValue={v?.servingLabel ?? "1 katori (150 g)"} errors={fe.servingLabel} />
            <FormField label="Serving grams" name="servingGrams" type="number" step="any" defaultValue={s(v?.servingGrams ?? 150)} errors={fe.servingGrams} />
            <FormField label="Calories" name="calories" type="number" step="any" defaultValue={s(v?.calories)} errors={fe.calories} required />
            <FormField label="Protein (g)" name="proteinG" type="number" step="any" defaultValue={s(v?.proteinG)} errors={fe.proteinG} required />
            <FormField label="Carbs (g)" name="carbsG" type="number" step="any" defaultValue={s(v?.carbsG)} errors={fe.carbsG} required />
            <FormField label="Fat (g)" name="fatG" type="number" step="any" defaultValue={s(v?.fatG)} errors={fe.fatG} required />
            <FormField label="Fibre (g)" name="fiberG" type="number" step="any" defaultValue={s(v?.fiberG ?? 0)} errors={fe.fiberG} />
            <FormField label="Sugar (g)" name="sugarG" type="number" step="any" defaultValue={s(v?.sugarG ?? 0)} errors={fe.sugarG} />
            <Select name="healthScore" label="Health score" value={String(v?.healthScore ?? 3)} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} — ${["", "Treat", "Occasional", "Okay", "Good", "Great pick"][n]}` }))} errors={fe.healthScore} />
            <FormField label="Tags (comma-separated)" name="tags" defaultValue={v?.tags?.join(", ")} hint="e.g. Indian, Breakfast, Fried" errors={fe.tags} />
          </div>
          <FormField label="Health note (shown for scores 1–2)" name="healthNote" defaultValue={v?.healthNote ?? ""} errors={fe.healthNote} />
          <FormField label="Healthier swaps (comma-separated food names)" name="swaps" defaultValue={v?.swaps?.join(", ")} errors={fe.swaps} />
          <div className="flex flex-wrap gap-4">
            <Check name="isVegetarian" label="Vegetarian" checked={v?.isVegetarian ?? true} />
            <Check name="isVegan" label="Vegan" checked={v?.isVegan ?? false} />
            <Check name="isGlutenFree" label="Gluten-free" checked={v?.isGlutenFree ?? true} />
          </div>
        </>
      )}
    </EntityDialog>
  );
}

// ───────────────────────────── Exercise ─────────────────────────────

export type ExerciseValues = { id?: string; name?: string; muscleGroup?: string; equipment?: string; difficulty?: string; metValue?: number; instructions?: string };

export function ExerciseDialog({ v, muscles, equipment }: { v?: ExerciseValues; muscles: { value: string; label: string }[]; equipment: { value: string; label: string }[] }) {
  const edit = Boolean(v?.id);
  return (
    <EntityDialog title={edit ? "Edit exercise" : "Add exercise"} action={upsertExerciseAction} mode={edit ? "edit" : "create"} triggerLabel="Add exercise">
      {(fe: FE) => (
        <>
          {v?.id && <input type="hidden" name="id" value={v.id} />}
          <FormField label="Name" name="name" defaultValue={v?.name} errors={fe.name} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select name="muscleGroup" label="Muscle group" value={v?.muscleGroup} options={muscles} errors={fe.muscleGroup} />
            <Select name="equipment" label="Equipment" value={v?.equipment} options={equipment} errors={fe.equipment} />
            <Select name="difficulty" label="Difficulty" value={v?.difficulty} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} errors={fe.difficulty} />
            <FormField label="MET value" name="metValue" type="number" step="any" defaultValue={String(v?.metValue ?? 5)} hint="Calorie estimate multiplier (3 light … 10 intense)" errors={fe.metValue} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" name="instructions" rows={3} defaultValue={v?.instructions} />
            {fe.instructions?.[0] && <p className="text-xs text-destructive">{fe.instructions[0]}</p>}
          </div>
        </>
      )}
    </EntityDialog>
  );
}

// ───────────────────────────── Plan template ─────────────────────────────

export type TemplateValues = { id?: string; name?: string; description?: string; goal?: string; experience?: string; daysPerWeek?: number; structure?: unknown };

export function TemplateDialog({ v, goals }: { v?: TemplateValues; goals: { value: string; label: string }[] }) {
  const edit = Boolean(v?.id);
  const structure = v?.structure ? JSON.stringify(v.structure, null, 2) : JSON.stringify([{ title: "Full Body A", focus: "FULL_BODY", exerciseNames: ["Bodyweight Squat", "Push-Up", "Plank"] }], null, 2);
  return (
    <EntityDialog title={edit ? "Edit template" : "Add template"} description="Exercise names must match the exercise library exactly." action={upsertTemplateAction} mode={edit ? "edit" : "create"} triggerLabel="Add template" wide>
      {(fe: FE) => (
        <>
          {v?.id && <input type="hidden" name="id" value={v.id} />}
          <FormField label="Name" name="name" defaultValue={v?.name} errors={fe.name} required />
          <FormField label="Description" name="description" defaultValue={v?.description} errors={fe.description} required />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select name="goal" label="Goal" value={v?.goal} options={goals} errors={fe.goal} />
            <Select name="experience" label="Experience" value={v?.experience} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} errors={fe.experience} />
            <FormField label="Days per week" name="daysPerWeek" type="number" min={1} max={7} defaultValue={String(v?.daysPerWeek ?? 3)} errors={fe.daysPerWeek} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="structure">Structure (JSON)</Label>
            <Textarea id="structure" name="structure" rows={12} defaultValue={structure} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Array of sessions: {"{ title, focus, exerciseNames[] }"}. Focus: CHEST, BACK, SHOULDERS, ARMS, LEGS, GLUTES, CORE, FULL_BODY, CARDIO.</p>
            {fe.structure?.[0] && <p className="text-xs text-destructive">{fe.structure[0]}</p>}
          </div>
        </>
      )}
    </EntityDialog>
  );
}

// ───────────────────────────── Article ─────────────────────────────

export type ArticleValues = { id?: string; title?: string; slug?: string; excerpt?: string; body?: string; category?: string; isPublished?: boolean };

export function ArticleDialog({ v }: { v?: ArticleValues }) {
  const edit = Boolean(v?.id);
  return (
    <EntityDialog title={edit ? "Edit article" : "New article"} description="Shown to users under Learn when published. Plain text with blank lines between paragraphs; lines starting with '## ' become headings, '- ' become bullets." action={upsertArticleAction} mode={edit ? "edit" : "create"} triggerLabel="New article" wide>
      {(fe: FE) => (
        <>
          {v?.id && <input type="hidden" name="id" value={v.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Title" name="title" defaultValue={v?.title} errors={fe.title} required />
            <FormField label="Slug" name="slug" defaultValue={v?.slug} hint="e.g. protein-basics" errors={fe.slug} required />
            <FormField label="Category" name="category" defaultValue={v?.category ?? "Nutrition"} errors={fe.category} />
            <div className="flex items-end pb-2">
              <Check name="isPublished" label="Published" checked={v?.isPublished ?? false} />
            </div>
          </div>
          <FormField label="Excerpt" name="excerpt" defaultValue={v?.excerpt} errors={fe.excerpt} required />
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" name="body" rows={14} defaultValue={v?.body} />
            {fe.body?.[0] && <p className="text-xs text-destructive">{fe.body[0]}</p>}
          </div>
        </>
      )}
    </EntityDialog>
  );
}
