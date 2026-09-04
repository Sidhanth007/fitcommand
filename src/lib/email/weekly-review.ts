import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/brevo";
import { completeChat, isAiConfigured } from "@/lib/ai/provider";
import { dayRange, shiftDayKey, toDayKey } from "@/lib/dates";
import { getConsistency } from "@/lib/tracking/consistency";
import { getCaloriesByDay } from "@/lib/tracking/nutrition";
import { getProgressEntries, weightSeries } from "@/lib/tracking/progress";
import { getGoalsWithProgress } from "@/lib/tracking/goals";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function buildWeeklyStats(userId: string, todayKey = toDayKey()) {
  const firstKey = shiftDayKey(todayKey, -6);
  const { start } = dayRange(firstKey);
  const { end } = dayRange(todayKey);
  const [targets, consistency, calories, entries, goals, meals] = await Promise.all([
    db.nutritionTarget.findUnique({ where: { userId } }),
    getConsistency(userId, todayKey, 7),
    getCaloriesByDay(userId, todayKey, 7),
    getProgressEntries(userId, todayKey, 14),
    getGoalsWithProgress(userId, todayKey),
    db.mealLog.findMany({ where: { userId, eatenAt: { gte: start, lt: end } }, select: { name: true, healthScore: true, eatenAt: true } }),
  ]);
  const loggedDays = calories.filter((d) => d.calories > 0);
  const avgCalories = loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.calories, 0) / loggedDays.length) : 0;
  const avgProtein = loggedDays.length ? Math.round(loggedDays.reduce((a, d) => a + d.proteinG, 0) / loggedDays.length) : 0;
  const daysWithinCalories = targets ? loggedDays.filter((d) => d.calories <= targets.calories).length : 0;
  const daysProteinHit = targets ? loggedDays.filter((d) => d.proteinG >= targets.proteinG).length : 0;
  const weights = weightSeries(entries);
  const weekAgo = weights.filter((w) => w.dayKey <= firstKey).at(-1) ?? weights[0];
  const latest = weights.at(-1);
  const weightChange = weekAgo && latest && weekAgo !== latest ? Math.round((latest.weightKg - weekAgo.weightKg) * 10) / 10 : null;
  const treatCounts = new Map<string, number>();
  for (const m of meals) if ((m.healthScore ?? 3) <= 2) treatCounts.set(m.name, (treatCounts.get(m.name) ?? 0) + 1);
  const topTreats = [...treatCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const byDay = new Map<string, number[]>();
  for (const m of meals) {
    const k = toDayKey(m.eatenAt);
    if (m.healthScore != null) byDay.set(k, [...(byDay.get(k) ?? []), m.healthScore]);
  }
  const dayScores = [...byDay.entries()].filter(([, s]) => s.length >= 2).map(([k, s]) => ({ dayKey: k, avg: s.reduce((a, b) => a + b, 0) / s.length }));
  const bestDay = dayScores.sort((a, b) => b.avg - a.avg)[0] ?? null;
  const active = goals.filter((g) => g.goal.status === "ACTIVE").map((g) => ({ title: g.goal.title, percent: g.percent, detail: g.detail }));
  return { firstKey, todayKey, targets, consistency, avgCalories, avgProtein, loggedDays: loggedDays.length, daysWithinCalories, daysProteinHit, weightChange, latestWeight: latest?.weightKg ?? null, topTreats, bestDay, goals: active };
}

