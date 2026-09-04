import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { WorkoutCard } from "@/components/plan/workout-card";
import { RegenerateButton } from "@/components/plan/regenerate-button";
import { AiPlanNotes } from "@/components/plan/ai-notes";
import { isAiConfigured } from "@/lib/ai/provider";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getActivePlan } from "@/lib/engine/plan-service";
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, labelOf } from "@/lib/engine/options";

export const metadata: Metadata = { title: "Weekly plan" };

export default async function PlanPage() {
  const { user, profile } = await requireOnboarded();
  const plan = await getActivePlan(user.id);
  const today = new Date().getDay();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{plan?.title ?? "Your weekly plan"}</h1>
          <p className="text-muted-foreground">
            {labelOf(GOAL_OPTIONS, profile.goal)} · {labelOf(EXPERIENCE_OPTIONS, profile.experience)} · {profile.daysPerWeek} days/week · ~{profile.sessionMinutes} min
            {plan ? ` · week ${plan.weekNumber}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/settings/profile" />}>
            Adjust preferences
          </Button>
          <RegenerateButton />
        </div>
      </div>

      <DisclaimerBanner />

      <div className="grid gap-4 lg:grid-cols-2">
        {plan?.summary && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">{plan.summary}</CardContent>
          </Card>
        )}
        <AiPlanNotes notes={plan?.aiNotes ?? null} configured={isAiConfigured()} />
      </div>

      {plan && plan.workouts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {plan.workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} highlight={w.dayOfWeek === today} showInstructions />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">No plan yet — use “Regenerate plan” to build one.</CardContent>
        </Card>
      )}
    </div>
  );
}
