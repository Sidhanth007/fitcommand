"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeTourAction } from "@/app/(app)/profile-actions";

type Step = { target: string; title: string; text: string };

const STEPS: Step[] = [
  { target: "#tour-nav", title: "Your command center", text: "Dashboard, Plan, Workouts, Nutrition, Progress, Goals, Reminders, Assistant and Learn — everything lives up here (or in the bottom bar on your phone)." },
  { target: "#tour-tiles", title: "Today at a glance", text: "Calories remaining, protein, water and BMI update live as you log. Targets come from your profile — edit them any time in Profile settings." },
  { target: "#tour-quick", title: "One-tap actions", text: "Log a meal, start today's workout, add a weigh-in, tap +250 ml water, or ask the AI — without hunting through menus." },
  { target: "#tour-today", title: "Today's session", text: "Your plan's workout for today. Start it to log sets with a rest timer, or mark it missed if life happens — the app tracks consistency honestly." },
  { target: "#tour-nutrition", title: "Food, honestly", text: "300+ foods including Indian home cooking, each with a health score. Treats are flagged with healthier swaps, and the insights card tells you what to change." },
  { target: "#tour-week", title: "Your week", text: "Training days are highlighted. Regenerate the plan whenever your schedule or equipment changes." },
  { target: "#tour-bell", title: "Reminders & emails", text: "Set reminders, a daily motivation email at your chosen time, and a Sunday weekly review. The bell shows what's due today." },
  { target: "#tour-assistant", title: "Ask anything", text: "The assistant knows your profile, targets, today's logs and your plan. Try: \"What should I eat for dinner to hit my protein?\" It's AI guidance — never medical advice." },
];

type Rect = { top: number; left: number; width: number; height: number };

export function ProductTour({ autoStart }: { autoStart: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [, startDone] = useTransition();

  const steps = STEPS; // filtered at runtime for missing targets
  const available = useCallback(() => steps.filter((s) => typeof document !== "undefined" && document.querySelector(s.target)), [steps]);
  const [list, setList] = useState<Step[]>([]);

  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => {
      const l = available();
      if (l.length) {
        setList(l);
        setI(0);
        setOpen(true);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [autoStart, available]);

  const measure = useCallback(() => {
    const step = list[i];
    if (!step) return;
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [list, i]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 450); // after smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function finish() {
    setOpen(false);
    startDone(async () => {
      await completeTourAction();
    });
  }
  function next() {
    if (i >= list.length - 1) finish();
    else setI((x) => x + 1);
  }

  if (!open || !rect || !list[i]) return null;
  const step = list[i]!;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cardW = Math.min(360, vw - 24);
  const below = rect.top + rect.height + 12 + 190 < vh;
  const cardTop = below ? rect.top + rect.height + 12 : Math.max(12, rect.top - 12 - 190);
  const cardLeft = Math.min(Math.max(12, rect.left), vw - cardW - 12);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute rounded-xl ring-2 ring-primary transition-all duration-200" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }} />
      <div className="absolute rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl transition-all duration-200" style={{ top: cardTop, left: cardLeft, width: cardW }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">
              Step {i + 1} of {list.length}
            </div>
            <h3 className="text-base font-semibold">{step.title}</h3>
          </div>
          <button type="button" onClick={finish} aria-label="Skip tour" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
            <ArrowLeft className="size-3.5" /> Back
          </Button>
          <div className="flex gap-1">
            {list.map((_, idx) => (
              <span key={idx} className={idx === i ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground/30"} />
            ))}
          </div>
          <Button size="sm" onClick={next}>
            {i >= list.length - 1 ? "Done" : "Next"} {i < list.length - 1 && <ArrowRight className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
