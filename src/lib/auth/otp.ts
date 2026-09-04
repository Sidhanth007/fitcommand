import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { OtpPurpose } from "@/generated/prisma/enums";

export const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 5;

function hashCode(code: string, userId: string) {
  return createHmac("sha256", env.sessionSecret).update(`${userId}:${code}`).digest("hex");
}

export type OtpIssueResult =
  | { ok: true; code: string; expiresAt: Date }
  | { ok: false; error: string; retryAfterSeconds?: number };

/**
 * Issue a fresh OTP for a user + purpose. Applies a resend cooldown and an hourly cap,
 * and invalidates any previous unconsumed code for the same purpose.
 */
export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<OtpIssueResult> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const recent = await db.otpCode.findMany({
    where: { userId, purpose, createdAt: { gte: hourAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }
  const last = recent[0]?.createdAt.getTime();
  if (last && now - last < RESEND_COOLDOWN_SECONDS * 1000) {
    const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (now - last)) / 1000);
    return { ok: false, error: `Please wait ${retryAfterSeconds}s before requesting another code.`, retryAfterSeconds };
  }

  const code = randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);

  await db.$transaction([
    db.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    db.otpCode.create({
      data: { userId, purpose, codeHash: hashCode(code, userId), expiresAt },
    }),
  ]);

  return { ok: true, code, expiresAt };
}

export type OtpVerifyResult = { ok: true } | { ok: false; error: string };

/** Verify a code; increments attempts and consumes the code on success. */
export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<OtpVerifyResult> {
  const record = await db.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "No active code. Please request a new one." };
  if (record.expiresAt < new Date()) return { ok: false, error: "This code has expired. Please request a new one." };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(code.trim(), userId), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - record.attempts - 1;
    return { ok: false, error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Please request a new code." };
  }

  await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
