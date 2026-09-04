import { describe, expect, it } from "vitest";
import { buildFeedback } from "./consistency-rules";

const base = { planned: 8, completed: 6, adherencePct: 75, currentMissStreak: 0, daysSinceLastWorkout: 1, mostMissedWeekday: null, topReasons: [], hasPlan: true };

describe("consistency feedback rules", () => {
  it("asks for a plan when none exists", () => {
    expect(buildFeedback({ ...base, hasPlan: false })[0]!.title).toMatch(/no plan/i);
  });

  it("praises when on track", () => {
    const fb = buildFeedback(base);
    expect(fb[0]!.tone).toBe("good");
  });

  it("reassures after a single miss and warns after 2-3 in a row", () => {
    expect(buildFeedback({ ...base, currentMissStreak: 1 })[0]!.title).toMatch(/one missed session/i);
    const two = buildFeedback({ ...base, currentMissStreak: 3 })[0]!;
    expect(two.tone).toBe("warn");
    expect(two.text).toMatch(/shorter version/i);
  });

  it("recommends a reset after 4+ misses and flags long gaps", () => {
    const fb = buildFeedback({ ...base, currentMissStreak: 5, daysSinceLastWorkout: 9 });
    expect(fb.some((f) => f.text.match(/reset/i))).toBe(true);
    expect(fb.some((f) => f.title.match(/9 days since/i))).toBe(true);
  });

  it("treats illness/injury gently and notices weekday patterns", () => {
    const fb = buildFeedback({ ...base, currentMissStreak: 2, mostMissedWeekday: "Monday", topReasons: [{ reason: "SICK", label: "Unwell", count: 2 }] });
    expect(fb[0]!.title).toMatch(/rest counts/i);
    expect(fb.some((f) => f.title.match(/mondays/i))).toBe(true);
  });

  it("calls out an unrealistic plan below 50% adherence", () => {
    const fb = buildFeedback({ ...base, planned: 10, completed: 3, adherencePct: 30, currentMissStreak: 1 });
    expect(fb.some((f) => f.title.match(/too ambitious/i))).toBe(true);
  });
});
