import { describe, expect, it } from "vitest";
import { suggestProgression } from "./progression";

const set = (reps: number | null, weightKg: number | null, completed = true, durationSec: number | null = null) => ({ reps, weightKg, durationSec, completed });

describe("progressive overload suggestions", () => {
  it("returns null with no completed sets", () => {
    expect(suggestProgression("8-12", [set(10, 20, false)], false)).toBeNull();
  });

  it("suggests more weight when every set hit the top of the range", () => {
    const p = suggestProgression("8-12", [set(12, 20), set(12, 20), set(12, 20)], false)!;
    expect(p.suggestedWeightKg).toBe(22.5);
    expect(p.lastTime).toBe("3×12 @ 20 kg");
  });

  it("uses ~5% jumps rounded to plates for heavier loads", () => {
    const p = suggestProgression("8-12", [set(12, 80), set(12, 80)], false)!;
    expect(p.suggestedWeightKg).toBe(85);
  });

  it("keeps the weight and targets the bottom of the range when reps fell short", () => {
    const p = suggestProgression("8-12", [set(6, 30), set(5, 30)], false)!;
    expect(p.suggestedWeightKg).toBe(30);
    expect(p.suggestion).toMatch(/aim for 8\+/i);
  });

  it("adds reps for bodyweight work", () => {
    const p = suggestProgression("12-15", [set(15, null), set(15, null)], true)!;
    expect(p.suggestedReps).toBe(17);
    expect(p.suggestedWeightKg).toBeNull();
  });

  it("nudges timed holds by 5 seconds", () => {
    const p = suggestProgression("30s", [set(null, null, true, 30), set(null, null, true, 30)], true)!;
    expect(p.suggestedDurationSec).toBe(35);
  });
});
