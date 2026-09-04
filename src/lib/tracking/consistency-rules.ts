/** Pure consistency feedback rules (no server-only imports so they can be unit-tested). */
import type { SkipReason } from "@/generated/prisma/enums";

export type Feedback = { tone: "good" | "info" | "warn"; title: string; text: string };

export function buildFeedback(c: { planned: number; completed: number; adherencePct: number; currentMissStreak: number; daysSinceLastWorkout: number | null; mostMissedWeekday: string | null; topReasons: { reason: SkipReason; label: string; count: number }[]; hasPlan: boolean }): Feedback[] {
  const out: Feedback[] = [];
  if (!c.hasPlan) return [{ tone: "info", title: "No plan yet", text: "Generate a plan first — consistency is measured against your scheduled days." }];
  if (c.planned === 0) return [{ tone: "info", title: "Nothing to judge yet", text: "Your first planned sessions are coming up. Show up for the first one and the streak starts." }];

  const sickOrInjured = c.topReasons.some((r) => r.reason === "SICK" || r.reason === "INJURY");
  if (sickOrInjured) {
    out.push({ tone: "info", title: "Rest counts when you're unwell or hurt", text: "Recovering is the training. Come back with a lighter session, and if pain persists more than a few days, get it checked by a professional before loading it again." });
  }

  if (c.currentMissStreak === 0 && c.completed > 0) {
    out.push({ tone: "good", title: c.adherencePct >= 80 ? "Consistency is excellent" : "You're on track", text: `${c.completed}/${c.planned} planned sessions done (${c.adherencePct}%). Keep the next one easy to say yes to.` });
  } else if (c.currentMissStreak === 1) {
    out.push({ tone: "info", title: "One missed session — no problem", text: "One skip changes nothing. Don't double up tomorrow; just do the next planned session as written." });
  } else if (c.currentMissStreak >= 2 && c.currentMissStreak <= 3) {
    out.push({ tone: "warn", title: `${c.currentMissStreak} planned sessions missed in a row`, text: "This is where habits slip. Do a shorter version of the next session (even 20 minutes), drop weights 10–20%, and don't try to make up the missed days." });
  } else if (c.currentMissStreak >= 4) {
    out.push({ tone: "warn", title: `${c.currentMissStreak} sessions missed in a row`, text: "Time for a reset, not a punishment: restart with one easy full-body session at 60–70% of your usual effort. If the schedule itself isn't realistic, regenerate the plan with fewer days per week." });
  }

  if (c.daysSinceLastWorkout != null && c.daysSinceLastWorkout >= 7) {
    out.push({ tone: "warn", title: `${c.daysSinceLastWorkout} days since your last workout`, text: "After a week off, expect some soreness. Keep the first session back short, and eat enough protein to recover." });
  }
  if (c.mostMissedWeekday) {
    out.push({ tone: "info", title: `${c.mostMissedWeekday}s are your weak spot`, text: `Most misses land on ${c.mostMissedWeekday}. Consider moving that session to a different day or making it the shortest workout of the week.` });
  }
  const busy = c.topReasons.find((r) => r.reason === "BUSY");
  if (busy && busy.count >= 2) out.push({ tone: "info", title: "Busy days keep winning", text: "Try a 20-minute fallback session for busy days — a short workout beats a skipped one." });
  const tired = c.topReasons.find((r) => r.reason === "TIRED" || r.reason === "NO_MOTIVATION");
  if (tired && tired.count >= 2) out.push({ tone: "info", title: "Low energy pattern", text: "Check sleep and daytime food first — training on 5 hours of sleep and skipped meals rarely works. Morning sessions often stick better." });

  if (c.adherencePct < 50 && c.planned >= 4) {
    out.push({ tone: "warn", title: "Plan may be too ambitious", text: `Under half of planned sessions are happening. A 3-day plan you follow beats a 5-day plan you don't — adjust days per week in Profile settings and regenerate.` });
  }
  return out.slice(0, 4);
}
