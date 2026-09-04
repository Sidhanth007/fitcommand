import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import {
  Activity,
  Apple,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Dumbbell,
  Flame,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const features = [
  {
    icon: Dumbbell,
    title: "Personalized fitness plans",
    text: "Weekly workouts built from your goal, experience, schedule and available equipment.",
  },
  {
    icon: Apple,
    title: "Nutrition & meal guidance",
    text: "Calorie and macro targets with meal ideas that respect your dietary preferences and allergies.",
  },
  {
    icon: Activity,
    title: "Workout tracking",
    text: "Log sets, reps, weights and duration. Watch strength and consistency climb week over week.",
  },
  {
    icon: BarChart3,
    title: "Progress dashboards",
    text: "Weight trends, body measurements, streaks and macro adherence in clear visual statistics.",
  },
  {
    icon: Target,
    title: "Goals that adapt",
    text: "Set targets for weight, workouts per week, protein or water — and see progress toward each.",
  },
  {
    icon: Bell,
    title: "Smart reminders",
    text: "Workout, meal, hydration and weigh-in nudges, in-app or as a daily email digest.",
  },
];

const steps = [
  { n: "01", title: "Tell us about you", text: "Age, body stats, goal, activity level, experience, diet and equipment." },
  { n: "02", title: "Get your command center", text: "Instant calorie & macro targets plus a weekly training plan tailored to you." },
  { n: "03", title: "Track & improve", text: "Log workouts and meals, ask the AI assistant, and adjust as you progress." },
];

export default async function HomePage() {
  const signedIn = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"
          />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-24">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="size-3.5" /> AI-assisted · Demo application
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your personal fitness &amp; nutrition{" "}
                <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  command center
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Personalized workout plans, calorie and macro targets, meal ideas, progress tracking and an
                AI assistant that answers your fitness questions — all in one place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" nativeButton={false} render={<Link href={signedIn ? "/dashboard" : "/register"} />}>
                  {signedIn ? "Open your dashboard" : "Create free account"}
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/#how-it-works" />}>
                  See how it works
                </Button>
              </div>
              <DisclaimerBanner className="max-w-xl" />
            </div>

            {/* Preview card */}
            <div className="relative">
              <Card className="shadow-xl">
                <CardHeader className="pb-2">
                  <CardDescription>Today&apos;s snapshot</CardDescription>
                  <CardTitle className="text-xl">Push Day · 45 min</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Calories", value: "2,150", icon: Flame },
                      { label: "Protein", value: "160 g", icon: Apple },
                      { label: "Streak", value: "12 days", icon: CheckCircle2 },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border bg-muted/40 p-3">
                        <s.icon className="mx-auto mb-1 size-4 text-primary" />
                        <div className="text-lg font-semibold">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Dumbbell Bench Press", "4 × 8–10"],
                      ["Overhead Press", "3 × 8–12"],
                      ["Lateral Raise", "3 × 12–15"],
                    ].map(([name, sets]) => (
                      <div key={name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span>{name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{sets}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm">
                    <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">AI tip:</span> You&apos;re 40 g short on protein today — a Greek
                      yogurt with almonds would close the gap.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything in one dashboard</h2>
              <p className="mt-3 text-muted-foreground">
                Built around your goals, activity level, preferences and experience.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <CardDescription>{f.text}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-3 text-muted-foreground">Three steps from sign-up to your first tailored plan.</p>
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="relative rounded-2xl border p-6">
                  <span className="font-mono text-sm text-primary">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* AI assistant */}
        <section id="assistant" className="border-t bg-muted/20 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Badge variant="secondary" className="gap-1.5">
                <Bot className="size-3.5" /> AI Assistant
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ask anything about training or food</h2>
              <p className="text-muted-foreground">
                The assistant knows your profile, targets and recent logs, so its suggestions are personal:
                &ldquo;What should I eat after tonight&apos;s leg day?&rdquo; or &ldquo;Swap my Thursday
                workout for something without equipment.&rdquo;
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  "Personalized meal and workout suggestions",
                  "Clear explanations of calories, macros and progressive overload",
                  "Always labelled as AI guidance — never a medical diagnosis",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
              <DisclaimerBanner />
            </div>
            <Card>
              <CardContent className="space-y-3 pt-6 text-sm">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground">
                  I only have 20 minutes today and no equipment. What can I do?
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  <p>
                    Here&apos;s a 20-minute bodyweight circuit matched to your intermediate level: 4 rounds of
                    squats ×15, push-ups ×12, walking lunges ×10/leg, mountain climbers 30 s, plank 40 s. Rest 60 s
                    between rounds.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    AI-generated suggestion. Stop if you feel pain and consult a professional for medical concerns.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to take command?</h2>
            <p className="mt-3 text-muted-foreground">
              Create a free account, verify your email, and get your personalized plan in under two minutes.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                Get started
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                I already have an account
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
