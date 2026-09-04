import "server-only";
import { db } from "@/lib/db";
import { dayRange, shiftDayKey, toDayKey } from "@/lib/dates";

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getAdminOverview() {
  const todayKey = toDayKey();
  const d7 = since(7);
  const d30 = since(30);
  const [users, verified, disabled, new7, new30, workouts7, meals7, ai7, aiAll, digest24, activeMealUsers, activeWorkoutUsers, chat7, skips7, goals] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { isActive: false } }),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.workoutLog.count({ where: { performedAt: { gte: d7 } } }),
    db.mealLog.count({ where: { createdAt: { gte: d7 } } }),
    db.aiUsage.aggregate({ where: { createdAt: { gte: d7 } }, _count: { _all: true }, _avg: { latencyMs: true }, _sum: { inputTokens: true, outputTokens: true } }),
    db.aiUsage.aggregate({ _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } }),
    db.reminder.count({ where: { lastSentAt: { gte: since(1) } } }),
    db.mealLog.findMany({ where: { createdAt: { gte: d7 } }, distinct: ["userId"], select: { userId: true } }),
    db.workoutLog.findMany({ where: { createdAt: { gte: d7 } }, distinct: ["userId"], select: { userId: true } }),
    db.chatMessage.count({ where: { createdAt: { gte: d7 }, role: "USER" } }),
    db.workoutSkip.count({ where: { createdAt: { gte: d7 } } }),
    db.goal.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const aiFailed7 = await db.aiUsage.count({ where: { createdAt: { gte: d7 }, success: false } });
  const activeUsers7 = new Set([...activeMealUsers.map((m) => m.userId), ...activeWorkoutUsers.map((w) => w.userId)]).size;

  // Signups per day (30 days) and AI calls per day (14 days).
  const [recentUsers, recentAi] = await Promise.all([
    db.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
    db.aiUsage.findMany({ where: { createdAt: { gte: since(14) } }, select: { createdAt: true, success: true } }),
  ]);
  const signupsByDay = Array.from({ length: 30 }, (_, i) => shiftDayKey(todayKey, -(29 - i))).map((dayKey) => ({ dayKey, count: recentUsers.filter((u) => toDayKey(u.createdAt) === dayKey).length }));
  const aiByDay = Array.from({ length: 14 }, (_, i) => shiftDayKey(todayKey, -(13 - i))).map((dayKey) => {
    const rows = recentAi.filter((a) => toDayKey(a.createdAt) === dayKey);
    return { dayKey, count: rows.length, failed: rows.filter((r) => !r.success).length };
  });

  const topFoodsRaw = await db.mealLog.groupBy({ by: ["name"], _count: { _all: true }, orderBy: { _count: { name: "desc" } }, take: 8, where: { createdAt: { gte: d30 } } });
  const topFoods = topFoodsRaw.map((f) => ({ name: f.name, count: f._count._all }));

  const recentSignups = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, createdAt: true, emailVerified: true } });
  const { start: todayStart } = dayRange(todayKey);
  const todayLogins = await db.user.count({ where: { lastLoginAt: { gte: todayStart } } });

  return {
    users,
    verified,
    disabled,
    new7,
    new30,
    activeUsers7,
    todayLogins,
    workouts7,
    meals7,
    chat7,
    skips7,
    ai7: { calls: ai7._count._all, avgLatencyMs: Math.round(ai7._avg.latencyMs ?? 0), failed: aiFailed7, inputTokens: ai7._sum.inputTokens ?? 0, outputTokens: ai7._sum.outputTokens ?? 0 },
    aiAll: { calls: aiAll._count._all, inputTokens: aiAll._sum.inputTokens ?? 0, outputTokens: aiAll._sum.outputTokens ?? 0 },
    digest24,
    goals: Object.fromEntries(goals.map((g) => [g.status, g._count._all])) as Record<string, number>,
    signupsByDay,
    aiByDay,
    topFoods,
    recentSignups,
  };
}

export async function getAdminUsers(q: string) {
  const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  return db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      profile: { select: { goal: true, onboardingDone: true } },
      _count: { select: { workoutLogs: true, mealLogs: true, chatMessages: true, sessions: true } },
    },
  });
}
