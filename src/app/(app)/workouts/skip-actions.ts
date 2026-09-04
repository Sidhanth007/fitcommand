"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { dayRange, isValidDayKey, toDayKey } from "@/lib/dates";

const schema = z.object({
  dayKey: z.string().refine(isValidDayKey, "Invalid date"),
  reason: z.enum(["TIRED", "BUSY", "SICK", "TRAVEL", "NO_MOTIVATION", "INJURY", "OTHER"]),
  note: z.string().trim().max(200).optional().transform((v) => v || null),
  planWorkoutId: z.string().optional().nullable(),
});

function revalidate() {
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}

export async function markSkipAction(input: { dayKey: string; reason: string; note?: string; planWorkoutId?: string | null }): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { dayKey, reason, note, planWorkoutId } = parsed.data;
  if (dayKey > toDayKey()) return { ok: false, message: "You can't mark a future day as missed." };

  const { start, end } = dayRange(dayKey);
  const logged = await db.workoutLog.count({ where: { userId: user.id, performedAt: { gte: start, lt: end } } });
  if (logged > 0) return { ok: false, message: "You logged a workout that day — it isn't a miss." };

  await db.workoutSkip.upsert({
    where: { userId_date: { userId: user.id, date: start } },
    update: { reason, note, planWorkoutId: planWorkoutId ?? null },
    create: { userId: user.id, date: start, reason, note, planWorkoutId: planWorkoutId ?? null },
  });
  revalidate();
  return { ok: true, message: "Marked as missed. No guilt — just pick up the next session." };
}

export async function undoSkipAction(dayKey: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isValidDayKey(dayKey)) return { ok: false };
  const { start } = dayRange(dayKey);
  const r = await db.workoutSkip.deleteMany({ where: { userId: user.id, date: start } });
  revalidate();
  return { ok: r.count > 0 };
}