export async function buildWeeklyReview(userId: string, todayKey = toDayKey()) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return null;
  const s = await buildWeeklyStats(userId, todayKey);
  const first = user.name.split(" ")[0] ?? user.name;
  const facts = [
    `Training: ${s.consistency.completed}/${s.consistency.planned} planned sessions (${s.consistency.adherencePct}%)${s.consistency.missed ? `, ${s.consistency.missed} missed` : ""}.`,
    s.loggedDays ? `Nutrition: logged ${s.loggedDays}/7 days, avg ${s.avgCalories} kcal and ${s.avgProtein} g protein${s.targets ? ` vs targets ${s.targets.calories} kcal / ${s.targets.proteinG} g` : ""}; ${s.daysWithinCalories} days within calories, ${s.daysProteinHit} days hit protein.` : "Nutrition: no meals logged this week.",
    s.weightChange != null ? `Weight: ${s.weightChange > 0 ? "+" : ""}${s.weightChange} kg this week (now ${s.latestWeight} kg).` : s.latestWeight ? `Weight: ${s.latestWeight} kg (no weekly change recorded).` : "Weight: no weigh-ins.",
    s.topTreats.length ? `Most frequent treat foods: ${s.topTreats.map(([n, c]) => `${n} ×${c}`).join(", ")}.` : "No treat foods logged.",
    s.bestDay ? `Best nutrition day: ${s.bestDay.dayKey}.` : "",
    s.goals.length ? `Goals: ${s.goals.map((g) => `${g.title} ${g.percent}%`).join("; ")}.` : "No active goals.",
  ].filter(Boolean);

  let narrative = "";
  let source: "ai" | "fallback" = "fallback";
  if (isAiConfigured()) {
    try {
      const { text } = await completeChat({
        feature: "chat",
        userId,
        maxOutputTokens: 350,
        system: `You write a weekly fitness & nutrition review for an app user. Tone: warm, honest, specific, no shaming. 120-160 words, plain text, 3 short paragraphs: (1) what went well, (2) what to watch (use the facts), (3) ONE clear focus for next week with a concrete action. No headings, no emojis, no medical claims, no disclaimer (the app adds it).`,
        messages: [{ role: "user", content: `Name: ${first}. Week ${s.firstKey} to ${s.todayKey}.\n${facts.join("\n")}` }],
      });
      if (text.trim().length > 40) {
        narrative = text.trim();
        source = "ai";
      }
    } catch {
      /* fallback */
    }
  }
  if (!narrative) {
    narrative = `${first}, here's your week in numbers.\n\n${facts.join(" ")}\n\nFocus for next week: ${s.consistency.adherencePct < 70 ? "protect your planned sessions — schedule them like meetings and keep the first one short." : s.daysProteinHit < 4 ? "hit your protein on at least 5 days — add a protein source to breakfast." : "keep the routine and add one small progression (a rep or 2.5 kg) to your main lifts."}`;
  }

  const subject = `${env.appName} · your weekly review (${s.firstKey.slice(5)} → ${s.todayKey.slice(5)})`;
  const text = `${narrative}\n\nThe numbers\n${facts.join("\n")}\n\nOpen your progress: ${env.appUrl}/progress\n\n${env.appName} is an AI-powered demo, not medical advice. Manage emails at ${env.appUrl}/reminders.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;padding:28px;border:1px solid #e5e7eb">
    <tr><td style="font-size:14px;font-weight:700;color:#059669;padding-bottom:6px">${esc(env.appName)} · weekly review</td></tr>
    <tr><td style="font-size:20px;font-weight:600;color:#111827;padding-bottom:12px">${esc(s.firstKey)} → ${esc(s.todayKey)}</td></tr>
    <tr><td style="font-size:15px;line-height:1.65;color:#111827;white-space:pre-line">${esc(narrative)}</td></tr>
    <tr><td style="padding-top:18px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280">The numbers</td></tr>
    <tr><td style="font-size:14px;line-height:1.6;color:#374151">${facts.map((f) => `<div>• ${esc(f)}</div>`).join("")}</td></tr>
    <tr><td style="padding-top:20px"><a href="${env.appUrl}/progress" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">See your progress</a></td></tr>
    <tr><td style="padding-top:20px;font-size:12px;color:#6b7280;line-height:1.5">${esc(env.appName)} is an AI-powered demo and not medical advice. Manage these emails at ${env.appUrl}/reminders.</td></tr>
  </table></td></tr></table></body></html>`;
  return { to: { email: user.email, name: user.name }, subject, text, html, source };
}

export async function sendWeeklyReviewToUser(userId: string, todayKey = toDayKey(), opts: { manual?: boolean } = {}) {
  const review = await buildWeeklyReview(userId, todayKey);
  if (!review) return { ok: false as const, error: "User not found" };
  const sent = await sendEmail(review);
  if (sent.ok) {
    await db.motivationLog.create({ data: { userId, dayKey: todayKey, channel: "weekly", subject: review.subject, body: review.text, source: review.source } });
    if (!opts.manual) await db.motivationSetting.updateMany({ where: { userId }, data: { lastWeeklyKey: todayKey } });
  }
  return sent;
}
