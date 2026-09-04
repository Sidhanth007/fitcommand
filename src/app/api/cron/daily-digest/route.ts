import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { toDayKey, weekdayOf } from "@/lib/dates";
import { sendDigestToUser } from "@/lib/email/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily digest sender. Vercel Cron calls this once a day with
 * `Authorization: Bearer <CRON_SECRET>`; it can also be triggered manually with the same header.
 */
export async function GET(request: NextRequest) {
  const secret = env.cronSecret;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayKey = toDayKey();
  const weekday = weekdayOf(todayKey);
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);

  // Users with at least one enabled digest reminder scheduled for today, not already sent in the last 20h.
  const reminders = await db.reminder.findMany({
    where: { enabled: true, emailDigest: true, daysOfWeek: { has: weekday }, OR: [{ lastSentAt: null }, { lastSentAt: { lt: since } }], user: { isActive: true, emailVerified: { not: null } } },
    select: { userId: true },
    distinct: ["userId"],
    take: 200, // Brevo free tier: 300 emails/day
  });

  const results: { userId: string; ok: boolean; error?: string }[] = [];
  for (const { userId } of reminders) {
    const r = await sendDigestToUser(userId, todayKey);
    results.push({ userId, ok: r.ok, ...(r.ok ? {} : { error: r.error }) });
  }

  return NextResponse.json({ date: todayKey, sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}
