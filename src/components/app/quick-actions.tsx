"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Bot, Droplets, Dumbbell, Scale, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { addWaterAction } from "@/app/(app)/nutrition/actions";
import { cn } from "@/lib/utils";

type Props = { dayKey: string; waterMl: number; targetMl: number; workoutHref: string | null };

export function QuickActions({ dayKey, waterMl, targetMl, workoutHref }: Props) {
  const [pending, start] = useTransition();
  const [water, setWater] = useOptimistic(waterMl, (cur: number, d: number) => Math.max(0, cur + d));
  const items = [
    { href: "/nutrition", label: "Log meal", icon: UtensilsCrossed },
    { href: workoutHref ?? "/workouts/new", label: workoutHref ? "Start workout" : "Log workout", icon: Dumbbell },
    { href: "/progress", label: "Weigh-in", icon: Scale },
    { href: "/assistant", label: "Ask AI", icon: Bot },
  ];
  return (
    <div id="tour-quick" className="grid grid-cols-5 gap-2">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center text-xs hover:bg-muted/60">
          <it.icon className="size-5 text-primary" />
          {it.label}
        </Link>
      ))}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setWater(250);
            const r = await addWaterAction(dayKey, 250);
            if (!r.ok) toast.error("Couldn't log water.");
          })
        }
        className={cn("flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center text-xs hover:bg-muted/60", pending && "opacity-70")}
        aria-label="Add 250 ml of water"
      >
        <Droplets className="size-5 text-sky-500" />
        <span>+250 ml</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {(water / 1000).toFixed(1)}/{(targetMl / 1000).toFixed(1)} L
        </span>
      </button>
    </div>
  );
}
