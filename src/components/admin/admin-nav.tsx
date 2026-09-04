"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, BarChart3, BookOpen, ClipboardList, Dumbbell, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/foods", label: "Foods", icon: Apple },
  { href: "/admin/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/admin/templates", label: "Plan templates", icon: ClipboardList },
  { href: "/admin/articles", label: "Articles", icon: BookOpen },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1 [scrollbar-width:none]">
      {items.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <it.icon className="size-4" /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
