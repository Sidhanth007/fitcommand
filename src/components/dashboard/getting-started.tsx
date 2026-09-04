import Link from "next/link";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ChecklistItem = { key: string; label: string; href: string; done: boolean };

export function GettingStarted({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <Card id="tour-checklist" className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="size-4 text-primary" /> Getting started · {done}/{items.length}
        </CardTitle>
        <CardDescription>Five small steps to unlock personal insights, charts and better AI answers.</CardDescription>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.key}>
              <Link href={it.href} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60", it.done && "text-muted-foreground line-through")}>
                {it.done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
