"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type Option,
} from "@/lib/engine/options";
import { STEP_SCHEMAS } from "@/lib/validators/profile";
import { initialActionState, type ActionState } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

export type ProfileFormValues = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  goal: string;
  activityLevel: string;
  experience: string;
  daysPerWeek: string;
  sessionMinutes: string;
  equipment: string[];
  injuries: string;
  dietaryPreference: string;
  allergies: string;
  dislikedFoods: string;
};

export const emptyProfileValues: ProfileFormValues = {
  age: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  goal: "",
  activityLevel: "",
  experience: "",
  daysPerWeek: "3",
  sessionMinutes: "45",
  equipment: ["BODYWEIGHT"],
  injuries: "",
  dietaryPreference: "NONE",
  allergies: "",
  dislikedFoods: "",
};

const STEPS = [
  { title: "About you", text: "Basic body stats to calculate your energy needs." },
  { title: "Goal & activity", text: "What you're aiming for and how active you are." },
  { title: "Training", text: "How often, how long and with what equipment." },
  { title: "Nutrition", text: "Dietary preferences so meal ideas fit you." },
];

const STEP_FIELDS: (keyof ProfileFormValues)[][] = [
  ["age", "sex", "heightCm", "weightKg", "targetWeightKg"],
  ["goal", "activityLevel", "experience"],
  ["daysPerWeek", "sessionMinutes", "equipment", "injuries"],
  ["dietaryPreference", "allergies", "dislikedFoods"],
];

type Props = {
  mode: "onboarding" | "edit";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Partial<ProfileFormValues>;
};

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

function ChoiceGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: Option<T>[];
  value: string;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "")}>
      <input type="hidden" name={name} value={value} />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors hover:bg-muted/60",
              selected && "border-primary bg-primary/10 ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{o.label}</span>
              {selected && <Check className="size-4 text-primary" />}
            </div>
            {o.description && <p className="mt-0.5 text-xs text-muted-foreground">{o.description}</p>}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm({ mode, action, defaults }: Props) {
  const stepped = mode === "onboarding";
  const [values, setValues] = useState<ProfileFormValues>({ ...emptyProfileValues, ...defaults });
  const [step, setStep] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [state, formAction] = useActionState(action, initialActionState);

  const set = <K extends keyof ProfileFormValues>(k: K, v: ProfileFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setClientErrors((e) => {
      if (!e[k]) return e;
      const rest = { ...e };
      delete rest[k];
      return rest;
    });
  };

  const errorFor = (k: keyof ProfileFormValues) => clientErrors[k] ?? state.fieldErrors?.[k]?.[0];

  function validateStep(i: number) {
    const subset = Object.fromEntries(STEP_FIELDS[i]!.map((k) => [k, values[k]]));
    const result = STEP_SCHEMAS[i]!.safeParse(subset);
    if (result.success) {
      setClientErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errs[key]) errs[key] = issue.message;
    }
    setClientErrors(errs);
    return false;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const toggleEquipment = (v: string) =>
    set("equipment", values.equipment.includes(v) ? values.equipment.filter((e) => e !== v) : [...values.equipment, v]);

  const sectionClass = "space-y-5";
  const isLast = step === STEPS.length - 1;

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {stepped && (
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="space-y-1.5">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              <div className={cn("hidden text-xs sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s.title}</div>
            </li>
          ))}
        </ol>
      )}

      <FormAlert error={state.error} success={state.success} />

      {/* Step 1 — basics */}
      <section hidden={stepped && step !== 0} className={sectionClass}>
        <header>
          <h2 className="text-lg font-semibold">{STEPS[0]!.title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[0]!.text}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input id="age" name="age" type="number" inputMode="numeric" min={13} max={100} value={values.age} onChange={(e) => set("age", e.target.value)} />
            <Err msg={errorFor("age")} />
          </div>
          <div className="space-y-1.5">
            <Label>Sex</Label>
            <ChoiceGroup name="sex" options={SEX_OPTIONS} value={values.sex} onChange={(v) => set("sex", v)} columns={1} />
            <Err msg={errorFor("sex")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input id="heightCm" name="heightCm" type="number" inputMode="decimal" step="0.1" value={values.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            <Err msg={errorFor("heightCm")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weightKg">Current weight (kg)</Label>
            <Input id="weightKg" name="weightKg" type="number" inputMode="decimal" step="0.1" value={values.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            <Err msg={errorFor("weightKg")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="targetWeightKg">Target weight (kg, optional)</Label>
            <Input id="targetWeightKg" name="targetWeightKg" type="number" inputMode="decimal" step="0.1" value={values.targetWeightKg} onChange={(e) => set("targetWeightKg", e.target.value)} />
            <Err msg={errorFor("targetWeightKg")} />
          </div>
        </div>
      </section>

      {/* Step 2 — goal & activity */}
      <section hidden={stepped && step !== 1} className={sectionClass}>
        <header>
          <h2 className="text-lg font-semibold">{STEPS[1]!.title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[1]!.text}</p>
        </header>
        <div className="space-y-1.5">
          <Label>Primary goal</Label>
          <ChoiceGroup name="goal" options={GOAL_OPTIONS} value={values.goal} onChange={(v) => set("goal", v)} />
          <Err msg={errorFor("goal")} />
        </div>
        <div className="space-y-1.5">
          <Label>Daily activity level</Label>
          <ChoiceGroup name="activityLevel" options={ACTIVITY_OPTIONS} value={values.activityLevel} onChange={(v) => set("activityLevel", v)} />
          <Err msg={errorFor("activityLevel")} />
        </div>
        <div className="space-y-1.5">
          <Label>Workout experience</Label>
          <ChoiceGroup name="experience" options={EXPERIENCE_OPTIONS} value={values.experience} onChange={(v) => set("experience", v)} columns={3} />
          <Err msg={errorFor("experience")} />
        </div>
      </section>

      {/* Step 3 — training */}
      <section hidden={stepped && step !== 2} className={sectionClass}>
        <header>
          <h2 className="text-lg font-semibold">{STEPS[2]!.title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[2]!.text}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="daysPerWeek">Training days per week: {values.daysPerWeek}</Label>
            <input id="daysPerWeek" name="daysPerWeek" type="range" min={1} max={6} step={1} value={values.daysPerWeek} onChange={(e) => set("daysPerWeek", e.target.value)} className="w-full accent-primary" />
            <Err msg={errorFor("daysPerWeek")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sessionMinutes">Minutes per session: {values.sessionMinutes}</Label>
            <input id="sessionMinutes" name="sessionMinutes" type="range" min={15} max={90} step={5} value={values.sessionMinutes} onChange={(e) => set("sessionMinutes", e.target.value)} className="w-full accent-primary" />
            <Err msg={errorFor("sessionMinutes")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Equipment available</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {EQUIPMENT_OPTIONS.map((o) => {
              const checked = values.equipment.includes(o.value);
              return (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm hover:bg-muted/60", checked && "border-primary bg-primary/10")}>
                  <input type="checkbox" name="equipment" value={o.value} checked={checked} onChange={() => toggleEquipment(o.value)} className="size-4 accent-primary" />
                  {o.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="injuries">Injuries or limitations (optional)</Label>
          <Textarea id="injuries" name="injuries" rows={2} placeholder="e.g. sensitive lower back, avoid overhead pressing" value={values.injuries} onChange={(e) => set("injuries", e.target.value)} />
          <Err msg={errorFor("injuries")} />
        </div>
      </section>

      {/* Step 4 — nutrition */}
      <section hidden={stepped && step !== 3} className={sectionClass}>
        <header>
          <h2 className="text-lg font-semibold">{STEPS[3]!.title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[3]!.text}</p>
        </header>
        <div className="space-y-1.5">
          <Label>Dietary preference</Label>
          <ChoiceGroup name="dietaryPreference" options={DIET_OPTIONS} value={values.dietaryPreference} onChange={(v) => set("dietaryPreference", v)} columns={3} />
          <Err msg={errorFor("dietaryPreference")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies (comma-separated)</Label>
            <Input id="allergies" name="allergies" placeholder="peanuts, shellfish" value={values.allergies} onChange={(e) => set("allergies", e.target.value)} />
            <Err msg={errorFor("allergies")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dislikedFoods">Foods you dislike (comma-separated)</Label>
            <Input id="dislikedFoods" name="dislikedFoods" placeholder="mushrooms, tofu" value={values.dislikedFoods} onChange={(e) => set("dislikedFoods", e.target.value)} />
            <Err msg={errorFor("dislikedFoods")} />
          </div>
        </div>
        {mode === "edit" && (
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <input type="checkbox" name="regenerate" className="size-4 accent-primary" />
            Regenerate my weekly workout plan with these settings
          </label>
        )}
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 border-t pt-6">
        {stepped ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {isLast ? (
              <SubmitButton pendingText="Building your plan…">
                Finish & build my plan <Check className="size-4" />
              </SubmitButton>
            ) : (
              <Button type="button" onClick={next}>
                Continue <ArrowRight className="size-4" />
              </Button>
            )}
          </>
        ) : (
          <SubmitButton className="ml-auto" pendingText="Saving…">
            Save changes
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
