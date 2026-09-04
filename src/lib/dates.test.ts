import { describe, expect, it } from "vitest";
import { dayRange, formatDayKey, isValidDayKey, shiftDayKey, toDayKey, weekdayOf } from "./dates";

describe("day-key helpers (Asia/Kolkata)", () => {
  it("formats instants into the app timezone day", () => {
    // 2026-08-31T20:00Z is already 2026-09-01 01:30 in IST
    expect(toDayKey(new Date("2026-08-31T20:00:00Z"))).toBe("2026-09-01");
    expect(toDayKey(new Date("2026-08-31T10:00:00Z"))).toBe("2026-08-31");
  });

  it("builds day ranges that start at local midnight", () => {
    const { start, end } = dayRange("2026-08-31");
    expect(start.toISOString()).toBe("2026-08-30T18:30:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(86400000);
  });

  it("shifts and validates keys", () => {
    expect(shiftDayKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(isValidDayKey("2026-08-31")).toBe(true);
    expect(isValidDayKey("31-08-2026")).toBe(false);
    expect(isValidDayKey(42)).toBe(false);
  });

  it("knows weekdays and formats labels", () => {
    expect(weekdayOf("2026-08-31")).toBe(1); // Monday
    expect(formatDayKey("2026-08-31", { weekday: "long" })).toBe("Monday");
  });
});
