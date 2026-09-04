"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { sendDigestToUser } from "@/lib/email/digest";
import { rateLimit } from "@/lib/rate-limit";
import { reminderSchema } from "@/lib/validators/progress";
import type { ActionState } from "@/lib/validators/auth";

function revalidate() {
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function createReminderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = {
    type: formData.get("type"),
    title: formData.get("title"),
    timeOfDay: formData.get("timeOfDay"),
    daysOfWeek: formData.getAll("daysOfWeek"),
    emailDigest: formData.get("emailDigest") === "on",
  };
  const parsed = reminderSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"] };
  const count = await db.reminder.count({ where: { userId: user.id } });
  if (count >= 20) return { error: "You can have up to 20 reminders." };
  await db.reminder.create({ data: { userId: user.id, ...parsed.data } });
  revalidate();
  return { success: "Reminder added." };
}

export async function toggleReminderAction(id: string, enabled: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.reminder.updateMany({ where: { id, userId: user.id }, data: { enabled } });
  revalidate();
  return { ok: r.count > 0 };
}

export async function deleteReminderAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.reminder.deleteMany({ where: { id, userId: user.id } });
  revalidate();
  return { ok: r.count > 0 };
}

const motivationSchema = z.object({
  enabled: z.boolean(),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time"),
  daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one day"),
  weeklyReview: z.boolean().default(true),
});

export async function sendWeeklyReviewNowAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const limit = rateLimit(`weekly:${user.id}`, 2, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: `Up to 2 test reviews per hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const { sendWeeklyReviewToUser } = await import("@/lib/email/weekly-review");
  const r = await sendWeeklyReviewToUser(user.id, undefined, { manual: true });
  revalidatePath("/reminders");
  if (!r.ok) return { ok: false, message: r.error };
  return { ok: true, message: "devFallback" in r && r.devFallback ? "Email service not configured — review printed to the server console." : `Weekly review sent to ${user.email}.` };
}

export async function saveMotivationAction(input: { enabled: boolean; timeOfDay: string; daysOfWeek: number[]; weeklyReview?: boolean }): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const parsed = motivationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const existing = await db.motivationSetting.findUnique({ where: { userId: user.id } });
  // If the time moved later than the last send today, allow a fresh send today by clearing the marker when time changed.
  const resetMarker = existing && existing.timeOfDay !== parsed.data.timeOfDay;
  await db.motivationSetting.upsert({
    where: { userId: user.id },
    update: { ...parsed.data, ...(resetMarker ? { lastSentDayKey: null } : {}) },
    create: { userId: user.id, ...parsed.data },
  });
  revalidatePath("/reminders");
  return { ok: true, message: parsed.data.enabled ? `Daily motivation email set for ${parsed.data.timeOfDay}.` : "Daily motivation email turned off." };
}

export async function sendMotivationNowAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const limit = rateLimit(`motivation:${user.id}`, 3, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: `Up to 3 test messages per hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const { sendMotivationToUser } = await import("@/lib/motivation");
  const r = await sendMotivationToUser(user.id, undefined, { manual: true });
  revalidatePath("/reminders");
  if (!r.ok) return { ok: false, message: r.error };
  return { ok: true, message: "devFallback" in r && r.devFallback ? "Email service not configured — message printed to the server console." : `Sent to ${user.email}. Check your inbox (and spam).` };
}

export async function sendDigestNowAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const limit = rateLimit(`digest:${user.id}`, 3, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: `You can send up to 3 test digests per hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
  const r = await sendDigestToUser(user.id);
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath("/reminders");
  return { ok: true, message: "devFallback" in r && r.devFallback ? "Email service not configured — digest printed to the server console." : `Digest sent to ${user.email}.` };
}
