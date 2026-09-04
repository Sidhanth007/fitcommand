import type { Metadata } from "next";
import { Bell, Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { ReminderList, SendDigestButton, type ReminderView } from "@/components/reminders/reminder-list";
import { MotivationCard } from "@/components/reminders/motivation-card";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getReminders, REMINDER_META, remindersForToday } from "@/lib/tracking/reminders";
import { APP_TZ, toDayKey } from "@/lib/dates";
import { REMINDER_TYPES } from "@/lib/validators/progress";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const { user } = await requireOnboarded();
  const todayKey = toDayKey();
  const [reminders, motivation, motivationLogs] = await Promise.all([
    getReminders(user.id),
    db.motivationSetting.findUnique({ where: { userId: user.id } }),
    db.motivationLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5, select: { dayKey: true, subject: true, body: true, source: true, channel: true } }),
  ]);
  const today = remindersForToday(reminders, todayKey);
  const types = REMINDER_TYPES.map((t) => ({ value: t, ...REMINDER_META[t] }));
  const views: ReminderView[] = reminders.map((r) => ({ id: r.id, type: r.type, emoji: REMINDER_META[r.type].emoji, title: r.title, timeOfDay: r.timeOfDay, daysOfWeek: r.daysOfWeek, emailDigest: r.emailDigest, enabled: r.enabled, lastSentAt: r.lastSentAt?.toISOString() ?? null }));
  const digestEnabled = reminders.some((r) => r.enabled && r.emailDigest);
  const lastSent = reminders.map((r) => r.lastSentAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">Times are in {APP_TZ.replace("_", " ")}. In-app nudges plus an optional morning email.</p>
        </div>
        <div className="flex gap-2">
          <SendDigestButton />
          <ReminderForm types={types} />
        </div>
      </div>

      <DisclaimerBanner />

      <MotivationCard
        initial={motivation ? { enabled: motivation.enabled, timeOfDay: motivation.timeOfDay, daysOfWeek: motivation.daysOfWeek, weeklyReview: motivation.weeklyReview } : null}
        email={user.email}
        lastSent={motivation?.lastSentAt ? motivation.lastSentAt.toLocaleString("en-GB", { timeZone: APP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null}
        recent={motivationLogs}
        appRunningNote={`Times are in ${APP_TZ.replace("_", " ")}. Scheduled sends run while the app server is running (a built-in scheduler checks every minute); once deployed, a free cron pinger calls /api/cron/dispatch instead.`}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" /> All reminders
              </CardTitle>
              <CardDescription>Toggle to pause, bin to delete.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderList reminders={views} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" /> Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {today.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
              ) : (
                <ul className="space-y-2">
                  {today.map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{REMINDER_META[r.type].emoji}</span> {r.title}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {r.timeOfDay}
                        <Badge variant={r.status === "due" ? "default" : "secondary"}>{r.status === "due" ? "Due" : "Upcoming"}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4 text-primary" /> Morning email digest
              </CardTitle>
              <CardDescription>One email a day with your workout, targets, reminders and goals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Status: <span className="font-medium">{digestEnabled ? "on" : "off"}</span> — {digestEnabled ? "at least one reminder is marked for the digest." : "mark a reminder “Include in my morning email digest” to enable it."}
              </p>
              {lastSent && <p className="text-muted-foreground">Last sent {lastSent.toLocaleString("en-GB", { timeZone: APP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.</p>}
              <p className="text-xs text-muted-foreground">Automatic sending runs once a day after deployment (Vercel Cron). Locally, use &ldquo;Send my digest now&rdquo; (max 3 per hour).</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
