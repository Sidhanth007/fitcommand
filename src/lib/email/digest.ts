import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/brevo";
import { formatDayKey, toDayKey, weekdayOf } from "@/lib/dates";
import { remindersForToday, REMINDER_META } from "@/lib/tracking/reminders";
import { getStreak } from "@/lib/tracking/progress";
import { getGoalsWithProgress } from "@/lib/tracking/goals";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function buildDigest(userId: string, todayKey = toDayKey()) {
  const [user, targets, plan, reminders, streak, goals] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    db.nutritionTarget.findUnique({ where: { userId } }),
    db.fitnessPlan.findFirst({ where: { userId, isActive: true }, include: { workouts: { include: { exercises: { include: { exercise: { select: { name: true } } }, orderBy: { order: "asc" } } } } } }),
    db.reminder.findMany({ where: { userId, enabled: true } }),
    getStreak(userId, todayKey),
    getGoalsWithProgress(userId, todayKey),
  ]);
  if (!user) return null;

  const workout = plan?.workouts.find((w) => w.dayOfWeek === weekdayOf(todayKey)) ?? null;
  const today = remindersForToday(reminders, todayKey, new Date(0)).filter((r) => r.emailDigest);
  const activeGoals = goals.filter((g) => g.goal.status === "ACTIVE").slice(0, 4);
  const app = env.appName;
  const url = env.appUrl;

  const workoutText = workout ? `${workout.title} (~${workout.estMinutes} min): ${workout.exercises.map((e) => `${e.exercise.name} ${e.sets}×${e.reps}`).join(", ")}` : "Rest day — a light walk and good sleep count.";
  const targetsText = targets ? `${targets.calories} kcal · ${targets.proteinG} g protein · ${(targets.waterMl / 1000).toFixed(1)} L water` : "Complete onboarding to get targets.";
  const remindersText = today.length ? today.map((r) => `${r.timeOfDay} — ${r.title}`).join("\n") : "No reminders scheduled for today.";
  const goalsText = activeGoals.length ? activeGoals.map((g) => `${g.goal.title}: ${g.percent}% — ${g.detail}`).join("\n") : "No active goals.";

  const subject = `${app} · ${formatDayKey(todayKey, { weekday: "long", day: "numeric", month: "short" })}: ${workout ? workout.title : "Rest day"}`;
  const text = `Good morning ${user.name},\n\nToday's workout\n${workoutText}\n\nTargets\n${targetsText}\n\nReminders\n${remindersText}\n\nGoals\n${goalsText}\n\nStreak: ${streak.streak} day${streak.streak === 1 ? "" : "s"}\n\nOpen your dashboard: ${url}/dashboard\n\n${app} is an AI-powered demo and not medical advice.`;

  const section = (title: string, body: string) =>
    `<tr><td style="padding-top:18px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280">${esc(title)}</td></tr><tr><td style="font-size:15px;line-height:1.6;color:#111827">${body}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb">
    <tr><td style="font-size:18px;font-weight:700;color:#059669">${esc(app)}</td></tr>
    <tr><td style="font-size:22px;font-weight:600;padding-top:6px;color:#111827">Good morning, ${esc(user.name.split(" ")[0] ?? user.name)} 👋</td></tr>
    <tr><td style="font-size:14px;color:#6b7280">${esc(formatDayKey(todayKey))} · streak ${streak.streak} day${streak.streak === 1 ? "" : "s"}</td></tr>
    ${section("Today's workout", esc(workoutText))}
    ${section("Targets", esc(targetsText))}
    ${section("Reminders", today.length ? today.map((r) => `<div>${esc(r.timeOfDay)} · ${esc(REMINDER_META[r.type].emoji)} ${esc(r.title)}</div>`).join("") : "No reminders scheduled for today.")}
    ${section("Goals", activeGoals.length ? activeGoals.map((g) => `<div><strong>${esc(g.goal.title)}</strong> — ${g.percent}%<br><span style="color:#6b7280;font-size:13px">${esc(g.detail)}</span></div>`).join("") : "No active goals.")}
    <tr><td style="padding-top:24px"><a href="${url}/dashboard" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Open dashboard</a></td></tr>
    <tr><td style="padding-top:24px;font-size:12px;color:#6b7280;line-height:1.5">${esc(app)} is an AI-powered informational demo and not a substitute for professional medical or nutrition advice. Manage reminders at ${url}/reminders.</td></tr>
  </table></td></tr></table></body></html>`;

  return { to: { email: user.email, name: user.name }, subject, html, text };
}

export async function sendDigestToUser(userId: string, todayKey = toDayKey()) {
  const digest = await buildDigest(userId, todayKey);
  if (!digest) return { ok: false as const, error: "User not found" };
  const sent = await sendEmail(digest);
  if (sent.ok) {
    await db.reminder.updateMany({ where: { userId, emailDigest: true, enabled: true }, data: { lastSentAt: new Date() } });
  }
  return sent;
}
