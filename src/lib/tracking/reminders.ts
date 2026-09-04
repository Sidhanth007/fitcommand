import "server-only";
import { db } from "@/lib/db";
import { APP_TZ, weekdayOf } from "@/lib/dates";
import type { Reminder } from "@/generated/prisma/client";
import type { ReminderType } from "@/generated/prisma/enums";

export const REMINDER_META: Record<ReminderType, { label: string; emoji: string; defaultTitle: string }> = {
  WORKOUT: { label: "Workout", emoji: "🏋️", defaultTitle: "Time to train" },
  MEAL: { label: "Meal", emoji: "🍽️", defaultTitle: "Log your meal" },
  WATER: { label: "Water", emoji: "💧", defaultTitle: "Drink a glass of water" },
  WEIGH_IN: { label: "Weigh-in", emoji: "⚖️", defaultTitle: "Morning weigh-in" },
  CUSTOM: { label: "Custom", emoji: "🔔", defaultTitle: "" },
};

export function getReminders(userId: string) {
  return db.reminder.findMany({ where: { userId }, orderBy: [{ enabled: "desc" }, { timeOfDay: "asc" }] });
}

/** Current HH:mm in the app timezone. */
export function nowHHmm(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export type TodayReminder = Reminder & { status: "due" | "upcoming" };

/** Reminders scheduled for today, tagged as due (time passed) or upcoming. */
export function remindersForToday(reminders: Reminder[], todayKey: string, now = new Date()): TodayReminder[] {
  const weekday = weekdayOf(todayKey);
  const current = nowHHmm(now);
  return reminders
    .filter((r) => r.enabled && r.daysOfWeek.includes(weekday))
    .map((r) => ({ ...r, status: (r.timeOfDay <= current ? "due" : "upcoming") as "due" | "upcoming" }))
    .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
}
