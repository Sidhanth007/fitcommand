"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Dumbbell, LayoutDashboard, LineChart, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/nutrition", label: "Food", icon: UtensilsCrossed },
  { href: "/workouts", label: "Train", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/assistant", label: "AI", icon: Bot },
];

/** Thumb-reachable bottom navigation for phones (hidden on md+ where the top nav is used). */
export function MobileBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-muted-foreground")}>
                <it.icon className="size-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
