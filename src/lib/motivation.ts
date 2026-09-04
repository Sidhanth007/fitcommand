import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/brevo";
import { completeChat, isAiConfigured } from "@/lib/ai/provider";
import { buildUserContext } from "@/lib/ai/context";
import { toDayKey, weekdayOf } from "@/lib/dates";
import { nowHHmm } from "@/lib/tracking/reminders";
import { getConsistency } from "@/lib/tracking/consistency";
import { getStreak } from "@/lib/tracking/progress";
import { DAY_NAMES } from "@/lib/engine/options";

const FALLBACKS = [
  "Discipline is choosing what you want most over what you want now. Today's session is that choice.",
  "You don't need motivation to start — you need to start, and motivation follows.",
  "Small hinges swing big doors. One workout today is the hinge.",
  "The body keeps the score of every session you show up for. Add one more.",
  "Consistency beats intensity. Show up, do the work, go home proud.",
  "A year from now you'll wish you had started today. Good news: today is here.",
  "You're one workout away from a better mood. That's a very good deal.",
  "Rest days are earned by training days. Let's earn one.",
  "Progress hides in the ordinary sessions nobody sees. Do the ordinary session.",
  "Every rep is a vote for the person you're becoming.",
];

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type MotivationMessage = { subject: string; text: string; html: string; source: "ai" | "fallback" };

