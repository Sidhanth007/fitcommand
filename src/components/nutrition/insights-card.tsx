import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight } from "@/lib/tracking/nutrition";
import { cn } from "@/lib/utils";

export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4 text-primary" /> Today&apos;s nutrition insights
        </CardTitle>
        <CardDescription>Rule-based feedback on what you logged — honest, not judgmental. Not medical advice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((i, idx) => (
          <div
            key={idx}
            className={cn(
              "rounded-lg border p-3 text-sm",
              i.tone === "warn" && "border-amber-500/30 bg-amber-500/10",
              i.tone === "good" && "border-emerald-500/30 bg-emerald-500/10",
              i.tone === "info" && "bg-muted/40",
            )}
          >
            <div className="flex items-start gap-2">
              {i.tone === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" /> : i.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <div className="min-w-0">
                <div className="font-medium">{i.title}</div>
                <p className="text-muted-foreground">{i.text}</p>
                {i.swaps && i.swaps.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="self-center text-xs text-muted-foreground">Try instead:</span>
                    {i.swaps.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full border bg-background px-2 py-0.5 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
