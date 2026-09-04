import type { Metadata } from "next";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getExerciseLibrary } from "@/lib/tracking/workouts";
import { isValidDayKey, recentDayOptions } from "@/lib/dates";

export const metadata: Metadata = { title: "Log custom workout" };

export default async function NewWorkoutPage(props: PageProps<"/workouts/new">) {
  const [, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const library = await getExerciseLibrary();
  const dayOptions = recentDayOptions(14);
  const initialDayKey = isValidDayKey(sp.date) && dayOptions.some((d) => d.dayKey === sp.date) ? sp.date : dayOptions[0]!.dayKey;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log a custom workout</h1>
        <p className="text-muted-foreground">Search the exercise library, add sets, and save.</p>
      </div>
      <DisclaimerBanner />
      <WorkoutLogger library={library} dayOptions={dayOptions} initialDayKey={initialDayKey} />
    </div>
  );
}