/** Compose a short personal motivation message (AI with a rule-based fallback). */
export async function buildMotivationMessage(userId: string, todayKey = toDayKey()): Promise<MotivationMessage | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return null;
  const first = user.name.split(" ")[0] ?? user.name;
  const [plan, streak, consistency] = await Promise.all([
    db.fitnessPlan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" }, include: { workouts: { select: { dayOfWeek: true, title: true, estMinutes: true } } } }),
    getStreak(userId, todayKey),
    getConsistency(userId, todayKey, 28),
  ]);
  const today = plan?.workouts.find((w) => w.dayOfWeek === weekdayOf(todayKey));
  const dayName = DAY_NAMES[weekdayOf(todayKey)];

  let body = "";
  let source: MotivationMessage["source"] = "fallback";
  if (isAiConfigured()) {
    try {
      const context = await buildUserContext(userId);
      const { text } = await completeChat({
        feature: "chat",
        userId,
        maxOutputTokens: 220,
        system: `You write one short, warm, specific daily motivation message for a fitness app user. Rules: 60-90 words, plain text, no headings, no emojis except at most one, no medical claims, never shame. Mention today's planned session (or that it's a rest day) and, if relevant, the streak or a recent miss with an encouraging reframe. End with a single concrete first step for today. Do NOT add any disclaimer — the app adds it.\n\nUSER DATA:\n${context}`,
        messages: [{ role: "user", content: `Write today's (${dayName}) motivation message for ${first}.` }],
      });
      if (text.trim().length > 30) {
        body = text.trim();
        source = "ai";
      }
    } catch {
      /* fall through to fallback */
    }
  }
  if (!body) {
    const quote = FALLBACKS[(todayKey.split("-").reduce((a, b) => a + Number(b), 0) + userId.length) % FALLBACKS.length]!;
    const sessionLine = today ? `Today is ${today.title} (~${today.estMinutes} min).` : `Today is a rest day — a walk and good food still count.`;
    const streakLine = streak.streak >= 2 ? `You're on a ${streak.streak}-day streak; keep the chain going.` : consistency.currentMissStreak >= 2 ? `You've missed ${consistency.currentMissStreak} planned sessions — no guilt, just make today a short, easy win.` : "One session at a time.";
    body = `${first}, ${sessionLine} ${streakLine}\n\n"${quote}"\n\nFirst step: put on your shoes and set a 20-minute timer.`;
  }

  const subject = today ? `${env.appName} · ${dayName}: ${today.title} is on the plan 💪` : `${env.appName} · ${dayName}: rest, refuel, recover`;
  const text = `${body}\n\nOpen your dashboard: ${env.appUrl}/dashboard\n\n${env.appName} is an AI-powered demo, not medical advice. Manage these messages at ${env.appUrl}/reminders.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
    <tr><td style="font-size:14px;font-weight:700;color:#059669;padding-bottom:10px">${esc(env.appName)} · daily motivation</td></tr>
    <tr><td style="font-size:16px;line-height:1.65;color:#111827;white-space:pre-line">${esc(body)}</td></tr>
    <tr><td style="padding-top:20px"><a href="${env.appUrl}/dashboard" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${today ? "Start today's session" : "Open dashboard"}</a></td></tr>
    <tr><td style="padding-top:20px;font-size:12px;color:#6b7280;line-height:1.5">${esc(env.appName)} is an AI-powered demo and not medical advice. Change the time or turn these off at ${env.appUrl}/reminders.</td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html, source };
}

/** Send today's motivation email to one user and record it. */
export async function sendMotivationToUser(userId: string, todayKey = toDayKey(), opts: { manual?: boolean } = {}) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  const message = await buildMotivationMessage(userId, todayKey);
  if (!user || !message) return { ok: false as const, error: "User not found" };
  const sent = await sendEmail({ to: { email: user.email, name: user.name }, subject: message.subject, html: message.html, text: message.text });
  if (sent.ok) {
    await db.motivationLog.create({ data: { userId, dayKey: todayKey, subject: message.subject, body: message.text, source: message.source } });
    if (!opts.manual) await db.motivationSetting.updateMany({ where: { userId }, data: { lastSentDayKey: todayKey, lastSentAt: new Date() } });
  }
  return sent;
}

/**
 * Send every motivation email that is due right now: enabled, scheduled for today,
 * time has passed, and not yet sent today. Idempotent — safe to call every minute.
 */
export async function dispatchDueMotivation(now = new Date()) {
  const todayKey = toDayKey(now);
  const current = nowHHmm(now);
  const weekday = weekdayOf(todayKey);
  const due = await db.motivationSetting.findMany({
    where: { enabled: true, timeOfDay: { lte: current }, daysOfWeek: { has: weekday }, OR: [{ lastSentDayKey: null }, { lastSentDayKey: { not: todayKey } }], user: { isActive: true, emailVerified: { not: null } } },
    select: { userId: true },
    take: 100,
  });
  const results: { userId: string; ok: boolean; error?: string }[] = [];
  for (const { userId } of due) {
    // Claim first so concurrent dispatchers don't double-send.
    const claimed = await db.motivationSetting.updateMany({ where: { userId, OR: [{ lastSentDayKey: null }, { lastSentDayKey: { not: todayKey } }] }, data: { lastSentDayKey: todayKey } });
    if (claimed.count === 0) continue;
    const r = await sendMotivationToUser(userId, todayKey);
    // On failure we keep today's claim: retrying every minute would spam the email/AI quotas.
    // The user can still use "Send me one now", and tomorrow's send proceeds normally.
    if (!r.ok) console.error(`[scheduler] motivation email failed for ${userId}: ${r.error}`);
    results.push({ userId, ok: r.ok, ...(r.ok ? {} : { error: r.error }) });
  }
  // Sunday weekly reviews (same time-of-day as the motivation email).
  const weekly = { sent: 0, failed: 0 };
  if (weekday === 0) {
    const dueWeekly = await db.motivationSetting.findMany({
      where: { weeklyReview: true, timeOfDay: { lte: current }, OR: [{ lastWeeklyKey: null }, { lastWeeklyKey: { not: todayKey } }], user: { isActive: true, emailVerified: { not: null } } },
      select: { userId: true },
      take: 100,
    });
    const { sendWeeklyReviewToUser } = await import("@/lib/email/weekly-review");
    for (const { userId } of dueWeekly) {
      const claimed = await db.motivationSetting.updateMany({ where: { userId, OR: [{ lastWeeklyKey: null }, { lastWeeklyKey: { not: todayKey } }] }, data: { lastWeeklyKey: todayKey } });
      if (claimed.count === 0) continue;
      const r = await sendWeeklyReviewToUser(userId, todayKey);
      if (r.ok) weekly.sent += 1;
      else {
        weekly.failed += 1;
        console.error(`[scheduler] weekly review failed for ${userId}: ${r.error}`);
      }
    }
  }

  return { date: todayKey, time: current, sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, weekly, results };
}
