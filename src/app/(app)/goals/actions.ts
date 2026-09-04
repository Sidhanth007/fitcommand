"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { goalSchema } from "@/lib/validators/progress";
import type { ActionState } from "@/lib/validators/auth";
import type { GoalStatus } from "@/generated/prisma/enums";

function revalidate() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function createGoalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"] };
  const d = parsed.data;

  // For weight goals, remember the starting weight so progress can be measured.
  let currentValue = 0;
  if (d.type === "TARGET_WEIGHT") {
    const [latest, profile] = await Promise.all([
      db.progressEntry.findFirst({ where: { userId: user.id, weightKg: { not: null } }, orderBy: { date: "desc" }, select: { weightKg: true } }),
      db.profile.findUnique({ where: { userId: user.id }, select: { weightKg: true } }),
    ]);
    currentValue = latest?.weightKg ?? profile?.weightKg ?? 0;
  }

  await db.goal.create({ data: { userId: user.id, type: d.type, title: d.title, targetValue: d.targetValue, unit: d.unit, deadline: d.deadline, currentValue } });
  revalidate();
  return { success: "Goal added." };
}

export async function setGoalStatusAction(id: string, status: GoalStatus): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.goal.updateMany({ where: { id, userId: user.id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null } });
  revalidate();
  return { ok: r.count > 0 };
}

export async function updateCustomProgressAction(id: string, value: number): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const v = z.number().min(0).max(1000000).safeParse(value);
  if (!v.success) return { ok: false };
  const goal = await db.goal.findFirst({ where: { id, userId: user.id, type: "CUSTOM" } });
  if (!goal) return { ok: false };
  const reached = v.data >= goal.targetValue;
  await db.goal.update({ where: { id }, data: { currentValue: v.data, ...(reached && goal.status === "ACTIVE" ? { status: "COMPLETED", completedAt: new Date() } : {}) } });
  revalidate();
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const r = await db.goal.deleteMany({ where: { id, userId: user.id } });
  revalidate();
  return { ok: r.count > 0 };
}
