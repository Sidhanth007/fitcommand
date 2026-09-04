/**
 * Day-key helpers. A "day key" is YYYY-MM-DD in the app's display timezone
 * (APP_TIMEZONE, default Asia/Kolkata) so that "today" matches what the user sees,
 * regardless of where the server runs (Vercel = UTC).
 */
export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function toDayKey(d: Date = new Date()): string {
  return keyFmt.format(d); // en-CA yields YYYY-MM-DD
}

export function isValidDayKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

/** Offset (ms) of APP_TZ from UTC at a given instant. */
function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** [start, end) instants for a day key in APP_TZ. */
export function dayRange(key: string): { start: Date; end: Date } {
  const naive = new Date(`${key}T00:00:00Z`);
  const offset = tzOffsetMs(naive);
  const start = new Date(naive.getTime() - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** A stable instant to store for "this day" (local noon). */
export function dayAnchor(key: string): Date {
  const { start } = dayRange(key);
  return new Date(start.getTime() + 12 * 60 * 60 * 1000);
}

export function shiftDayKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday) for a day key. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

export function formatDayKey(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${key}T12:00:00Z`));
}

/** Today plus the previous `days` days as labelled options (for backfill pickers). */
export function recentDayOptions(days = 14, todayKey = toDayKey()): { dayKey: string; label: string }[] {
  return Array.from({ length: days + 1 }, (_, i) => {
    const dayKey = shiftDayKey(todayKey, -i);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : formatDayKey(dayKey, { weekday: "short", day: "numeric", month: "short" });
    return { dayKey, label };
  });
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}
