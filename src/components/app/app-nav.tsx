"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Bell, BookOpen, Bot, CalendarDays, Dumbbell, LayoutDashboard, LineChart, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon; soon?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav id="tour-nav" aria-label="App sections" className="border-b bg-background">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4 [scrollbar-width:none]">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          const base = "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors";
          if (it.soon) {
            return (
              <li key={it.href}>
                <span className={cn(base, "cursor-not-allowed border-transparent text-muted-foreground/60")} aria-disabled title="Coming in a later phase">
                  <it.icon className="size-4" /> {it.label}
                </span>
              </li>
            );
          }
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className={cn(base, active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <it.icon className="size-4" /> {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
