import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter.
 * Suitable for a demo / single-instance server. On serverless platforms each
 * instance keeps its own counters, so treat this as best-effort protection;
 * OTP issuance is additionally throttled in the database (see auth/otp.ts).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.ceil((hits[0]! + windowMs - now) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup to keep the map small.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= windowStart)) buckets.delete(k);
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}
